/* ============================================================
   PROBABILITY DISTRIBUTIONS PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadProbability() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <header class="section-header">
                <h2>Probability Distributions</h2>
                <p>Modeling player population through continuous and discrete probability functions.</p>
            </header>

            <div id="prob-loading"></div>
            <div id="prob-content" style="display:none;">
                
                <div style="margin-bottom:16px; margin-top: 16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Empirical vs. Theoretical Probabilities
                    </span>
                </div>
                <div class="kpi-grid" id="prob-cards-container" style="margin-bottom:32px;"></div>

                <div style="margin-bottom:16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Continuous Probability Distributions
                    </span>
                </div>
                <div class="grid-2" style="margin-bottom:32px;">
                    <div class="chart-container">
                        <h3>Normal Distribution Curve (Overall Rating)</h3>
                        <div class="canvas-wrapper"><canvas id="cp-normal"></canvas></div>
                    </div>
                    <div class="card" style="display:flex; flex-direction:column; justify-content:center; background:var(--bg-card); padding: 32px; border-radius: 16px;">
                        <h3 style="font-size:12px; text-transform:uppercase; letter-spacing:2px; color:var(--primary); margin-bottom:16px; font-weight:800;">Model Validation: Shapiro-Wilk</h3>
                        <div id="sw-result" style="font-size:32px; font-weight:900; margin-bottom:8px;"></div>
                        <p style="font-size:14px; color:var(--text-sub); margin-bottom:24px; line-height:1.6;">
                            The Shapiro-Wilk algorithm evaluates whether the empirical sample follows a standard Normal Distribution.
                        </p>
                        <div style="display:flex; gap:40px; border-top:1px solid var(--border-color); padding-top:24px;">
                            <div>
                                <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-sub); letter-spacing:1.5px; margin-bottom:4px; font-weight:700;">P-Value</div>
                                <div id="sw-pval" class="mono" style="font-weight:700; font-size: 1.1rem; color: var(--text-main);"></div>
                            </div>
                            <div>
                                <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-sub); letter-spacing:1.5px; margin-bottom:4px; font-weight:700;">W-Statistic</div>
                                <div id="sw-stat" class="mono" style="font-weight:700; font-size: 1.1rem; color: var(--text-main);"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Discrete Probability Distributions
                    </span>
                </div>
                <div class="grid-2">
                    <div class="chart-container">
                        <h3>Binomial PMF (Probability Mass Function)</h3>
                        <div class="canvas-wrapper"><canvas id="cp-binom"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <h3>Poisson PMF (Arrival Probability)</h3>
                        <div class="canvas-wrapper"><canvas id="cp-poisson"></canvas></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    showLoading('prob-loading');
    const data = await fetchAPI(`/probability?${buildQueryString(filters)}`);
    document.getElementById('prob-loading').style.display = 'none';

    if (data.error) {
        showError('prob-content', data.error);
        document.getElementById('prob-content').style.display = 'block';
        return;
    }
    document.getElementById('prob-content').style.display = 'block';

    // Prob Cards
    document.getElementById('prob-cards-container').innerHTML = data.prob_cards.map(c => `
        <div class="card kpi-card">
            <span class="label">${c.label}</span>
            <span class="value">${(c.empirical * 100).toFixed(1)}%</span>
            <span style="font-size:0.65rem; color:var(--text-sub); margin-top:4px; display:block;">Model: ${(c.theoretical * 100).toFixed(1)}%</span>
        </div>
    `).join('');

    const commonOpt = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
            y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
        }
    };

    // Normal PDF
    createChart('cp-normal', {
        type: 'line',
        data: {
            datasets: [{
                label: 'Theoretical PDF',
                data: data.normal.x.map((xv, i) => ({ x: xv, y: data.normal.y[i] })),
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                fill: true,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: { 
            ...commonOpt, 
            scales: { 
                x: { 
                    type: 'linear', 
                    title: { display: true, text: 'Overall Rating', color: 'var(--text-sub)' },
                    ticks: { color: darkTheme.ticks.color },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                }, 
                y: { 
                    ticks: { color: darkTheme.ticks.color }, 
                    grid: { color: 'rgba(255,255,255,0.03)' } 
                } 
            } 
        }
    });

    // Binomial PMF
    createChart('cp-binom', {
        type: 'bar',
        data: {
            labels: data.binomial.k,
            datasets: [{
                data: data.binomial.pmf,
                backgroundColor: 'rgba(255, 59, 48, 0.4)',
                borderRadius: 2
            }]
        },
        options: commonOpt
    });

    // Poisson PMF
    createChart('cp-poisson', {
        type: 'bar',
        data: {
            labels: data.poisson.k,
            datasets: [{
                data: data.poisson.pmf,
                backgroundColor: 'rgba(255, 159, 28, 0.4)',
                borderRadius: 2
            }]
        },
        options: commonOpt
    });

    // Shapiro-Wilk Test
    const swResult = document.getElementById('sw-result');
    swResult.textContent = data.shapiro.result.toUpperCase();
    swResult.style.color = data.shapiro.result === 'Normal' ? 'var(--green)' : 'var(--red)';
    document.getElementById('sw-stat').textContent = data.shapiro.statistic.toFixed(4);
    document.getElementById('sw-pval').textContent = data.shapiro.p_value < 0.001 ? data.shapiro.p_value.toExponential(1) : data.shapiro.p_value.toFixed(4);
}
