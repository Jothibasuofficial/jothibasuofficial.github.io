document.addEventListener("DOMContentLoaded", () => {

    const PRESETS = {
        ixscan_basic: {
            query: `db.users.find(
  { email: "jb@example.com", status: "active" },
  { _id: 0, name: 1, email: 1, createdAt: 1 }
).limit(1)`,
            plan: {
                stage: 'PROJECTION', nReturned: 1, docsExamined: 1, indexUsed: 'email_1_status_1',
                children: [{
                    stage: 'LIMIT', nReturned: 1, docsExamined: 1,
                    children: [{
                        stage: 'FETCH', nReturned: 1, docsExamined: 1,
                        children: [{
                            stage: 'IXSCAN', nReturned: 1, docsExamined: 1,
                            keyPattern: '{ email: 1, status: 1 }',
                            indexName: 'email_1_status_1',
                            direction: 'forward',
                            children: []
                        }]
                    }]
                }]
            }
        },

        collscan_warn: {
            query: `db.users.find(
  { age: { $gte: 25, $lte: 35 } }
).sort({ createdAt: -1 })`,
            plan: {
                stage: 'SORT', nReturned: 48200, docsExamined: 1200000, indexUsed: null,
                sortPattern: '{ createdAt: -1 }',
                children: [{
                    stage: 'COLLSCAN', nReturned: 48200, docsExamined: 1200000,
                    warning: 'Table-wide scans read every single document line on storage systems.',
                    children: []
                }]
            }
        },

        sort_agg: {
            query: `db.orders.aggregate([
  { $match: { status: "shipped" } },
  { $sort:  { amount: -1 } },
  { $limit: 50 },
  { $project: { orderId: 1, amount: 1, customer: 1 } }
])`,
            plan: {
                stage: 'PROJECTION', nReturned: 50, docsExamined: 8400, indexUsed: 'status_1_amount_1',
                children: [{
                    stage: 'LIMIT', nReturned: 50, docsExamined: 8400,
                    children: [{
                        stage: 'SORT', nReturned: 8400, docsExamined: 8400, sortPattern: '{ amount: -1 }',
                        children: [{
                            stage: 'FETCH', nReturned: 8400, docsExamined: 8400,
                            children: [{
                                stage: 'IXSCAN', nReturned: 8400, docsExamined: 8400,
                                keyPattern: '{ status: 1, amount: 1 }',
                                indexName: 'status_1_amount_1', direction: 'forward', children: []
                            }]
                        }]
                    }]
                }]
            }
        },

        complex_lookup: {
            query: `db.orders.aggregate([
  { $match: { createdAt: { $gte: ISODate("2026-01-01") } } },
  { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "userProfile"
  }},
  { $limit: 100 }
])`,
            plan: {
                stage: 'LIMIT', nReturned: 100, docsExamined: 31000, indexUsed: 'createdAt_1',
                children: [{
                    stage: 'LOOKUP', nReturned: 31000, docsExamined: 31000,
                    from: 'users', localField: 'userId', foreignField: '_id',
                    children: [{
                        stage: 'FETCH', nReturned: 31000, docsExamined: 31000,
                        children: [{
                            stage: 'IXSCAN', nReturned: 31000, docsExamined: 31000,
                            keyPattern: '{ createdAt: 1 }',
                            indexName: 'createdAt_1', direction: 'forward', children: []
                        }]
                    }]
                }]
            }
        },

        compound_index: {
            query: `db.products.find(
  {
    category: "electronics",
    price: { $lte: 999 },
    rating: { $gte: 4.0 }
  }
).sort({ rating: -1 }).limit(20)`,
            plan: {
                stage: 'LIMIT', nReturned: 20, docsExamined: 143, indexUsed: 'category_1_price_1_rating_-1',
                children: [{
                    stage: 'FETCH', nReturned: 143, docsExamined: 143,
                    children: [{
                        stage: 'IXSCAN', nReturned: 143, docsExamined: 143,
                        keyPattern: '{ category: 1, price: 1, rating: -1 }',
                        indexName: 'category_1_price_1_rating_-1',
                        direction: 'forward', children: []
                    }]
                }]
            }
        }
    };

    const EDUCATION_CENTER = {
        IXSCAN: {
            title: "Index Scan (The Golden Standard)",
            meaning: "Instead of searching every file on disk, MongoDB used a dedicated index shortcut blueprint. This works like looking up a word in a textbook index instead of turning every page in the book.",
            verdict: "Perfect! This step is incredibly fast and uses minimal server memory resource tracks.",
            action: "Keep it up. Nothing to optimize here."
        },
        COLLSCAN: {
            title: "Collection Scan (The Outage Catalyst)",
            meaning: "The database looked through every single file line item from start to finish because there was no index matching your search criteria filters.",
            verdict: "Dangerous! If your collection scales to millions of data nodes, this creates severe CPU logjams and response bottlenecks.",
            action: "Create a query index field immediately using `db.collection.createIndex()` matching your filter parameters."
        },
        FETCH: {
            title: "Document Pointer Retrievals",
            meaning: "The previous step found the internal IDs of the records. This step goes to actual database collections storage blocks to extract those records' requested values.",
            verdict: "Standard procedure. This step is fine as long as it is fed by a fast index scan instead of a full collection scan.",
            action: "Normal behavior. If you want maximum performance, look up 'Covered Indexes' to remove this stage completely."
        },
        SORT: {
            title: "Manual Memory Operations Sorting",
            meaning: "The database was asked to organize records in a specific order, but there was no index that stored them in that order. MongoDB had to sort them inside RAM memory manually.",
            verdict: "Risky! If the dataset being sorted exceeds 32 Megabytes, MongoDB throws an out-of-memory crash error.",
            action: "Add the sorted field to your index structure to let the database store things pre-arranged."
        },
        LIMIT: {
            title: "Output Pipeline Cap",
            meaning: "This limits the maximum number of documents that can travel higher up the execution tree to your code environment.",
            verdict: "Great! This prevents your backend from crashing from excessive memory consumption loads.",
            action: "Excellent for pagination routines."
        },
        PROJECTION: {
            title: "Field Mask Filtering",
            meaning: "This strips out unnecessary field parameters from the documents, returning only the specific schema data parameters your frontend requested.",
            verdict: "Highly efficient! Reduces network payload strain.",
            action: "Always use projection to avoid wasting database server pipe bands."
        },
        LOOKUP: {
            title: "Multi-Collection Relational Join",
            meaning: "This performs a relational database cross-reference join operation, pulling related records from a completely different collection file into the pipeline array.",
            verdict: "Heavy processing stage! Ensure the targeted collection has an active index matching the foreign key parameter.",
            action: "Check your query paths. Missing indexes on foreign keys here can lock database performance entirely."
        }
    };

    const editor = document.getElementById('query-editor');
    const editorContainer = document.getElementById('editor-container');
    const lineNumbers = document.getElementById('line-numbers');
    const presetSelector = document.getElementById('preset-select');
    const themeSelector = document.getElementById('theme-select');
    const runTrigger = document.getElementById('run-btn');
    const tooltipElement = document.getElementById('tooltip');

    let efficiencyChartInstance = null;
    let volumeChartInstance = null;
    let currentZoomBehavior = null;
    let baseSvgGroup = null;

    function getStageColorHex(stageName) {
        const palette = {
            COLLSCAN: '#ef4444', IXSCAN: '#10b981', FETCH: '#3b82f6',
            SORT: '#f59e0b', PROJECTION: '#8b5cf6', LIMIT: '#06b6d4',
            SKIP: '#6366f1', LOOKUP: '#ed239f', GROUP: '#1345e6'
        };
        return palette[stageName.toUpperCase()] || '#64748b';
    }

    function getStageSymbol(stageName) {
        const glyphs = {
            COLLSCAN: '⟳', IXSCAN: '⚡', FETCH: '↓', SORT: '⇅',
            PROJECTION: '◈', LIMIT: '⊘', LOOKUP: '⟺'
        };
        return glyphs[stageName.toUpperCase()] || '●';
    }

    function computeLineGutter() {
        const segmentCount = editor.value.split('\n').length;
        lineNumbers.innerHTML = Array.from({ length: segmentCount }, (_, offset) =>
            `<div style="height: 22.1px; line-height: 22.1px;">${offset + 1}</div>`
        ).join('');
    }

    editorContainer.addEventListener('mouseover', () => {
        tooltipElement.style.opacity = '1';
        tooltipElement.innerHTML = `<div class="font-bold text-amber-500">Analysis Locked</div><p class="text-[10px] text-zinc-400">Execution Plan Processing...</p>`;
    });

    editorContainer.addEventListener('mousemove', event => {
        tooltipElement.style.left = (event.pageX + 15) + 'px';
        tooltipElement.style.top = (event.pageY - 15) + 'px';
    });

    editorContainer.addEventListener('mouseout', () => {
        tooltipElement.style.opacity = '0';
    });

    function dispatchChartVisualizers(scannedCount, returnedCount) {
        const isDarkWorkspace = document.documentElement.classList.contains('dark');
        const baseTextLabelColor = isDarkWorkspace ? '#94a3b8' : '#475569';
        const dynamicGridStrokeColor = isDarkWorkspace ? 'rgba(30,45,69,0.3)' : 'rgba(203,213,225,0.4)';

        if (efficiencyChartInstance) efficiencyChartInstance.destroy();
        if (volumeChartInstance) volumeChartInstance.destroy();

        const efficiencyRatio = Math.min(100, (returnedCount / (scannedCount || 1)) * 100);

        const efficiencyContext = document.getElementById('efficiency-chart').getContext('2d');
        efficiencyChartInstance = new Chart(efficiencyContext, {
            type: 'doughnut',
            data: {
                labels: ['Useful Reads', 'Wasted Work'],
                datasets: [{
                    data: [returnedCount, Math.max(0, scannedCount - returnedCount)],
                    backgroundColor: [efficiencyRatio > 50 ? '#10b981' : efficiencyRatio > 5 ? '#f59e0b' : '#ef4444', isDarkWorkspace ? '#1e293b' : '#cbd5e1'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '75%'
            }
        });

        const volumeContext = document.getElementById('volume-chart').getContext('2d');
        volumeChartInstance = new Chart(volumeContext, {
            type: 'bar',
            data: {
                labels: ['Scanned', 'Returned'],
                datasets: [{
                    data: [scannedCount, returnedCount],
                    backgroundColor: ['#ed239f', '#1345e6'],
                    borderRadius: 4,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: baseTextLabelColor, font: { family: 'JetBrains Mono', size: 9 } } },
                    y: { type: 'logarithmic', grid: { color: dynamicGridStrokeColor }, ticks: { color: baseTextLabelColor, font: { family: 'JetBrains Mono', size: 8 } } }
                }
            }
        });
    }

    function handleDataStatsViewUpdate(planObject) {
        let nodeCount = 0, isCollscan = false, indexKey = 'none', maxScan = 0, returnCount = planObject.nReturned || 0;

        function walk(node) {
            if (!node) return;
            nodeCount++;
            if (node.stage === 'COLLSCAN') isCollscan = true;
            if (node.indexName) indexKey = node.indexName;
            if (node.docsExamined > maxScan) maxScan = node.docsExamined;
            if (node.children) node.children.forEach(walk);
        }
        walk(planObject);

        document.getElementById('stat-stages').textContent = nodeCount;
        document.getElementById('stat-scan').innerHTML = isCollscan ? `<span class="text-red-500 font-extrabold">🚨 SLOW SCAN</span>` : `<span class="text-emerald-600 dark:text-emerald-500 font-extrabold">⚡ ULTRA FAST</span>`;
        document.getElementById('stat-index').textContent = indexKey;

        const messageCenter = document.getElementById('warnings-area');
        if (isCollscan) {
            messageCenter.innerHTML = `
        <div class="text-[11px] mono px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400 flex gap-2">
          <i class="fa-solid fa-triangle-exclamation text-base shrink-0"></i>
          <div><strong>Senior Dev Review:</strong> This query will crash under production traffic loads. It searches millions of data segments linearly. Add a matching index.</div>
        </div>`;
        } else {
            messageCenter.innerHTML = `
        <div class="text-[11px] mono px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400 flex gap-2">
          <i class="fa-solid fa-circle-check text-base shrink-0"></i>
          <div><strong>Senior Dev Review:</strong> Code architecture looks clean! Index filters are active and resolving data objects accurately.</div>
        </div>`;
        }

        dispatchChartVisualizers(maxScan || 1, returnCount);
    }

    function generateTreeStructure(nodeBlueprint) {
        return {
            name: nodeBlueprint.stage,
            attributes: nodeBlueprint,
            children: nodeBlueprint.children && nodeBlueprint.children.length ? nodeBlueprint.children.map(generateTreeStructure) : null
        };
    }

    function executeTreeVisualization(planTreeRoot) {
        const elementContainer = document.getElementById('svg-container');
        const w = elementContainer.clientWidth, h = elementContainer.clientHeight;

        const svg = d3.select('#plan-svg').attr('width', w).attr('height', h);
        svg.selectAll('*').remove();

        const hierarchyRoot = d3.hierarchy(generateTreeStructure(planTreeRoot));
        const nodeW = 180, nodeH = 64, rowGap = 90, colGap = 40;

        const treeLayout = d3.tree().nodeSize([nodeW + colGap, nodeH + rowGap]);
        treeLayout(hierarchyRoot);

        hierarchyRoot.each(d => { d.y = d.depth * (nodeH + rowGap); });

        currentZoomBehavior = d3.zoom().scaleExtent([0.3, 2.5]).on('zoom', e => baseSvgGroup.attr('transform', e.transform));
        svg.call(currentZoomBehavior);

        baseSvgGroup = svg.append('g');
        svg.call(currentZoomBehavior.transform, d3.zoomIdentity.translate(w / 2, 35).scale(0.85));

        baseSvgGroup.selectAll('.link-path')
            .data(hierarchyRoot.links())
            .join('path')
            .attr('class', 'link-path')
            .attr('d', d => `M ${d.source.x} ${d.source.y + nodeH} C ${d.source.x} ${(d.source.y + nodeH + d.target.y) / 2}, ${d.target.x} ${(d.source.y + nodeH + d.target.y) / 2}, ${d.target.x} ${d.target.y}`);

        const nodeG = baseSvgGroup.selectAll('.node-group')
            .data(hierarchyRoot.descendants())
            .join('g')
            .attr('class', 'node-group')
            .attr('transform', d => `translate(${d.x - nodeW / 2},${d.y})`)
            .style('opacity', 0)
            .on('mouseover', (event, d) => {
                tooltipElement.style.opacity = '1';
                tooltipElement.innerHTML = `<div class="font-bold text-indigo-400 mb-1">${d.data.name} Step</div><p class="text-[10px] text-zinc-400">Returned: ${d.data.attributes.nReturned} docs<br>Scanned: ${d.data.attributes.docsExamined} elements</p>`;
            })
            .on('mousemove', event => {
                tooltipElement.style.left = (event.pageX + 15) + 'px';
                tooltipElement.style.top = (event.pageY - 15) + 'px';
            })
            .on('mouseout', () => { tooltipElement.style.opacity = '0'; })
            .on('click', (event, d) => { displayJuniorExplanation(d.data.attributes); });

        nodeG.append('rect')
            .attr('width', nodeW)
            .attr('height', nodeH)
            .attr('rx', 10).attr('ry', 10)
            .style('fill', document.documentElement.classList.contains('dark') ? '#121826' : '#ffffff')
            .style('stroke', d => getStageColorHex(d.data.name))
            .style('stroke-width', '2px');

        nodeG.append('rect').attr('x', 10).attr('y', 12).attr('width', 36).attr('height', 40).attr('rx', 6).style('fill', d => getStageColorHex(d.data.name));
        nodeG.append('text').attr('x', 28).attr('y', 36).attr('text-anchor', 'middle').style('fill', '#fff').style('font-size', '15px').text(d => getStageSymbol(d.data.name));

        nodeG.append('text').attr('class', 'node-text-title').attr('x', 54).attr('y', 26).style('fill', d => getStageColorHex(d.data.name)).text(d => d.data.name);
        nodeG.append('text').attr('class', 'node-text-desc').attr('x', 54).attr('y', 42).style('fill', '#64748b').style('font-family', 'JetBrains Mono').style('font-size', '9px').text(d => `Passes up: ${d.data.attributes.nReturned}`);

        nodeG.transition().duration(300).delay((d, i) => i * 50).style('opacity', 1);

        baseSvgGroup.selectAll('.arrow-marker')
            .data(hierarchyRoot.links()).join('text')
            .attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + nodeH + d.target.y) / 2 + 4)
            .attr('text-anchor', 'middle').style('fill', '#ed239f').style('font-size', '12px').text('↓');
    }

    function displayJuniorExplanation(stageData) {
        const detailPanel = document.getElementById('stage-detail-content');
        const dictionaryEntry = EDUCATION_CENTER[stageData.stage] || {
            title: `${stageData.stage} Step Layer`,
            meaning: "This is an internal processing stage layer executing data pipeline mutation arrays.",
            verdict: "Active state configuration baseline fine.",
            action: "Review indexing logs to streamline optimization vectors."
        };

        const blockColor = getStageColorHex(stageData.stage);

        detailPanel.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-zinc-700 dark:text-zinc-300">
        <div class="md:col-span-1 border-r pr-4 border-zinc-200 dark:border-zinc-700/50">
          <h4 class="text-sm font-extrabold tracking-wide uppercase mb-1" style="color:${blockColor};">${dictionaryEntry.title}</h4>
          <div class="space-y-1 text-[11px] mono">
            <div><span class="text-zinc-400 dark:text-zinc-500">Rows Sent Up:</span> <span class="text-indigo-600 dark:text-indigo-400 font-bold">${(stageData.nReturned || 0).toLocaleString()}</span></div>
            <div><span class="text-zinc-400 dark:text-zinc-500">Rows Looked At:</span> <span class="text-amber-600 dark:text-amber-500 font-bold">${(stageData.docsExamined || 0).toLocaleString()}</span></div>
            ${stageData.indexName ? `<div><span class="text-zinc-400 dark:text-zinc-500">Via Index:</span> <span class="text-emerald-600 dark:text-emerald-400 font-bold">${stageData.indexName}</span></div>` : ''}
          </div>
        </div>
        <div class="md:col-span-2 space-y-2">
          <div><strong class="text-zinc-500 dark:text-zinc-400 text-[10px] uppercase tracking-wider block mb-0.5">What this step does:</strong><p class="text-zinc-800 dark:text-zinc-300 leading-relaxed text-xs">${dictionaryEntry.meaning}</p></div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div><strong class="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase block">Is this step safe?</strong><span class="text-zinc-800 dark:text-zinc-300 text-xs font-medium">${dictionaryEntry.verdict}</span></div>
            <div><strong class="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase block">What should you do?</strong><span class="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">${dictionaryEntry.action}</span></div>
          </div>
        </div>
      </div>
    `;
    }

    function evaluateCodeWorkspace() {
        const config = PRESETS[presetSelector.value];
        if (config) {
            executeTreeVisualization(config.plan);
            handleDataStatsViewUpdate(config.plan);
        }
    }

    runTrigger.addEventListener('click', evaluateCodeWorkspace);
    presetSelector.addEventListener('change', e => {
        const selected = PRESETS[e.target.value];
        if (selected) {
            editor.value = selected.query;
            computeLineGutter();
            evaluateCodeWorkspace();
            document.getElementById('stage-detail-content').innerHTML = `<p class="text-zinc-500 dark:text-zinc-400 leading-relaxed italic">Click any stage box inside the map grid path above. A senior developer plain-English code review breakdown statement will instantly populate right here.</p>`;
        }
    });

    themeSelector.addEventListener('change', e => {
        document.documentElement.className = e.target.value;
        evaluateCodeWorkspace();
    });

    document.getElementById('zoom-in').addEventListener('click', () => d3.select('#plan-svg').transition().duration(200).call(currentZoomBehavior.scaleBy, 1.25));
    document.getElementById('zoom-out').addEventListener('click', () => d3.select('#plan-svg').transition().duration(200).call(currentZoomBehavior.scaleBy, 0.8));
    document.getElementById('reset-zoom').addEventListener('click', () => d3.select('#plan-svg').transition().duration(250).call(currentZoomBehavior.transform, d3.zoomIdentity.translate(document.getElementById('svg-container').clientWidth / 2, 35).scale(0.85)));

    editor.value = PRESETS.ixscan_basic.query;
    computeLineGutter();
    setTimeout(evaluateCodeWorkspace, 200);
});