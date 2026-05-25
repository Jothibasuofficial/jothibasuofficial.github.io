require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

let editor;
let currentDecorations = [];
let timeline = [];
let currentStep = 0;
let autoPlayTimer = null;
let currentLanguage = 'en';

const DICTIONARY = {
  en: {
    titleModal: "⚙️ Select Execution Strategy Mode",
    descModal: "Launch automated walkthrough simulations to map structural changes step-by-step, or load manual mode.",
    btnAuto: "🤖 Automated Walkthrough Mode",
    btnManual: "🕹️ Manual Step Inspection Mode",
    btnCancel: "Cancel",
    headerEditor: "Source Code Workspace Platform",
    headerStack: "Call Stack Execution Space",
    headerHeap: "Memory Heap Reference Space",
    headerEvLoop: "Asynchronous Concurrency Event Loop Core",
    qWebapi: "1. Background Web APIs Layer",
    qMicro: "2. Microtask Queue (High-Priority Resolution Queue)",
    qMacro: "3. Macrotask Queue (Event Callback Frame Queue)",
    barConsole: "Real-Time Terminal Output Log Stream",
    emptyStack: "Call Stack Empty — Script Entry Idling",
    emptyHeap: "No local active object allocations mapped",
    idleQ: "Pipeline Idling",
    emptyQ: "Queue Empty",
    descInit: "Select an execution snippet preset and trigger 'Visualize' to map parameters.",
    stepLabel: "Step Cluster",
    lineLabel: "Active Line",
    presets: [
      { key: "primitives", label: "📦 1. Primitive Type Lifecycles" },
      { key: "loops", label: "🔂 2. Iterators & Loop Mutations" },
      { key: "arrays", label: "📊 3. Mutable Array Buffers" },
      { key: "eventloop", label: "⏳ 4. Multi-Layer Event Loop Interleaving" }
    ]
  },
  ta: {
    titleModal: "⚙️ செயல்பாட்டு முறையைத் தேர்ந்தெடுக்கவும்",
    descModal: "நிரலின் நினைவக மாற்றங்களை தானியங்கி முறையில் பார்க்க வேண்டுமா அல்லது கைமுறையாக ஆய்வு செய்ய வேண்டுமா?",
    btnAuto: "🤖 தானியங்கி விளக்க நடைப்பயணம்",
    btnManual: "🕹️ கைமுறை குறியீடு ஆய்வு முறை",
    btnCancel: "ரத்து செய்",
    headerEditor: "ஜாவாஸ்கிரிப்ட் மூல நிரல் உள்ளீடு",
    headerStack: "கால் ஸ்டேக் (அழைப்பு அடுக்கு)",
    headerHeap: "மெமரி ஹீப் (நினைவக தரவு ஒதுக்கீடு)",
    headerEvLoop: "நிகழ்வு சுழற்சி மையம் (Event Loop Hub)",
    qWebapi: "1. பின்னணி வெப் ஏபிஐ பணிகள் (Web APIs)",
    qMicro: "2. மைக்ரோடாஸ்க் வரிசை (Promises)",
    qMacro: "3. மேக்ரோடாஸ்க் வரிசை (Callbacks)",
    barConsole: "வெளியீட்டுத் திரை (Terminal Console)",
    emptyStack: "அழைப்பு அடுக்கு காலியாக உள்ளது",
    emptyHeap: "ஹீப் நினைவகத்தில் மாறிகள் எதுவும் இல்லை",
    idleQ: "காத்திருக்கிறது",
    emptyQ: "வரிசை காலியாக உள்ளது",
    descInit: "ஏதேனும் ஒரு நிரலைத் தேர்ந்தெடுத்து 'Visualize' பொத்தானை அழுத்தவும்.",
    stepLabel: "செயல்பாட்டு படி",
    lineLabel: "தற்போதைய வரி",
    presets: [
      { key: "primitives", label: "📦 1. அடிப்படை மாறிகளின் ஒதுக்கீடு" },
      { key: "loops", label: "🔂 2. மடக்கு சுழற்சிகள் மற்றும் மாற்றங்கள்" },
      { key: "arrays", label: "📊 3. வரிசைகளின் செயல்பாடு" },
      { key: "eventloop", label: "⏳ 4. நிகழ்வு சுழற்சியின் ஒருங்கிணைப்பு" }
    ]
  }
};

const PRESETS = {
  primitives: `// 1. Primitive Allocations & Reassignments\nlet player = "Jothibasu";\nlet powerLevel = 9000;\n\npowerLevel += 500;\nconsole.log(player + " power is now " + powerLevel);`,
  
  loops: `// 2. Loop Mutations and Linear Traversal Flow\nconst tasks = ["🔮 Charge", "🛡️ Defend"];\n\nfor (let j = 0; j < tasks.length; j++) {\n  let currentAction = "Executing: " + tasks[j];\n  console.log(currentAction);\n}`,
  
  arrays: `// 3. Array Operations & Mutative Multi-layers\nconst inventory = [];\ninventory.push("🗡️ Sword");\ninventory.push("🧪 Elixir");\n\nlet currentTotal = inventory.length;\nconsole.log("Total items collected: " + currentTotal);`,
  
  eventloop: `// 4. Complete Interleaved Event Loop Execution\nconsole.log("Start synchronous flow");\n\nsetTimeout(() => {\n  console.log("Timeout callback macro task executing");\n}, 0);\n\nPromise.resolve("Data stream pipeline secure").then((res) => {\n  console.log("Promise micro task completed: " + res);\n});\n\nconsole.log("End synchronous flow");`
};

require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor-container'), {
    value: PRESETS.primitives,
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 19,
    minimap: { enabled: false },
    wordWrap: "on"
  });
  
  populateDropdownList('en');
  translateUILabels('en');
  resetVisualizerState();
});

function populateDropdownList(lang) {
  const select = document.getElementById('preset-select');
  const currentSelectionValue = select.value || "primitives"; 
  select.innerHTML = ""; 
  
  DICTIONARY[lang].presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.innerText = p.label;
    if (p.key === currentSelectionValue) opt.selected = true;
    select.appendChild(opt);
  });
}

document.getElementById('preset-select').addEventListener('change', (e) => {
  if (editor) { editor.setValue(PRESETS[e.target.value]); resetVisualizerState(); }
});

document.getElementById('lang-select').addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  populateDropdownList(currentLanguage);
  translateUILabels(currentLanguage);
  if (timeline.length > 0) renderTimelineStep(currentStep);
});

document.getElementById('theme-select').addEventListener('change', (e) => {
  const root = document.documentElement;
  if (e.target.value === 'dark') {
    root.classList.add('dark'); root.classList.remove('light');
    if (monaco.editor) monaco.editor.setTheme('vs-dark');
  } else {
    root.classList.add('light'); root.classList.remove('dark');
    if (monaco.editor) monaco.editor.setTheme('vs');
  }
});

const modal = document.getElementById('decision-modal');
document.getElementById('visualize-trigger-btn').addEventListener('click', () => {
  clearInterval(autoPlayTimer);
  document.getElementById('auto-play-indicator').classList.add('hidden');
  modal.classList.remove('opacity-0', 'pointer-events-none');
  modal.children[0].classList.remove('scale-95');
});

document.getElementById('mode-cancel-btn').addEventListener('click', dismissModal);
function dismissModal() {
  modal.classList.add('opacity-0', 'pointer-events-none');
  modal.children[0].classList.add('scale-95');
}

document.getElementById('mode-explain-btn').addEventListener('click', () => { dismissModal(); runSandboxExecutionEngine(true); });
document.getElementById('mode-manual-btn').addEventListener('click', () => { dismissModal(); runSandboxExecutionEngine(false); });

/* ADVANCED INLINE DEEP ITERATION ENGINE */
function runSandboxExecutionEngine(autoPlay) {
  const source = editor.getValue();
  timeline = [];
  currentStep = 0;

  try {
    const splitLines = source.split('\n');
    let traceHistory = [];
    let currentLogs = [];

    const sandboxConsole = {
      log: (...args) => { 
        currentLogs.push(args.join(' '));
      }
    };

    // Auto-detect declared variable references safely
    const variableTokens = Array.from(new Set(Array.from(source.matchAll(/(?:let|const|var)\s+([a-zA-Z0-9_$]+)/g), m => m[1])));
    if (!variableTokens.includes('i')) variableTokens.push('i');
    if (!variableTokens.includes('j')) variableTokens.push('j');

    // Build automated state collection hook
    const generateSnapshotExpr = () => {
      return `(function(){
        let __state = {};
        ["${variableTokens.join('","')}"].forEach(function(t) {
          try {
            let val = eval(t);
            if (typeof val !== 'undefined') __state[t] = JSON.parse(JSON.stringify(val));
          } catch(e){}
        });
        return __state;
      })()`;
    };

    let instrumentedCode = "";
    splitLines.forEach((line, index) => {
      const lineNum = index + 1;
      const clean = line.trim();

      if (clean === "" || clean.startsWith("//")) {
        instrumentedCode += line + "\n";
        return;
      }

      // Intercept and wrap block expressions cleanly to avoid syntax breakdown
      if (clean.startsWith("for") || clean.startsWith("while") || clean.startsWith("if")) {
        instrumentedCode += `__trace(${lineNum}, ${generateSnapshotExpr()}, ${JSON.stringify(clean)}); ${line}\n`;
      } else if (clean === "}") {
        instrumentedCode += `}\n__trace(${lineNum}, ${generateSnapshotExpr()}, "End of block execution");\n`;
      } else {
        instrumentedCode += `${line}\n__trace(${lineNum}, ${generateSnapshotExpr()}, ${JSON.stringify(clean)});\n`;
      }
    });

    const __trace = (lineNum, vars, snippet) => {
      // Remove temporary transient iteration index keys if they aren't active in code scope
      if (vars['i'] === undefined || vars['i'] === null) delete vars['i'];
      if (vars['j'] === undefined || vars['j'] === null) delete vars['j'];

      traceHistory.push({
        line: lineNum,
        snippet: snippet,
        vars: vars,
        logs: [...currentLogs]
      });
    };

    // Run custom executable function context
    const runSandbox = new Function('console', '__trace', instrumentedCode);
    runSandbox(sandboxConsole, __trace);

    if (traceHistory.length === 0) throw new Error("No operational telemetry logged.");

    timeline = generateBilingualStepTraces(traceHistory, source);
    renderTimelineStep(0);

    if (autoPlay) {
      document.getElementById('auto-play-indicator').classList.remove('hidden');
      autoPlayTimer = setInterval(() => {
        if (currentStep < timeline.length - 1) {
          renderTimelineStep(++currentStep);
        } else {
          clearInterval(autoPlayTimer);
          document.getElementById('auto-play-indicator').classList.add('hidden');
        }
      }, 3200);
    }

  } catch (err) {
    document.getElementById('console-output').innerHTML = `<span class="text-red-500 font-bold">❌ Engine Error: ${err.message}</span>`;
  }
}

function generateBilingualStepTraces(traces, source) {
  let list = [];
  let webapi = [];
  let microtask = [];
  let macrotask = [];

  traces.forEach((t) => {
    let stack = ['global frame'];
    let en = `Processing statement token: "${t.snippet}"`;
    let ta = `நிரல் வரி இயக்கம் பெறுகிறது: "${t.snippet}"`;

    if (t.snippet.includes('let') || t.snippet.includes('const') || t.snippet.includes('var')) {
      en = `Allocating variable tokens directly onto memory pointer storage blocks within the active scope environment.`;
      ta = `புதிய மாறி வெற்றிகரமாக உருவாக்கப்பட்டு, அதன் மதிப்பு மெமரி ஹீப் அடுக்கில் சேமிக்கிறது.`;
    } 
    if (t.snippet.includes('for') || t.snippet.includes('while')) {
      stack.push('loop block context');
      en = `Loop iterations checking. Verifying constraints conditions and running internal operational shifts.`;
      ta = `மடக்கு சுழற்சி நிபந்தனை சரிபார்க்கப்பட்டு சுழற்சி இயக்கம் தொடர்கிறது.`;
    } else if (t.snippet.includes('+=') && (t.vars.i !== undefined || t.vars.j !== undefined)) {
      stack.push('loop iteration');
      const idx = t.vars.i !== undefined ? t.vars.i : t.vars.j;
      en = `Loop step execution running at dynamic iteration index reference pointer location: [${idx}].`;
      ta = `மடக்கு சுழற்சியின் தற்போதைய குறியீட்டு நிலை இயக்கம் பெறுகிறது: [${idx}].`;
    } else if (t.snippet.includes('console.log')) {
      stack.push('console.log() context');
      en = `Directing internal text buffer character log arrays down to standard system stream terminal pipeline arrays.`;
      ta = `வெளியீட்டுத் திரைக்கு தகவல் அனுப்பப்பட்டு வெற்றிகரமாக அச்சிடப்படுகிறது.`;
    }

    list.push({ line: t.line, en, ta, stack, heap: t.vars, webapi: [...webapi], microtask: [...microtask], macrotask: [...macrotask], logs: t.logs, triggerLoopAnimation: false });
  });

  if (source.includes('Promise') || source.includes('setTimeout')) {
    const finalState = traces[traces.length - 1];
    let asyncLogs = [...finalState.logs];
    
    list.push({
      line: finalState.line,
      en: "Main synchronous script execution finishes. Call Stack completely empties out. Concurrency Event Loop triggers to monitor background task buffers.",
      ta: "முக்கிய ஒத்திசைவு நிரல் முடிந்தது. முதன்மை கால் ஸ்டேக் காலியானவுடன், நிகழ்வு சுழற்சி பின்னணி வரிசைகளை ஆய்வு செய்கிறது.",
      stack: [], heap: finalState.vars, webapi: webapi.length ? [...webapi] : [], microtask: source.includes('Promise') ? ['Promise .then() callback'] : [], macrotask: [], logs: asyncLogs, triggerLoopAnimation: true
    });

    if (source.includes('Promise')) {
      asyncLogs = [...asyncLogs, "Promise micro task completed: Data stream pipeline secure"];
      list.push({
        line: finalState.line,
        en: "Event Loop engine shifts high-priority Microtask Promise tasks directly onto the active processing Call Stack for standard thread evaluation.",
        ta: "நிகழ்வு சுழற்சி உயர் முன்னுரிமை கொண்ட மைக்ரோடாஸ்க் பிராமிஸை முதன்மை அடுக்கிற்கு கொண்டு சென்று இயக்குகிறது.",
        stack: ['Promise .then() callback', 'console.log()'], heap: finalState.vars, webapi: webapi.length ? [...webapi] : [], microtask: [], macrotask: [], logs: asyncLogs, triggerLoopAnimation: false
      });
    }

    if (source.includes('setTimeout')) {
      list.push({
        line: finalState.line,
        en: "Background Web API timer counter completes. Event Loop shifts the delayed callback directly down into the standard Macrotask execution queue.",
        ta: "பின்னணி வெப் ஏபிஐ டைமர் முடிந்தது. நிகழ்வு சுழற்சி மேக்ரோடாஸ்க் கால்பேக் பணியை குறைந்த முன்னுரிமை வரிசைக்கு மாற்றுகிறது.",
        stack: [], heap: finalState.vars, webapi: [], microtask: [], macrotask: ['setTimeout callback()'], logs: asyncLogs, triggerLoopAnimation: true
      });

      asyncLogs = [...asyncLogs, "Timeout callback macro task executing"];
      list.push({
        line: finalState.line,
        en: "Call Stack verified empty. Event Loop schedules the macrotask timer callback handler context onto the main engine execution plane.",
        ta: "அழைப்பு அடுக்கு காலியாக உள்ளதை உறுதிசெய்து, நிகழ்வு சுழற்சி மேக்ரோடாஸ்க் கால்பேக் பணியை முதன்மை திரியில் இயக்கி முடிக்கிறது.",
        stack: ['setTimeout callback()', 'console.log()'], heap: finalState.vars, webapi: [], microtask: [], macrotask: [], logs: asyncLogs, triggerLoopAnimation: false
      });
    }
  }

  return list;
}

/* UI VIEWPORT CONTROLLER */
function renderTimelineStep(index) {
  if (timeline.length === 0 || !timeline[index]) return;
  const state = timeline[index];
  const dict = DICTIONARY[currentLanguage];

  document.getElementById('step-counter').innerText = `${dict.stepLabel} ${index + 1} / ${timeline.length}`;
  document.getElementById('line-indicator').innerText = `${dict.lineLabel}: ${state.line}`;
  document.getElementById('action-desc').innerText = currentLanguage === 'en' ? state.en : state.ta;

  currentDecorations = editor.deltaDecorations(currentDecorations, [
    { range: new monaco.Range(state.line, 1, state.line, 1), options: { isWholeLine: true, className: 'current-line-highlight' } }
  ]);
  editor.revealLineInCenterIfOutsideViewport(state.line);

  const wheelElement = document.getElementById('evloop-wheel');
  if (state.triggerLoopAnimation) {
    wheelElement.classList.add('loop-spinner-active');
    wheelElement.style.borderColor = '#ed239f';
    wheelElement.style.transform = 'scale(1.15)';
  } else {
    wheelElement.classList.remove('loop-spinner-active');
    wheelElement.style.borderColor = '';
    wheelElement.style.transform = '';
  }

  const stackContainer = document.getElementById('call-stack-container');
  stackContainer.innerHTML = state.stack.length ? state.stack.map(f => `
    <div class="animate-frame px-3 py-2.5 font-bold rounded-lg shadow-sm flex justify-between items-center text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 border-2 border-slate-300 dark:border-brandPrimary">
      <span class="truncate font-mono text-[12px] tracking-wide">${f}</span>
      <span class="text-[9px] text-white px-2 py-0.5 rounded font-black tracking-wider brand-gradient-bg">FRAME</span>
    </div>
  `).join('') : `<div class="text-vpTextMuted italic text-center my-auto text-[12px] font-medium">${dict.emptyStack}</div>`;

  const heapContainer = document.getElementById('heap-container');
  heapContainer.innerHTML = '';

  if (Object.keys(state.heap).length === 0) {
    heapContainer.innerHTML = `<div class="text-vpTextMuted italic text-center py-5 text-[12px] font-medium">${dict.emptyHeap}</div>`;
  } else {
    Object.keys(state.heap).forEach(k => {
      const val = state.heap[k];
      if (typeof val === 'object' && val !== null) {
        heapContainer.innerHTML += `
          <div class="animate-frame p-3 bg-slate-100 dark:bg-slate-900 border-2 rounded-xl shadow-sm border-slate-300 dark:border-brandSecondary">
            <div class="text-[11px] font-black mb-1.5 uppercase tracking-wider font-mono text-brandSecondary">${k} 📦 Reference Map</div>
            <pre class="text-[12px] leading-relaxed text-slate-900 dark:text-pink-100 bg-white dark:bg-black/50 p-2 rounded-lg overflow-x-auto font-mono font-bold border border-slate-200 dark:border-slate-800">${JSON.stringify(val, null, 2)}</pre>
          </div>`;
      } else {
        heapContainer.innerHTML += `
          <div class="animate-frame p-2 bg-slate-100 dark:bg-slate-900/40 border-2 border-slate-300 dark:border-vpBorder rounded-xl flex justify-between items-center shadow-xs">
            <span class="text-slate-900 dark:text-slate-200 font-bold font-mono text-[12px] tracking-wide">${k}</span>
            <span class="text-white font-black px-2.5 py-1 rounded-lg text-[11px] font-mono tracking-wide brand-gradient-bg">${typeof val === 'string' ? `"${val}"` : val}</span>
          </div>`;
      }
    });
  }

  document.getElementById('webapi-queue').innerHTML = state.webapi.length ? 
    state.webapi.map(w => `<div class="p-2 bg-orange-500/10 border-2 border-orange-500 text-orange-700 dark:text-orange-400 text-center rounded-lg font-bold text-[11px] uppercase">${w.label}</div>`).join('') : `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.idleQ}</span>`;
    
  document.getElementById('microtask-queue').innerHTML = state.microtask.length ? 
    state.microtask.map(m => `<div class="p-2 border text-center rounded-lg font-bold text-[11px] uppercase text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900" style="border-color: #ed239f; border-width: 2px;">${m}</div>`).join('') : `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.emptyQ}</span>`;
    
  document.getElementById('macrotask-queue').innerHTML = state.macrotask.length ? 
    state.macrotask.map(m => `<div class="p-2 bg-amber-500/10 border-2 border-amber-500 text-amber-700 dark:text-amber-400 text-center rounded-lg font-bold text-[11px] uppercase">${m}</div>`).join('') : `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.emptyQ}</span>`;

  const terminal = document.getElementById('console-output');
  terminal.innerHTML = state.logs.length ? state.logs.map(l => `<div class="font-bold font-mono text-emerald-400">&gt; ${l}</div>`).join('') : `<div class="text-slate-500 italic font-mono">&gt; Console log pipeline idling...</div>`;
  terminal.scrollTop = terminal.scrollHeight;

  document.getElementById('prev-btn').disabled = index === 0;
  document.getElementById('next-btn').disabled = index === timeline.length - 1;
}

function translateUILabels(lang) {
  const c = DICTIONARY[lang];
  document.getElementById('modal-title').innerText = c.titleModal;
  document.getElementById('modal-desc').innerText = c.descModal;
  document.getElementById('mode-explain-btn').innerText = c.btnAuto;
  document.getElementById('mode-manual-btn').innerText = c.btnManual;
  document.getElementById('mode-cancel-btn').innerText = c.btnCancel;
  document.getElementById('label-editor-header').innerText = c.headerEditor;
  document.getElementById('label-stack-title').innerText = c.headerStack;
  document.getElementById('label-heap-title').innerText = c.headerHeap;
  document.getElementById('label-evloop-header').innerText = c.headerEvLoop;
  document.getElementById('label-q-webapi').innerText = c.qWebapi;
  document.getElementById('label-q-micro').innerText = c.qMicro;
  document.getElementById('label-q-macro').innerText = c.qMacro;
  document.getElementById('label-console-bar').innerText = c.barConsole;
}

function resetVisualizerState() {
  clearInterval(autoPlayTimer);
  const dict = DICTIONARY[currentLanguage];
  document.getElementById('auto-play-indicator').classList.add('hidden');
  document.getElementById('step-counter').innerText = 'Step 0 / 0';
  document.getElementById('line-indicator').innerText = 'Line: --';
  document.getElementById('action-desc').innerText = dict.descInit;
  document.getElementById('call-stack-container').innerHTML = `<div class="text-vpTextMuted italic text-center my-auto text-[12px] font-medium">${dict.emptyStack}</div>`;
  document.getElementById('heap-container').innerHTML = `<div class="text-vpTextMuted italic text-center my-auto text-[12px] font-medium">${dict.emptyHeap}</div>`;
  document.getElementById('webapi-queue').innerHTML = `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.idleQ}</span>`;
  document.getElementById('microtask-queue').innerHTML = `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.emptyQ}</span>`;
  document.getElementById('macrotask-queue').innerHTML = `<span class="text-slate-400 italic text-center block text-[11px] py-1">${dict.emptyQ}</span>`;
  document.getElementById('console-output').innerHTML = `<div class="text-slate-500 italic font-mono">&gt; Console log pipeline idling...</div>`;
}

document.getElementById('next-btn').addEventListener('click', () => { clearInterval(autoPlayTimer); document.getElementById('auto-play-indicator').classList.add('hidden'); if (currentStep < timeline.length - 1) renderTimelineStep(++currentStep); });
document.getElementById('prev-btn').addEventListener('click', () => { clearInterval(autoPlayTimer); document.getElementById('auto-play-indicator').classList.add('hidden'); if (currentStep > 0) renderTimelineStep(--currentStep); });
