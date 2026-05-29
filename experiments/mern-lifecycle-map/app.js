document.addEventListener("DOMContentLoaded", () => {
    // --- Architect Scenarios ---
    const SCENARIOS = {
        registration: {
            code: `// [CLIENT] User Input -> Dispatch
const onRegister = (user) => {
  api.post('/auth/register', user);
};

// [SERVER] Express Middleware
router.post('/register', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});`,
            stages: [
                { id: 'browser', label: 'React Client', type: 'browser', x: 120, y: 150 },
                { id: 'network', label: 'TLS Handshake', type: 'network', x: 380, y: 150 },
                { id: 'server', label: 'Node Express', type: 'server', x: 650, y: 150 },
                { id: 'database', label: 'MongoDB Store', type: 'database', x: 650, y: 400 }
            ],
            steps: [
                { node: 'browser', action: 'type', text: 'me@jothibasu.io', target: 'input-1' },
                { node: 'browser', action: 'type', text: '••••••••••••', target: 'input-2' },
                { node: 'browser', action: 'click', target: 'btn-submit' },
                { node: 'network', action: 'transit', from: 'browser', to: 'network', direction: 'forward' },
                { node: 'network', action: 'transit', from: 'network', to: 'server', direction: 'forward' },
                { node: 'server', action: 'receive', log: 'POST /auth/register - Processing' },
                { node: 'database', action: 'transit', from: 'server', to: 'database', direction: 'forward' },
                { node: 'database', action: 'persist', collection: 'users' },
                { node: 'network', action: 'transit', from: 'server', to: 'network', direction: 'backward' },
                { node: 'network', action: 'transit', from: 'network', to: 'browser', direction: 'backward' },
                { node: 'browser', action: 'update', text: 'Account Created!' }
            ]
        }
    };

    const INSIGHTS = {
        type: "The Virtual DOM captures synthetic events. Data is serialized into a plain JavaScript object, triggering a component re-render as state transitions from 'idle' to 'dirty'.",
        click: "Event delegation is processed. The Axios instance constructs an XHR request, encapsulating the payload and injecting necessary headers for the outbound handshake.",
        transit_forward: "Packet Encapsulation: The payload is wrapped in TLS 1.3 encryption. Data travels through the HTTPS tunnel, ensuring end-to-end integrity across the public network.",
        transit_backward: "Response Stream: The server has finalized the transaction. A JSON-serialized response packet is returning via the network stack to the client entry point.",
        receive: "The request enters the Node.js event loop. Express routing middleware parses the stream, validates the content-type, and identifies the target controller function.",
        persist: "I/O Commitment: MongoDB's WiredTiger engine performs a B-Tree index update. The document is persisted to disk with ACID-compliant write-concern guarantees.",
        update: "UI Reconciliation: The async promise resolves. React performs a 'diffing' algorithm on the Virtual DOM, efficiently updating only the success state components in the browser."
    };

    // --- SVG Drawing Helpers ---
    const SYMBOLS = {
        browser: (g) => {
            g.append("rect").attr("width", 160).attr("height", 110).attr("rx", 8).attr("fill", "var(--node-bg)").attr("stroke", "var(--border)").attr("stroke-width", 2);
            g.append("rect").attr("width", 160).attr("height", 18).attr("rx", 8).attr("fill", "var(--border)");
            [10, 22, 34].forEach((x, i) => g.append("circle").attr("cx", x).attr("cy", 9).attr("r", 3).attr("fill", ["#ff5f56", "#ffbd2e", "#27c93f"][i]));
            g.append("rect").attr("id", "input-1").attr("x", 15).attr("y", 30).attr("width", 130).attr("height", 15).attr("class", "browser-input").attr("rx", 4);
            g.append("rect").attr("id", "input-2").attr("x", 15).attr("y", 52).attr("width", 130).attr("height", 15).attr("class", "browser-input").attr("rx", 4);
            g.append("rect").attr("id", "btn-submit").attr("x", 40).attr("y", 80).attr("width", 80).attr("height", 18).attr("fill", "var(--accent)").attr("rx", 6);
            g.append("text").attr("x", 80).attr("y", 92).attr("text-anchor", "middle").attr("fill", "white").attr("font-size", "8px").attr("font-weight", "900").text("SUBMIT");
            g.append("text").attr("id", "type-val-1").attr("x", 22).attr("y", 40).attr("font-size", "9px").attr("fill", "var(--text-muted)").text("");
            g.append("text").attr("id", "type-val-2").attr("x", 22).attr("y", 62).attr("font-size", "9px").attr("fill", "var(--text-muted)").text("");
        },
        network: (g) => {
            g.append("rect").attr("width", 120).attr("height", 50).attr("rx", 25).attr("fill", "none").attr("stroke", "var(--border)").attr("stroke-width", 2).attr("stroke-dasharray", "8 4");
            g.append("text").attr("x", 60).attr("y", 30).attr("text-anchor", "middle").attr("fill", "var(--text-muted)").attr("font-size", "8px").attr("font-weight", "800").attr("letter-spacing", "1px").text("HTTPS GATEWAY");
        },
        server: (g) => {
            g.append("rect").attr("width", 100).attr("height", 140).attr("rx", 10).attr("fill", "var(--node-bg)").attr("stroke", "#10b981").attr("stroke-width", 2);
            for (let i = 0; i < 3; i++) {
                g.append("rect").attr("x", 12).attr("y", 15 + i * 42).attr("width", 76).attr("height", 30).attr("rx", 6).attr("fill", "var(--border)").attr("opacity", 0.4);
                g.append("circle").attr("cx", 80).attr("cy", 30 + i * 42).attr("r", 3).attr("fill", "#10b981").append("animate").attr("attributeName", "opacity").attr("values", "1;0.3;1").attr("dur", "1.5s").attr("repeatCount", "indefinite");
            }
        },
        database: (g) => {
            const db = g.append("g").attr("id", "db-vis");
            db.append("path").attr("d", "M 0 20 C 0 0, 100 0, 100 20 L 100 80 C 100 100, 0 100, 0 80 Z").attr("fill", "var(--node-bg)").attr("stroke", "#f59e0b").attr("stroke-width", 2);
            db.append("ellipse").attr("cx", 50).attr("cy", 20).attr("rx", 50).attr("ry", 15).attr("fill", "var(--node-bg)").attr("stroke", "#f59e0b").attr("stroke-width", 2);
            for (let i = 0; i < 3; i++) {
                db.append("rect").attr("id", `record-${i}`).attr("x", 20).attr("y", 45 + i * 18).attr("width", 60).attr("height", 10).attr("rx", 3).attr("fill", "#f59e0b").attr("opacity", 0.1);
            }
        }
    };

    // --- Core Logic ---
    const svg = d3.select("#main-svg");
    const g = svg.append("g");
    const container = document.getElementById("viz-container");

    let isRunning = false;
    let currentScenario = 'registration';

    function addLog(msg, type = 'info') {
        const terminal = document.getElementById('log-terminal');
        const entry = document.createElement('div');
        entry.className = `terminal-line mb-1 ${type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-rose-400' : 'text-slate-400'}`;
        entry.textContent = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`;
        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;
    }

    function updateInsight(nodeLabel, action) {
        const title = document.getElementById('insight-title');
        const body = document.getElementById('insight-body');
        const label = document.getElementById('insight-label');
        
        label.textContent = nodeLabel;
        title.textContent = `${action.toUpperCase()} Event`;
        body.textContent = INSIGHTS[action] || "System synchronizing...";
    }

    function renderMap(key) {
        const scene = SCENARIOS[key];
        g.selectAll("*").remove();
        document.getElementById('code-block').textContent = scene.code;

        scene.stages.forEach(s => {
            const nodeG = g.append("g").attr("id", `node-${s.id}`).attr("transform", `translate(${s.x},${s.y})`);
            SYMBOLS[s.type](nodeG);
            nodeG.append("text").attr("x", s.type === 'network' ? 60 : s.type === 'server' ? 50 : s.type === 'database' ? 50 : 80).attr("y", s.type === 'database' ? 120 : s.type === 'server' ? 160 : 130).attr("text-anchor", "middle").attr("class", "text-[10px] font-black fill-slate-400 dark:fill-slate-600 uppercase tracking-tighter").text(s.label);
        });

        const w = container.clientWidth, h = container.clientHeight;
        svg.transition().duration(800).call(d3.zoom().transform, d3.zoomIdentity.translate(w/6, h/8).scale(0.9));
    }

    async function runSimulation() {
        if (isRunning) return;
        isRunning = true;
        document.getElementById('status-badge').className = "text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded border border-indigo-500/20 uppercase";
        document.getElementById('status-badge').textContent = "Running";
        
        const scene = SCENARIOS[currentScenario];
        addLog(`Initializing ${currentScenario} pipeline...`, 'success');

        for (const step of scene.steps) {
            const stage = scene.stages.find(s => s.id === (step.node || step.from));
            updateInsight(stage.label, step.action === 'transit' ? `transit_${step.direction}` : step.action);

            if (step.action === 'type') {
                addLog(`[BROWSER] User Typing into ${step.target}...`);
                const valEl = g.select(step.target === 'input-1' ? '#type-val-1' : '#type-val-2');
                for (let i = 0; i <= step.text.length; i++) {
                    valEl.text(step.text.substring(0, i) + (i < step.text.length ? ' |' : ''));
                    await new Promise(r => setTimeout(r, 60));
                }
            }

            if (step.action === 'click') {
                addLog(`[BROWSER] Form submission triggered.`);
                await g.select('#btn-submit').transition().duration(150).attr("transform", "scale(0.9)").transition().duration(150).attr("transform", "scale(1)").end();
                await new Promise(r => setTimeout(r, 400));
            }

            if (step.action === 'transit') {
                const s = scene.stages.find(n => n.id === step.from);
                const t = scene.stages.find(n => n.id === step.to);
                const isForward = step.direction === 'forward';
                const isVertical = s.x === t.x;
                
                addLog(`[NETWORK] ${isForward ? 'REQUEST' : 'RESPONSE'} Data Flowing...`);

                // Create Path
                const pathG = g.append("g").attr("class", "flow-layer");
                
                let startX, startY, endX, endY;

                if (isVertical) {
                    // Vertical connection (Server to DB)
                    startX = s.x + 50;
                    startY = s.y + 140;
                    endX = t.x + 50;
                    endY = t.y;
                } else {
                    // Horizontal connections
                    startX = s.x + (isForward ? (s.type === 'browser' ? 160 : 120) : 0);
                    startY = s.y + 25;
                    endX = t.x + (isForward ? 0 : (t.type === 'browser' ? 160 : 120));
                    endY = t.y + 25;
                }

                const pathStr = `M ${startX} ${startY} L ${endX} ${endY}`;
                
                const flowPath = pathG.append("path")
                    .attr("d", pathStr)
                    .attr("fill", "none")
                    .attr("stroke", isForward ? "var(--accent)" : "#10b981")
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "1000")
                    .attr("stroke-dashoffset", "1000");

                const marker = pathG.append("path")
                    .attr("d", isForward ? (isVertical ? "M -5 -5 L 0 5 L 5 -5 Z" : "M -5 -5 L 5 0 L -5 5 Z") : "M 5 -5 L -5 0 L 5 5 Z")
                    .attr("fill", isForward ? "var(--accent)" : "#10b981")
                    .attr("opacity", 0);

                // Animate Path and Marker
                await flowPath.transition()
                    .duration(800)
                    .attr("stroke-dashoffset", 0)
                    .end();

                marker.attr("opacity", 1);

                // Packet Animation
                const pkt = pathG.append("g").attr("class", "packet");
                pkt.append("rect").attr("width", 20).attr("height", 14).attr("rx", 3).attr("fill", isForward ? "var(--accent-secondary)" : "#10b981").style("filter", "url(#glow)");
                pkt.append("path").attr("d", "M 2 3 L 10 9 L 18 3").attr("fill", "none").attr("stroke", "white").attr("stroke-width", 1);
                
                const pathNode = flowPath.node();
                const length = pathNode.getTotalLength();

                await pkt.transition()
                    .duration(1000)
                    .ease(d3.easeLinear)
                    .attrTween("transform", () => t => {
                        const p = pathNode.getPointAtLength(t * length);
                        return `translate(${p.x - 10},${p.y - 7})`;
                    })
                    .tween("marker", () => t => {
                        const p = pathNode.getPointAtLength(t * length);
                        marker.attr("transform", `translate(${p.x},${p.y})`);
                    })
                    .end();

                pkt.remove();
                await new Promise(r => setTimeout(r, 200));
                pathG.transition().duration(400).attr("opacity", 0).remove();
            }

            if (step.action === 'receive') {
                addLog(`[SERVER] ${step.log}`, 'success');
                const srv = g.select('#node-server');
                srv.append("text").attr("class", "server-log").attr("x", 10).attr("y", 160).text(step.log).transition().duration(1500).attr("y", 100).attr("opacity", 0).remove();
                await new Promise(r => setTimeout(r, 800));
            }

            if (step.action === 'persist') {
                addLog(`[DB] COMMITTING TO ${step.collection.toUpperCase()}...`);
                await g.select('#db-vis').transition().duration(200).attr("transform", "scale(1.1)").transition().duration(200).attr("transform", "scale(1)").end();
                g.select('#record-0').transition().duration(500).attr("opacity", 0.9).attr("fill", "var(--accent-secondary)");
                await new Promise(r => setTimeout(r, 1000));
            }

            if (step.action === 'query') {
                addLog(`[DB] EXECUTING INDEX SEEK...`);
                g.selectAll('[id^="record-"]').transition().duration(300).attr("opacity", 0.5);
                await new Promise(r => setTimeout(r, 600));
                g.selectAll('[id^="record-"]').transition().duration(300).attr("opacity", 0.1);
            }

            if (step.action === 'update' || step.action === 'render') {
                addLog(`[BROWSER] ${step.text}`, 'success');
                const brw = g.select('#node-browser');
                brw.append("rect").attr("x", 5).attr("y", 25).attr("width", 150).attr("height", 80).attr("fill", "var(--node-bg)").attr("rx", 6).attr("opacity", 0).transition().duration(400).attr("opacity", 1);
                brw.append("text").attr("x", 80).attr("y", 70).attr("text-anchor", "middle").attr("fill", "#10b981").attr("font-weight", "900").attr("font-size", "12px").text(step.text).attr("opacity", 0).transition().delay(300).duration(500).attr("opacity", 1);
            }
        }

        document.getElementById('status-badge').className = "text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 uppercase";
        document.getElementById('status-badge').textContent = "Complete";
        isRunning = false;
        addLog("Full-Stack Lifecycle Simulation Finished.", "success");
    }

    // --- Interaction ---
    document.getElementById('play-trigger').addEventListener('click', runSimulation);
    document.getElementById('preset-select').addEventListener('change', (e) => {
        currentScenario = e.target.value;
        renderMap(currentScenario);
        document.getElementById('log-terminal').innerHTML = '<div class="opacity-40">> CPU Thread Pool Initialized</div><div class="opacity-40">> MERN Sandbox Listening...</div>';
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('jb-portfolio-theme', isDark ? 'dark' : 'light');
        document.getElementById('theme-icon').className = isDark ? 'fa-solid fa-moon text-indigo-400' : 'fa-solid fa-sun text-amber-500';
        renderMap(currentScenario);
    });

    // Initial Load
    renderMap(currentScenario);
});