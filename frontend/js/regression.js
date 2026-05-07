/* ============================================================
   REGRESSION MODELING PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadRegression() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <header class="section-header">
                <h2>Regression Analysis</h2>
                <p>Predictive modeling of overall player rating using multivariate linear regression.</p>
            </header>

            <div id="reg-loading"></div>
            <div id="reg-content" style="display:none;">
                
                <div style="margin-bottom:16px; margin-top: 16px;">
                    <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary);">
                        Model Performance Metrics
                    </span>
                </div>
                <div class="kpi-grid" id="reg-metrics" style="margin-bottom:32px;"></div>

                <div class="grid-2" style="margin-bottom:32px;">
                    <div class="chart-container">
                        <h3>Actual vs. Predicted Rating</h3>
                        <div class="canvas-wrapper"><canvas id="cr-scatter"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <h3>Feature Importance (Impact Factors)</h3>
                        <div class="canvas-wrapper"><canvas id="cr-coef"></canvas></div>
                    </div>
                </div>

                <div style="margin-bottom:32px;">
                    <div class="chart-container" style="height:350px;">
                        <h3>Error Frequency (Residuals Histogram)</h3>
                        <div class="canvas-wrapper"><canvas id="cr-reshist"></canvas></div>
                    </div>
                </div>

                <!-- PREDICTOR SECTION -->
                <div class="grid-2">
                    <div class="card" style="background:var(--bg-card); padding: 32px; border-radius: 16px;">
                        <h3 style="font-size:12px; text-transform:uppercase; letter-spacing:2px; color:var(--primary); margin-bottom:32px; font-weight:800;">Interactive Model Predictor</h3>
                        <div id="pred-sliders"></div>
                    </div>
 
                    <div class="card predict-result" style="display:flex; flex-direction:column; justify-content:center; align-items:center; border: 2px solid var(--border-color); border-radius:16px; background:var(--bg-card); padding: 40px;">
                        <span style="font-size:12px; text-transform:uppercase; letter-spacing:2.5px; color:var(--text-sub); margin-bottom:24px; font-weight:700;">Predicted Overall</span>
                        <div id="pred-val" style="font-size:80px; font-weight:900; color:var(--primary); line-height:1; margin-bottom:12px; font-family:'Courier New', monospace;">--</div>
                        <div id="pred-tier" style="font-size:18px; font-weight:800; letter-spacing:4px;">CALCULATING...</div>
                        <p style="margin-top:40px; font-size:14px; color:var(--text-sub); text-align:center; max-width:300px; line-height:1.7;">
                            This value is estimated using the multivariate linear equation derived from the current population.
                        </p>
                    </div>
                </div>

                <div class="card" style="margin-top:32px; background:rgba(0,0,0,0.3); border-left:4px solid var(--primary); padding: 32px; border-radius: 16px;">
                    <h4 style="font-size:0.8rem; text-transform:uppercase; letter-spacing:2.5px; color:var(--primary); margin-bottom:20px; font-weight:800;">Statistical Equation</h4>
                    <pre id="reg-eq" style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size:0.95rem; color:var(--text-main); white-space:pre-wrap; line-height:1.6;"></pre>
                </div>
            </div>
        </div>
    `;

    showLoading('reg-loading');
    const data = await fetchAPI(`/regression?${buildQueryString(filters)}`);
    document.getElementById('reg-loading').style.display = 'none';

    if (data.error) {
        showError('reg-content', data.error);
        document.getElementById('reg-content').style.display = 'block';
        return;
    }
    document.getElementById('reg-content').style.display = 'block';

    // Metrics
    document.getElementById('reg-metrics').innerHTML = `
        <div class="card kpi-card" style="border-left-color: var(--primary);">
            <span class="label">R² Accuracy</span>
            <span class="value">${data.metrics.r2}</span>
        </div>
        <div class="card kpi-card" style="border-left-color: var(--orange);">
            <span class="label">MAE</span>
            <span class="value">${data.metrics.mae}</span>
        </div>
        <div class="card kpi-card" style="border-left-color: var(--red);">
            <span class="label">RMSE</span>
            <span class="value">${data.metrics.rmse}</span>
        </div>
        <div class="card kpi-card" style="border-left-color: var(--green);">
            <span class="label">Training Size</span>
            <span class="value">${data.metrics.train_size.toLocaleString()}</span>
        </div>
    `;

    // Actual vs Pred
    createChart('cr-scatter', {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Predictions',
                data: data.actual_vs_pred.map(d => ({x: d.actual, y: d.predicted})),
                backgroundColor: 'rgba(0, 212, 255, 0.4)',
                pointRadius: 2
            }, {
                type: 'line',
                data: [{x: 40, y: 40}, {x: 95, y: 95}],
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: 'Actual Overall', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
                y: { title: { display: true, text: 'Predicted Overall', color: 'var(--text-sub)' }, ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
        }
    });

    // Coeffs (Fixing the blank chart issue)
    createChart('cr-coef', {
        type: 'bar',
        data: {
            labels: data.coefficients.map(d => d.feature.toUpperCase()),
            datasets: [{
                label: 'Coefficient Impact',
                data: data.coefficients.map(d => d.value),
                backgroundColor: data.coefficients.map(d => d.value >= 0 ? 'var(--primary)' : 'var(--red)'),
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } },
                y: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } }
            }
        }
    });

    // Residuals Hist
    createChart('cr-reshist', {
        type: 'bar',
        data: {
            labels: data.residuals_hist.labels.map(v => v.toFixed(1)),
            datasets: [{
                data: data.residuals_hist.values,
                backgroundColor: 'rgba(0, 255, 136, 0.3)',
                borderRadius: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
                y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
        }
    });

    // Equation - Formal Math Box
    const eqTerms = data.equation.terms.map(t => {
        const sign = t.coef >= 0 ? '+' : '-';
        return `${sign} (${Math.abs(t.coef).toFixed(4)} * ${t.feature.toUpperCase()})`;
    }).join('\n    ');
    
    const eqText = `ŷ (Overall) = ${data.equation.intercept.toFixed(4)}\n    ${eqTerms}`;
    document.getElementById('reg-eq').textContent = eqText;

    // Sliders
    const fr = data.feature_ranges;
    let slidersHtml = '';
    ['age', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic'].forEach(f => {
        if(fr[f]) {
            const min = Math.floor(fr[f].min);
            const max = Math.ceil(fr[f].max);
            const val = Math.round(fr[f].mean);
            slidersHtml += `
                <div class="filter-group" style="margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size:0.65rem; font-weight:800; color:var(--text-sub); text-transform:uppercase; letter-spacing:1px;">${f}</span>
                        <span id="val-${f}" class="mono" style="font-weight:700; color:var(--primary);">${val}</span>
                    </div>
                    <input type="range" class="pred-input" id="in-${f}" data-f="${f}" min="${min}" max="${max}" value="${val}">
                </div>
            `;
        }
    });
    document.getElementById('pred-sliders').innerHTML = slidersHtml;

    let debounceTimer;
    const performPrediction = async () => {
        const body = {
            age: parseFloat(document.getElementById('in-age').value),
            pace: parseFloat(document.getElementById('in-pace').value),
            shooting: parseFloat(document.getElementById('in-shooting').value),
            passing: parseFloat(document.getElementById('in-passing').value),
            dribbling: parseFloat(document.getElementById('in-dribbling').value),
            defending: parseFloat(document.getElementById('in-defending').value),
            physic: parseFloat(document.getElementById('in-physic').value)
        };
        
        const res = await fetchAPI('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if(!res.error) {
            document.getElementById('pred-val').textContent = res.predicted.toFixed(1);
            document.getElementById('pred-tier').textContent = res.tier.toUpperCase();
            document.getElementById('pred-tier').style.color = res.color;
            document.querySelector('.predict-result').style.borderColor = res.color;
        }
    };

    document.querySelectorAll('.pred-input').forEach(inp => {
        inp.addEventListener('input', (e) => {
            document.getElementById(`val-${e.target.dataset.f}`).textContent = e.target.value;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performPrediction, 150);
        });
    });

    performPrediction();
}
