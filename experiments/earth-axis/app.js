let globe;
let isRotationActive = true;
let isAtmosphereActive = true;
let countriesData = [];
let currentTheme = localStorage.getItem('jb-theme-preference') || 'light';

const factBox = document.getElementById('fact-box');
const coordIndicator = document.getElementById('coord-indicator');
const countryIntel = document.getElementById('country-intel');
const countryData = document.getElementById('country-data');
const searchInput = document.getElementById('country-search');
const searchResults = document.getElementById('search-results');
const themeIcon = document.getElementById('theme-toggle-icon');

// Metric Elements
const metricDistN = document.getElementById('metric-dist-n');
const metricSpeed = document.getElementById('metric-speed');

const POLES_DATA = [
  { 
    lat: 90, lng: 0, 
    name: 'Geographic North Pole', 
    type: 'geo', color: '#3b82f6', 
    desc: 'The northernmost point on Earth, where the imaginary spin axis passes through the surface. It is a fixed point in the middle of the Arctic Ocean.' 
  },
  { 
    lat: -90, lng: 0, 
    name: 'Geographic South Pole', 
    type: 'geo', color: '#3b82f6', 
    desc: 'The southernmost point on Earth, where the spin axis intersects the surface on the continent of Antarctica. It is located at an altitude of 2,835 meters.' 
  },
  { 
    lat: 82.7, lng: -114.4, 
    name: 'North Magnetic Pole (NMP)', 
    type: 'mag', color: '#ec4899', 
    desc: 'The point where magnetic field lines are vertical. In 2005, it was ~810km (503 miles) from the geographic pole.' 
  },
  { 
    lat: -64.4, lng: 137.3, 
    name: 'South Magnetic Pole (SMP)', 
    type: 'mag', color: '#ec4899', 
    desc: 'Located off the coast of Antarctica. In 2005, it was ~2,826km (1,756 miles) from the geographic pole.' 
  },
  { 
    lat: 11.1271, lng: 78.6569, 
    name: 'Tamil Nadu, India', 
    type: 'focus', color: '#10b981', 
    desc: 'Primary observation zone for this laboratory simulation. Baseline coordinates for local planetary diagnostics.' 
  }
];

function initGlobe() {
  const container = document.getElementById('globe-viz');
  
  globe = Globe()
    (container)
    .globeImageUrl(currentTheme === 'dark' 
       ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg' 
       : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    
    // Optimized Polygon Rendering
    .polygonCapColor(() => 'rgba(59, 130, 246, 0.1)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => 'rgba(255, 255, 255, 0.1)')
    .polygonLabel(({ properties: d }) => `
      <div style="background: rgba(0,0,0,0.85); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-family: sans-serif; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 12px rgba(0,0,0,0.5)">
        <div style="font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase">${d.ADMIN || d.NAME || d.name}</div>
        <div style="font-size: 8px; opacity: 0.6; margin-top: 2px">Region Intelligence Node</div>
      </div>
    `)
    .onPolygonClick(d => {
      const props = d.properties;
      const lat = props.LABEL_Y || (d.bbox ? (d.bbox[1] + d.bbox[3]) / 2 : 0);
      const lng = props.LABEL_X || (d.bbox ? (d.bbox[0] + d.bbox[2]) / 2 : 0);
      globe.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
      showCountryIntel(props);
    })

    // Poles
    .pointsData(POLES_DATA)
    .pointColor('color')
    .pointAltitude(0.02)
    .pointRadius(1.2)
    .labelsData(POLES_DATA)
    .labelLat(d => d.lat)
    .labelLng(d => d.lng)
    .labelText(d => d.name)
    .labelSize(1.5)
    .labelDotRadius(0.5)
    .labelColor(d => d.color)
    .onPointClick(d => {
       factBox.innerHTML = `<strong>${d.name}</strong><br><br>${d.desc}`;
       globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
    });

  globe.showAtmosphere(isAtmosphereActive);
  updateThemeUI();

  // Load Optimized GeoJSON
  fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
    .then(res => res.json())
    .then(countries => {
      countriesData = countries.features;
      globe.polygonsData(countriesData);
    })
    .catch(err => console.error('GeoJSON Load Error:', err));

  const controls = globe.controls();
  controls.autoRotate = isRotationActive;
  controls.autoRotateSpeed = 0.5;
  controls.enableDamping = true;

  // Real-time Metrics Engine
  const updateMetrics = () => {
    const pov = globe.pointOfView();
    coordIndicator.innerText = `LAT: ${pov.lat.toFixed(1)} LNG: ${pov.lng.toFixed(1)} ALT: ${pov.altitude.toFixed(1)}`;
    
    // 1. Calculate Distance to North Pole (Great Circle Approximation)
    const R = 6371; // km
    const φ1 = pov.lat * Math.PI / 180;
    const φ2 = 90 * Math.PI / 180;
    const Δλ = (0 - pov.lng) * Math.PI / 180;
    
    const dist = Math.acos(Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ)) * R;
    metricDistN.innerText = `${Math.abs(Math.round(dist)).toLocaleString()} km`;

    // 2. Calculate Surface Speed
    const eqSpeed = 1670; // km/h
    const speed = eqSpeed * Math.cos(pov.lat * Math.PI / 180);
    metricSpeed.innerText = `${Math.round(speed)} km/h`;
  };

  controls.addEventListener('change', () => {
    // Throttle for performance
    if (!this._timer) {
        this._timer = setTimeout(() => {
            updateMetrics();
            this._timer = null;
        }, 100);
    }
  });

  // Initial Update
  setTimeout(() => {
    globe.pointOfView({ lat: 11.12, lng: 78.65, altitude: 2 }, 2000);
    updateMetrics();
  }, 1000);

  window.addEventListener('resize', () => globe.width(container.clientWidth).height(container.clientHeight));
}

function showCountryIntel(props) {
  countryIntel.classList.remove('hidden');
  const name = props.ADMIN || props.NAME || props.name;
  const iso = props.ISO_A3 || props.ADM0_A3 || 'N/A';
  countryData.innerHTML = `
    <div class="flex justify-between items-center border-b border-vpBorder pb-2">
      <span class="text-[10px] font-black text-vpTextMuted uppercase"><i class="fa-solid fa-earth-asia mr-1"></i> Territory</span>
      <span class="text-xs font-bold text-vpText text-right">${name}</span>
    </div>
    <div class="flex justify-between items-center border-b border-vpBorder pb-2">
      <span class="text-[10px] font-black text-vpTextMuted uppercase"><i class="fa-solid fa-fingerprint mr-1"></i> ISO ID</span>
      <span class="text-xs font-bold text-vpText">${iso}</span>
    </div>
  `;
}

// Global scope for search clicks
window.focusCountry = function(iso) {
  const country = countriesData.find(c => (c.properties.ISO_A3 || c.properties.ADM0_A3 || c.properties.iso_a3) === iso);
  if (country) {
    const props = country.properties;
    const lat = props.LABEL_Y || (country.bbox ? (country.bbox[1] + country.bbox[3]) / 2 : 0);
    const lng = props.LABEL_X || (country.bbox ? (country.bbox[0] + country.bbox[2]) / 2 : 0);
    globe.pointOfView({ lat, lng, altitude: 1.5 }, 1500);
    showCountryIntel(props);
    searchResults.classList.add('hidden');
    searchInput.value = props.ADMIN || props.NAME;
  }
};

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }
  
  const filtered = countriesData.filter(c => {
    const props = c.properties;
    const name = (props.ADMIN || props.NAME || props.name || "").toLowerCase();
    const iso = (props.ISO_A3 || props.ADM0_A3 || "").toLowerCase();
    return name.includes(query) || iso.includes(query);
  }).slice(0, 8);
  
  if (filtered.length > 0) {
    searchResults.innerHTML = filtered.map(c => {
      const p = c.properties;
      const iso = p.ISO_A3 || p.ADM0_A3 || p.iso_a3;
      const name = p.ADMIN || p.NAME || p.name;
      return `
        <div class="px-4 py-2 hover:bg-brandPrimary/20 cursor-pointer text-[10px] font-bold text-vpText border-b border-vpBorder last:border-0" 
             onclick="focusCountry('${iso}')">
          ${name} (${iso})
        </div>
      `;
    }).join('');
    searchResults.classList.remove('hidden');
  } else {
    searchResults.classList.add('hidden');
  }
});

document.getElementById('rotation-toggle').addEventListener('click', function() {
  isRotationActive = !isRotationActive;
  if (globe) globe.controls().autoRotate = isRotationActive;
  this.innerHTML = `<i class="fa-solid fa-rotate mr-2"></i> Auto-Rotate: ${isRotationActive ? 'ON' : 'OFF'}`;
});

document.getElementById('atmosphere-toggle').addEventListener('click', function() {
  isAtmosphereActive = !isAtmosphereActive;
  if (globe) globe.showAtmosphere(isAtmosphereActive);
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('jb-portfolio-theme', currentTheme);
  updateThemeUI();
  
  if (globe) {
    globe.globeImageUrl(currentTheme === 'dark' 
      ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg' 
      : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
  }
});

function updateThemeUI() {
  const isDark = currentTheme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  if (themeIcon) {
    themeIcon.className = isDark ? 'fa-solid fa-moon text-indigo-400' : 'fa-solid fa-sun text-amber-500';
  }
}

// Initial theme application
(function initTheme() {
  currentTheme = localStorage.getItem('jb-portfolio-theme') || 'light';
  updateThemeUI();
})();

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.add('hidden');
  }
});

initGlobe();
