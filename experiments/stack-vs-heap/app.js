require.config({ 
  paths: { 
    vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs',
    d3: 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min'
  } 
});

let editor;
let currentDecorations = [];
let timeline = [];
let currentStep = 0;

const PRESETS = {
  primitives: `// 1. Primitive Copying\nlet a = 5;\nlet b = a;\na = 10;\n// a is 10, b is still 5 (copied by value)`,
  
  references: `// 2. Reference Copying (Arrays)\nlet x = [1, 2, 3];\nlet y = x;\nx.push(4);\n// Both x and y see the change (copied by reference)`,
  
  sharing: `// 3. Object Sharing & Mutation\nlet person = { name: "Bob", age: 30 };\nlet job = { person: person, title: "Dev" };\n\nperson.age = 31;\n// job.person.age also becomes 31`,
  
  equality: `// 4. Pointer Equality vs Value\nlet obj1 = { val: 100 };\nlet obj2 = { val: 100 };\nlet obj3 = obj1;\n\n// obj1 === obj2 is false (different addresses)\n// obj1 === obj3 is true (same address)`,
  
  arrays: `// 5. Array-Object Tree Mapping\nlet users = [\n  { id: 1 },\n  { id: 2 }\n];\n\nlet first = users[0];\n// 'users' references an array, which references two objects.`,
  
  gc: `// 6. Garbage Collection Lifecycle\nlet buffer = { data: "temp" };\nlet ptr = buffer;\n\nbuffer = null;\n// The object survives via 'ptr'.\nptr = null;\n// Zero references remain. GC will reclaim memory.`,

  circular: `// 7. Circular References\nlet nodeA = { name: "A" };\nlet nodeB = { name: "B" };\n\nnodeA.friend = nodeB;\nnodeB.friend = nodeA;\n// Complex memory graph with interconnecting pointers.`,

  deepNested: `// 8. Deep Nested Objects\nlet config = { \n  meta: { \n    version: 1.0, \n    tags: ["prod"] \n  } \n};\n\nlet tags = config.meta.tags;\n// Visualization of deep heap nesting and leaf pointers.`,

  memoryLeak: `// 9. Memory 'Leak' (Unreachable sub-items)\nlet root = { data: { secret: "123" } };\nlet dataPtr = root.data;\n\nroot = null;\n// 'root' is gone, but the inner 'data' object is kept alive by dataPtr.`
};

const PRESET_OPTIONS = [
  { key: 'primitives', label: '📦 1. Primitive Copying' },
  { key: 'references', label: '🔗 2. Array References' },
  { key: 'sharing', label: '🤝 3. Object Sharing' },
  { key: 'equality', label: '⚖️ 4. Pointer Equality' },
  { key: 'arrays', label: '📊 5. Array-Object Trees' },
  { key: 'gc', label: '♻️ 6. Garbage Collection' },
  { key: 'circular', label: '♾️ 7. Circular Memory' },
  { key: 'deepNested', label: '🕸️ 8. Deep Nesting' },
  { key: 'memoryLeak', label: '💧 9. Intentional Leak' }
];

require(['vs/editor/editor.main', 'd3'], function (_, d3Instance) {
  window.d3 = d3Instance;
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: PRESETS.primitives,
    language: 'javascript',
    theme: 'vs',
    automaticLayout: true,
    fontSize: 12,
    lineHeight: 18,
    minimap: { enabled: false },
    wordWrap: "on"
  });
  
  const select = document.getElementById('preset-select');
  PRESET_OPTIONS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.innerText = p.label;
    select.appendChild(opt);
  });
  
  select.addEventListener('change', (e) => {
    editor.setValue(PRESETS[e.target.value]);
    resetVisualizer();
  });
  
  initD3();
  resetVisualizer();
});

document.getElementById('theme-select').addEventListener('change', (e) => {
  const isDark = e.target.value === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('light', !isDark);
  monaco.editor.setTheme(isDark ? 'vs-dark' : 'vs');
  if (timeline.length > 0) renderStep(currentStep);
});

document.getElementById('visualize-trigger-btn').addEventListener('click', runSimulation);

function resetVisualizer() {
  currentStep = 0;
  timeline = [];
  renderStep(0);
}

// Memory Simulator Engine (Pro Instrumentation Approach)
function runSimulation() {
  const source = editor.getValue();
  const splitLines = source.split('\n');
  timeline = [];
  currentStep = 0;

  try {
    let traceHistory = [];
    const variableTokens = Array.from(new Set(Array.from(source.matchAll(/(?:let|const|var)\s+([a-zA-Z0-9_$]+)/g), m => m[1])));

    // Physical identity manager
    const objectMap = new Map();
    let addrCounter = 0;

    const __trace = (lineNum, vars, snippet) => {
      const currentStack = [];
      const currentHeap = {};
      const visitedInStep = new Map();

      // Deep Cloner that handles Circular References and preserves Identity
      const mapObject = (obj) => {
        if (!objectMap.has(obj)) {
          addrCounter++;
          objectMap.set(obj, `Addr#${addrCounter}`);
        }
        const id = objectMap.get(obj);
        
        if (visitedInStep.has(id)) return id;
        
        const data = Array.isArray(obj) ? [] : {};
        visitedInStep.set(id, data);
        currentHeap[id] = { data, isGarbage: false };

        Object.keys(obj).forEach(k => {
          const val = obj[k];
          if (typeof val === 'object' && val !== null) {
            data[k] = mapObject(val);
          } else {
            data[k] = val;
          }
        });
        return id;
      };

      Object.keys(vars).forEach(name => {
        const val = vars[name];
        if (typeof val === 'object' && val !== null) {
          currentStack.push({ name, value: mapObject(val), isRef: true });
        } else {
          currentStack.push({ name, value: val, isRef: false });
        }
      });

      // Reachability Check for GC
      const reachable = new Set();
      const walk = (id) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        if (currentHeap[id]) {
          Object.values(currentHeap[id].data).forEach(v => {
            if (typeof v === 'string' && v.startsWith('Addr#')) walk(v);
          });
        }
      };
      currentStack.filter(s => s.isRef).forEach(s => walk(s.value));

      Object.keys(currentHeap).forEach(id => {
        currentHeap[id].isGarbage = !reachable.has(id);
      });

      traceHistory.push({
        line: lineNum,
        snippet: snippet,
        explanation: `Processing: ${snippet}`,
        stack: currentStack,
        heap: currentHeap // No more JSON.stringify crash
      });
    };

    let instrumentedCode = "";
    const generateSnapshotExpr = () => {
      return `(function(){
        let __state = {};
        ["${variableTokens.join('","')}"].forEach(function(t) {
          try { let val = eval(t); if (typeof val !== 'undefined') __state[t] = val; } catch(e){}
        });
        return __state;
      })()`;
    };

    let buffer = "";
    let openBrackets = 0;

    splitLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) {
         instrumentedCode += line + "\n";
         return;
      }
      
      buffer += line + "\n";
      openBrackets += (line.match(/[\[\{\(]/g) || []).length;
      openBrackets -= (line.match(/[\]\}\)]/g) || []).length;

      // Only trace when code is at a stable state (balanced brackets)
      if (openBrackets <= 0) {
        instrumentedCode += `${buffer}__trace(${index + 1}, ${generateSnapshotExpr()}, ${JSON.stringify(buffer.trim())});\n`;
        buffer = "";
        openBrackets = 0; // Reset for safety
      }
    });

    const runSandbox = new Function('__trace', instrumentedCode);
    runSandbox(__trace);

    timeline = traceHistory;
    if (timeline.length > 0) renderStep(0);

  } catch (err) {
    console.error("Engine Error", err);
    document.getElementById('explanation-text').innerHTML = `<span class="text-red-500 font-bold">❌ Engine Error: ${err.message}.</span><br><div class="text-[10px] mt-2 opacity-50 font-mono">${err.stack.split('\n')[0]}</div>`;
  }
}

let svg, simulationForce;
function initD3() {
  svg = d3.select("#arena-svg");
  const container = document.getElementById('arena-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  svg.attr("viewBox", [0, 0, width, height]);
  svg.selectAll("*").remove();

  const defs = svg.append("defs");
  
  const pattern = defs.append("pattern")
    .attr("id", "grid")
    .attr("width", 25).attr("height", 25)
    .attr("patternUnits", "userSpaceOnUse");
  
  pattern.append("path")
    .attr("d", "M 25 0 L 0 0 0 25")
    .attr("fill", "none")
    .attr("stroke", "var(--arena-grid)")
    .attr("stroke-width", 1);

  svg.append("rect").attr("width", width).attr("height", height).attr("fill", "url(#grid)");

  svg.append("line")
    .attr("x1", width * 0.3)
    .attr("y1", 0).attr("x2", width * 0.3).attr("y2", height)
    .attr("stroke", "var(--arena-segment)")
    .attr("stroke-dasharray", "5 5");

  defs.append("marker")
    .attr("id", "ref-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 12).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#818cf8");

  simulationForce = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width * 0.65, height / 2))
    .force("collision", d3.forceCollide().radius(60));
}

function renderStep(index) {
  if (timeline.length === 0) {
     initD3();
     document.getElementById('step-counter').innerText = 'Step: 0 / 0';
     return;
  }
  
  currentStep = index;
  const step = timeline[index];
  
  document.getElementById('step-counter').innerText = `Step: ${index + 1} / ${timeline.length}`;
  document.getElementById('explanation-text').innerText = step.explanation;
  const heapSize = Object.keys(step.heap).length * 8; 
  document.getElementById('ram-usage').innerText = `Heap Allocation: ~${heapSize}KB`;

  currentDecorations = editor.deltaDecorations(currentDecorations, [
    { range: new monaco.Range(step.line, 1, step.line, 1), options: { isWholeLine: true, className: 'current-line-highlight' } }
  ]);
  editor.revealLineInCenterIfOutsideViewport(step.line);

  updateVisualization(step);

  document.getElementById('prev-btn').disabled = index === 0;
  document.getElementById('next-btn').disabled = index === timeline.length - 1;
  
  const gcCount = Object.values(step.heap).filter(h => h.isGarbage).length;
  document.getElementById('gc-status').innerText = `GC: ${gcCount > 0 ? `${gcCount} Block(s) Pending` : 'Stable'}`;
  document.getElementById('gc-status').className = `text-[9px] px-2 py-0.5 rounded-full border ${gcCount > 0 ? 'border-amber-500 text-amber-500 animate-pulse' : 'border-emerald-500/30 text-emerald-500'}`;
}

function updateVisualization(step) {
  const container = document.getElementById('arena-container');
  const width = container.clientWidth;
  const height = container.clientHeight;

  const stackData = step.stack;
  const heapData = step.heap;

  const heapNodes = Object.keys(heapData).map((id, i) => ({
    id, 
    type: 'heap',
    address: `0x6${(4000 + i * 16).toString(16).toUpperCase()}`,
    data: heapData[id].data, 
    isGarbage: heapData[id].isGarbage
  }));
  
  const stackBaseX = 30;
  const stackWidth = 140;
  const stackFrameHeight = 42;
  const stackGap = 12;
  
  const stackNodes = stackData.map((s, i) => ({
    id: `stack-${s.name}`,
    type: 'stack',
    address: `0x7F${(8000 - i * 32).toString(16).toUpperCase()}`,
    name: s.name,
    value: s.value,
    isRef: s.isRef,
    x: stackBaseX + stackWidth/2,
    y: height - 50 - i * (stackFrameHeight + stackGap)
  }));

  const allNodes = [...heapNodes, ...stackNodes];
  const links = [];
  
  heapNodes.forEach(n => {
    Object.keys(n.data).forEach(k => {
      const val = n.data[k];
      if (typeof val === 'string' && heapData[val]) {
        links.push({ source: n.id, target: val, type: 'heap-to-heap', key: k });
      }
    });
  });

  stackNodes.forEach(s => {
    if (s.isRef && heapData[s.value]) {
      links.push({ source: s.id, target: s.value, type: 'stack-to-heap' });
    }
  });

  const mainG = svg.selectAll(".arena-g").data([null]).join("g").attr("class", "arena-g");

  // STACK
  const stackG = mainG.selectAll(".stack-frame-g").data(stackNodes, d => d.id)
    .join("g")
    .attr("class", "stack-frame-g animate-frame")
    .attr("transform", d => `translate(${stackBaseX}, ${d.y - stackFrameHeight/2})`);

  stackG.selectAll("rect").data(d => [d]).join("rect")
    .attr("width", stackWidth).attr("height", stackFrameHeight).attr("rx", 4)
    .attr("fill", d => d.isRef ? "rgba(236, 72, 153, 0.05)" : "rgba(99, 102, 241, 0.05)")
    .attr("stroke", d => d.isRef ? "#ec4899" : "#6366f1")
    .attr("stroke-width", 1.5);

  stackG.selectAll(".lbl-addr").data(d => [d]).join("text")
    .attr("class", "lbl-addr")
    .attr("x", 4).attr("y", -4)
    .attr("fill", "var(--vp-text-muted)")
    .style("font-size", "7px").style("font-family", "monospace")
    .text(d => d.address);

  stackG.selectAll(".lbl-name").data(d => [d]).join("text")
    .attr("class", "lbl-name")
    .attr("x", 10).attr("y", 18)
    .attr("fill", "var(--vp-text)")
    .style("font-size", "11px").style("font-weight", "900")
    .text(d => d.name);

  stackG.selectAll(".lbl-val").data(d => [d]).join("text")
    .attr("class", "lbl-val")
    .attr("x", 10).attr("y", 32)
    .attr("fill", d => d.isRef ? "#ec4899" : "#818cf8")
    .style("font-size", "10px").style("font-family", "monospace").style("font-weight", "600")
    .text(d => d.isRef ? `*${d.value.split('#')[1]}` : (typeof d.value === 'string' ? (d.value.length > 10 ? d.value.substring(0,8)+'..' : d.value) : d.value));

  // HEAP
  simulationForce.nodes(heapNodes);
  simulationForce.force("link").links(links.filter(l => l.type === 'heap-to-heap'));
  simulationForce.alpha(0.5).restart();

  const nodeG = mainG.selectAll(".heap-node-g").data(heapNodes, d => d.id)
    .join("g")
    .attr("class", "heap-node-g heap-node")
    .call(d3.drag()
      .on("start", (e, d) => { if (!e.active) simulationForce.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end", (e, d) => { if (!e.active) simulationForce.alphaTarget(0); d.fx = null; d.fy = null; }));

  nodeG.selectAll("rect").data(d => [d]).join("rect")
    .attr("width", 70).attr("height", 45)
    .attr("x", -35).attr("y", -22.5).attr("rx", 6)
    .attr("fill", "var(--vp-bg-alt)")
    .attr("stroke", d => d.isGarbage ? "#475569" : "#ec4899")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", d => d.isGarbage ? "4 4" : "none")
    .attr("class", d => d.isGarbage ? "" : "active-memory");

  nodeG.selectAll(".lbl-h-addr").data(d => [d]).join("text")
    .attr("class", "lbl-h-addr")
    .attr("y", -26).attr("text-anchor", "middle")
    .attr("fill", "var(--vp-text-muted)")
    .style("font-size", "7px").style("font-family", "monospace")
    .text(d => d.address);

  nodeG.selectAll(".lbl-h-id").data(d => [d]).join("text")
    .attr("dy", ".35em").attr("text-anchor", "middle")
    .attr("fill", "var(--vp-text)")
    .style("font-size", "10px").style("font-weight", "900")
    .text(d => d.id);

  // LINKS
  const linkLine = mainG.selectAll(".link-path").data(links, d => `${d.source.id || d.source}-${d.target.id || d.target}`)
    .join("line")
    .attr("class", "link-path reference-line")
    .attr("stroke", d => d.type === 'stack-to-heap' ? "#818cf8" : "var(--vp-border)")
    .attr("stroke-opacity", 0.8)
    .attr("stroke-width", 1.5)
    .attr("marker-end", "url(#ref-arrow)");

  simulationForce.on("tick", () => {
    nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
    linkLine
      .attr("x1", d => {
        const source = typeof d.source === 'string' ? allNodes.find(n => n.id === d.source) : d.source;
        return source.type === 'stack' ? source.x + stackWidth/2 : source.x;
      })
      .attr("y1", d => {
        const source = typeof d.source === 'string' ? allNodes.find(n => n.id === d.source) : d.source;
        return source.y;
      })
      .attr("x2", d => {
        const target = typeof d.target === 'string' ? allNodes.find(n => n.id === d.target) : d.target;
        return target.x;
      })
      .attr("y2", d => {
        const target = typeof d.target === 'string' ? allNodes.find(n => n.id === d.target) : d.target;
        return target.y;
      });
  });

  nodeG.on("mouseover", (event, d) => {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.opacity = '1';
    tooltip.innerHTML = `
      <div class="text-[7px] text-vpTextMuted font-mono mb-1">PHYSICAL_ADDR: ${d.address}</div>
      <div class="text-brandPink font-black mb-1">${d.id} [Block]</div>
      <pre class="bg-black/10 dark:bg-black/40 p-2 rounded border border-vpBorder text-[8px] text-vpText">${safeStringify(d.data)}</pre>
    `;
  }).on("mousemove", (event) => {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.left = (event.pageX + 10) + 'px'; tooltip.style.top = (event.pageY + 10) + 'px';
  }).on("mouseout", () => { document.getElementById('tooltip').style.opacity = '0'; });
}

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular Reference]";
      seen.add(value);
    }
    return value;
  }, 2);
}

document.getElementById('next-btn').addEventListener('click', () => { if (currentStep < timeline.length - 1) renderStep(++currentStep); });
document.getElementById('prev-btn').addEventListener('click', () => { if (currentStep > 0) renderStep(--currentStep); });
