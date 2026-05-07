/* ============================================================
   DESCRIPTIVE STATISTICS PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadStats() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <header class="section-header">
                <h2>Measures of Central Tendency & Dispersion</h2>
                <p>Detailed statistical breakdown of player population attributes.</p>
            </header>

            <div id="stats-loading"></div>
            <div id="stats-content" style="display:none;">
                
                <div style="margin-bottom:16px; margin-top: 16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Tabular Representation
                    </span>
                </div>
                <div class="table-container" style="margin-bottom:32px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Mean</th>
                                <th>Median</th>
                                <th>Mode</th>
                                <th>Std Dev</th>
                                <th>Var</th>
                                <th style="background:rgba(0,212,255,0.05);">CVar (%)</th>
                                <th>Min</th>
                                <th>Max</th>
                                <th>Skew</th>
                                <th>Kurt</th>
                            </tr>
                        </thead>
                        <tbody id="tb-desc"></tbody>
                    </table>
                </div>

                <div style="margin-bottom:16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Measures of Position (Confidence Intervals)
                    </span>
                </div>
                <div class="table-container" style="margin-bottom:32px;">
                    <table>
                        <thead>
                            <tr>
                                <th>Variable</th>
                                <th>Point Estimate</th>
                                <th>Lower (95%)</th>
                                <th>Upper (95%)</th>
                                <th>Margin</th>
                            </tr>
                        </thead>
                        <tbody id="tb-ci"></tbody>
                    </table>
                </div>

                <div class="grid-2">
                    <div class="chart-container">
                        <h3>Relative Variability (CVar)</h3>
                        <div class="canvas-wrapper"><canvas id="cs-cvar"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <h3>Distribution Symmetry (Skewness & Kurtosis)</h3>
                        <div class="canvas-wrapper"><canvas id="cs-skew"></canvas></div>
                    </div>
                </div>

                <div class="card" style="border-left: 4px solid var(--primary); background:var(--bg-card); padding: 32px;">
                    <h4 style="font-size:0.8rem; text-transform:uppercase; letter-spacing:2px; color:var(--primary); margin-bottom:12px; font-weight:800;">Statistical Note</h4>
                    <p style="font-size:0.9rem; color:var(--text-sub); line-height:1.7;">
                        The <b>Coefficient of Variation (CVar)</b> represents the ratio of the standard deviation to the mean, 
                        providing a normalized measure of dispersion across different scales of measurement.
                    </p>
                </div>
            </div>
        </div>
    `;

    showLoading('stats-loading');
    const data = await fetchAPI(`/stats?${buildQueryString(filters)}`);
    document.getElementById('stats-loading').style.display = 'none';

    if (data.error) {
        showError('stats-content', data.error);
        document.getElementById('stats-content').style.display = 'block';
        return;
    }
    document.getElementById('stats-content').style.display = 'block';

    // Populate Tables (with mono class for numbers)
    document.getElementById('tb-desc').innerHTML = data.descriptive.map(r => `
        <tr>
            <td style="font-weight:700; color:var(--text-main); font-size:0.75rem;">${r.variable.toUpperCase()}</td>
            <td class="mono">${r.mean}</td>
            <td class="mono">${r.median}</td>
            <td class="mono">${r.mode !== null ? r.mode : '-'}</td>
            <td class="mono">${r.std}</td>
            <td class="mono">${r.variance}</td>
            <td class="mono" style="font-weight:700; color:var(--primary);">${r.cvar}%</td>
            <td class="mono">${r.min}</td>
            <td class="mono">${r.max}</td>
            <td class="mono">${r.skewness}</td>
            <td class="mono">${r.kurtosis}</td>
        </tr>
    `).join('');

    document.getElementById('tb-ci').innerHTML = data.ci_table.map(r => `
        <tr>
            <td style="font-weight:700; color:var(--text-main); font-size:0.75rem;">${r.variable.toUpperCase()}</td>
            <td class="mono" style="font-weight:700;">${r.mean}</td>
            <td class="mono" style="color:var(--green);">${r.ci_lower}</td>
            <td class="mono" style="color:var(--green);">${r.ci_upper}</td>
            <td class="mono" style="color:var(--text-sub);">± ${r.margin}</td>
        </tr>
    `).join('');

    const commonOpt = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
            y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
        }
    };

    createChart('cs-cvar', {
        type: 'bar',
        data: {
            labels: data.descriptive.map(d => d.variable.toUpperCase()),
            datasets: [{
                label: 'CVar (%)',
                data: data.descriptive.map(d => d.cvar),
                backgroundColor: 'rgba(0, 212, 255, 0.4)',
                borderRadius: 2
            }]
        },
        options: { ...commonOpt, indexAxis: 'y' }
    });

    createChart('cs-skew', {
        type: 'bar',
        data: {
            labels: data.skew_kurt.map(d => d.attr.toUpperCase()),
            datasets: [
                {
                    label: 'Skewness',
                    data: data.skew_kurt.map(d => d.skewness),
                    backgroundColor: 'rgba(255, 159, 28, 0.4)',
                    borderRadius: 2
                },
                {
                    label: 'Kurtosis',
                    data: data.skew_kurt.map(d => d.kurtosis),
                    backgroundColor: 'rgba(191, 95, 255, 0.4)',
                    borderRadius: 2
                }
            ]
        },
        options: { ...commonOpt, plugins: { legend: { display: true, position: 'top', labels: { color: darkTheme.color, boxWidth: 12 } } } }
    });
}
