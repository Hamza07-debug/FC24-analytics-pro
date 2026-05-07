/* ============================================================
   GRAPHICAL ANALYSIS PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadGraphical() {
    const content = document.getElementById('page-content');
    
    content.innerHTML = `
        <div class="page-container">
            <header class="section-header">
                <h2>Graphical Analysis</h2>
                <p>Visualization of player distributions and key variable relationships.</p>
            </header>

            <div id="graph-loading"></div>
            
            <div id="graph-content" style="display:none;">

                <div class="grid-2">
                    <div class="chart-container">
                        <h3>Overall Rating Distribution</h3>
                        <div class="canvas-wrapper"><canvas id="cg-hist"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <h3>Interquartile Range by Major League</h3>
                        <div class="canvas-wrapper"><canvas id="cg-box"></canvas></div>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="chart-container">
                        <h3>Age Correlation with Overall Rating</h3>
                        <div class="canvas-wrapper"><canvas id="cg-scat1"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <h3>Financial Analysis (Wage vs. Overall)</h3>
                        <div class="canvas-wrapper"><canvas id="cg-scat2"></canvas></div>
                    </div>
                </div>

                <div class="card" style="border-left: 4px solid var(--primary); background:var(--bg-card); padding: 32px;">
                    <h4 style="font-size:0.8rem; text-transform:uppercase; letter-spacing:2px; color:var(--primary); margin-bottom:12px; font-weight:800;">Interpretative Guide</h4>
                    <p style="font-size:0.9rem; color:var(--text-sub); line-height:1.7;">
                        Histograms provide frequency distribution analysis. Scatter plots visualize multivariate relationships, 
                        and floating bar charts represent the point-spread across different competitive environments.
                    </p>
                </div>
            </div>
        </div>
    `;

    showLoading('graph-loading');
    const data = await fetchAPI(`/graphical?${buildQueryString(filters)}`);
    document.getElementById('graph-loading').style.display = 'none';

    if (data.error) {
        showError('graph-content', data.error);
        document.getElementById('graph-content').style.display = 'block';
        return;
    }
    document.getElementById('graph-content').style.display = 'block';

    const commonOpt = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
            y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
        }
    };

    // ── 1. Histogram ──────────────────────────────────────────
    createChart('cg-hist', {
        type: 'bar',
        data: {
            labels: data.histogram.labels.map(b => Math.round(b)),
            datasets: [{
                label: 'Frequency',
                data: data.histogram.values,
                backgroundColor: 'rgba(0, 212, 255, 0.3)',
                borderRadius: 2,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: commonOpt
    });

    // ── 2. Boxplot (League Spreads) ────────────────────────────
    const boxData = data.boxplot.slice(0, 6);
    createChart('cg-box', {
        type: 'bar',
        data: {
            labels: boxData.map(d => d.league),
            datasets: [{
                label: 'Q1-Q3 Spread',
                data: boxData.map(d => [d.q1, d.q3]),
                backgroundColor: 'rgba(0, 255, 136, 0.3)',
                borderRadius: 2
            }]
        },
        options: {
            ...commonOpt,
            scales: {
                y: { min: 40, max: 95, ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } },
                x: { ticks: { color: darkTheme.ticks.color } }
            }
        }
    });

    // ── 3. Scatter 1: Age vs OVR ──────────────────────────────
    createChart('cg-scat1', {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Players',
                data: data.scatter_age.map(d => ({x: d.age, y: d.overall})),
                backgroundColor: 'rgba(191, 95, 255, 0.4)',
                pointRadius: 2
            }]
        },
        options: {
            ...commonOpt,
            scales: {
                x: { title: { display: true, text: 'Age', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color } },
                y: { title: { display: true, text: 'Overall Rating', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color } }
            }
        }
    });

    // ── 4. Scatter 2: Wage vs OVR ──────────────────────────────
    createChart('cg-scat2', {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Players',
                data: data.scatter_wage.map(d => ({x: d.overall, y: d.wage})),
                backgroundColor: 'rgba(255, 159, 28, 0.4)',
                pointRadius: 2
            }]
        },
        options: {
            ...commonOpt,
            scales: {
                x: { title: { display: true, text: 'Overall Rating', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color } },
                y: { type: 'logarithmic', title: { display: true, text: 'Wage (Log)', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color } }
            }
        }
    });
}
