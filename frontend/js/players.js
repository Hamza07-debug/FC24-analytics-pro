/* ============================================================
   PLAYER SEARCH PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadPlayers() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <div class="dashboard-hero scouting-hero">
                <div class="hero-content">
                    <div class="hero-text">
                        <span class="hero-subtitle">Pro Scouting Intelligence</span>
                        <h1 class="hero-title">Scouting & Comparison</h1>
                        <p class="hero-desc">Identify elite talent and compare global star players using multivariate statistical modeling.</p>
                    </div>
                </div>
            </div>

            <div id="play-loading"></div>
            <div id="play-content" style="display:none;">
                
                <div class="card" style="margin-bottom:32px; background:var(--bg-card);">
                    <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--text-sub); display:block; margin-bottom:12px;">Search Directory</span>
                    <div style="position:relative;">
                        <input type="text" id="p-search" placeholder="Enter player name (e.g. Mbappe, Haaland)..." 
                               style="width:100%; padding:14px 20px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-main); border-radius:4px;">
                        <div id="search-results" style="position:absolute; top:105%; left:0; width:100%; background:var(--bg-sidebar); border:1px solid var(--border-color); z-index:100; display:none; max-height:300px; overflow-y:auto;"></div>
                    </div>
                </div>

                <div id="player-profile" style="display:none; margin-bottom:48px;">
                    <div class="grid-2" style="margin-bottom:32px;">
                        <div class="card" style="border-left: 3px solid var(--primary); background:var(--bg-card);">
                            <h2 id="pp-name" style="font-size:24px; font-weight:800; color:var(--text-main); line-height:1; margin-bottom:4px;"></h2>
                            <div id="pp-club" style="font-size:12px; color:var(--primary); font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:24px;"></div>
                            
                            <div style="display:flex; gap:32px; margin-bottom:32px;">
                                <div class="kpi-mini">
                                    <span class="label" style="font-size:10px; text-transform:uppercase; color:var(--text-sub); display:block; letter-spacing:2px;">Overall</span>
                                    <span id="pp-ovr" class="mono" style="font-size:32px; font-weight:800; color:var(--text-main);"></span>
                                </div>
                                <div class="kpi-mini">
                                    <span class="label" style="font-size:10px; text-transform:uppercase; color:var(--text-sub); display:block; letter-spacing:2px;">Potential</span>
                                    <span id="pp-pot" class="mono" style="font-size:32px; font-weight:800; color:var(--green);"></span>
                                </div>
                            </div>

                            <div class="grid-2" style="font-size:12px; gap:12px;">
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Age</span> <span id="pp-age" class="mono"></span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Nation</span> <span id="pp-nat"></span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Foot</span> <span id="pp-foot"></span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Wage</span> <span class="mono">€<span id="pp-wage"></span></span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Value</span> <span class="mono">€<span id="pp-val"></span>M</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                                    <span style="color:var(--text-sub);">Position</span> <span id="pp-pos" style="color:var(--primary); font-weight:700;"></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chart-container" style="height:400px;">
                            <h3>Attribute Radar</h3>
                            <div class="canvas-wrapper"><canvas id="cp-radar"></canvas></div>
                        </div>
                    </div>

                    <!-- NEW: Z-SCORE STATISTICAL PROFILE -->
                    <div class="card" style="border-top: 3px solid var(--purple); background:var(--bg-card);">
                        <h3 style="font-size:10px; text-transform:uppercase; letter-spacing:2px; color:var(--purple); margin-bottom:16px;">Statistical Profile (Z-Score Analysis)</h3>
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Attribute</th>
                                        <th>Raw Value</th>
                                        <th>Population Avg</th>
                                        <th>Z-Score (SD)</th>
                                        <th>Percentile Rank</th>
                                        <th>Assessment</th>
                                    </tr>
                                </thead>
                                <tbody id="zscore-table-body"></tbody>
                            </table>
                        </div>
                        <p style="font-size:0.75rem; color:var(--text-sub); margin-top:16px; font-style:italic;">
                            *Z-Score represents how many standard deviations the player is from the mean of the entire ~18,000 player population.
                        </p>
                    </div>
                </div>

                <div style="margin-bottom:12px; border-top:1px solid var(--border-color); padding-top:32px;">
                    <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--text-sub);">Head-to-Head Comparison</span>
                </div>
                <div class="card" style="background:rgba(255,255,255,0.01);">
                    <div class="grid-2" style="margin-bottom:24px;">
                        <div>
                            <label style="display:block; font-size:0.7rem; color:var(--text-sub); text-transform:uppercase; margin-bottom:8px;">Player 1</label>
                            <select id="comp-1" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-main);"><option value="">Select...</option></select>
                        </div>
                        <div>
                            <label style="display:block; font-size:0.7rem; color:var(--text-sub); text-transform:uppercase; margin-bottom:8px;">Player 2</label>
                            <select id="comp-2" style="width:100%; padding:10px; background:var(--bg-main); border:1px solid var(--border-color); color:var(--text-main);"><option value="">Select...</option></select>
                        </div>
                    </div>
                    <div style="text-align:left;">
                        <button id="btn-compare" class="btn btn-primary">RUN COMPARISON</button>
                    </div>
                    
                    <div id="comp-results" style="display:none; margin-top:32px; padding:32px; border-radius:12px; background:linear-gradient(135deg, rgba(22, 27, 34, 0.9) 0%, rgba(5, 7, 10, 0.95) 100%), url('assets/fc24_hero_bg.jpg'); background-size:cover; background-position:center; border:1px solid var(--border-color);">
                        <div class="grid-2" style="margin-bottom:32px;">
                            <div class="chart-container" style="height:350px;">
                                <h3>Comparative Radar</h3>
                                <div class="canvas-wrapper"><canvas id="cc-radar"></canvas></div>
                            </div>
                            <div class="chart-container" style="height:350px;">
                                <h3>Attribute Delta</h3>
                                <div class="canvas-wrapper"><canvas id="cc-bar"></canvas></div>
                            </div>
                        </div>
                        
                        <div class="table-container">
                            <table id="comp-table">
                                <thead>
                                    <tr>
                                        <th>Attribute</th>
                                        <th id="ct-p1-name" style="background:rgba(0,212,255,0.05);">Player 1</th>
                                        <th id="ct-p2-name" style="background:rgba(255,159,28,0.05);">Player 2</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;

    showLoading('play-loading');
    const plData = await fetchAPI('/players');
    document.getElementById('play-loading').style.display = 'none';

    if (plData.error) {
        showError('play-content', plData.error);
        document.getElementById('play-content').style.display = 'block';
        return;
    }
    document.getElementById('play-content').style.display = 'block';

    if (plData.players) {
        const s1 = document.getElementById('comp-1');
        const s2 = document.getElementById('comp-2');
        plData.players.forEach(p => {
            const opt = `<option value="${p}">${p}</option>`;
            s1.insertAdjacentHTML('beforeend', opt);
            s2.insertAdjacentHTML('beforeend', opt);
        });
    }

    const radarOpt = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            r: {
                angleLines: { color: 'rgba(255,255,255,0.05)' },
                grid: { color: 'rgba(255,255,255,0.05)' },
                pointLabels: { color: darkTheme.ticks.color, font: { size: 10 } },
                ticks: { display: false },
                min: 0, max: 100
            }
        }
    };

    // Helper for Norm CDF (Percentile calculation)
    function normalCDF(x) {
        var t = 1 / (1 + 0.2316419 * Math.abs(x));
        var d = 0.3989423 * Math.exp(-x * x / 2);
        var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - p : p;
    }

    // Search
    let searchTimer;
    const searchInp = document.getElementById('p-search');
    const resDiv = document.getElementById('search-results');
    
    searchInp.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        if(q.length < 2) { resDiv.style.display = 'none'; return; }
        clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
            const data = await fetchAPI(`/player/search?q=${encodeURIComponent(q)}`);
            if(!data.error && data.length > 0) {
                resDiv.innerHTML = data.map(d => `
                    <div class="s-res-item" style="padding:12px 16px; cursor:pointer; border-bottom:1px solid var(--border-color); font-size:0.85rem;" 
                         data-info='${JSON.stringify(d).replace(/'/g, "&apos;")}'>
                        ${d.label}
                    </div>
                `).join('');
                resDiv.style.display = 'block';
                document.querySelectorAll('.s-res-item').forEach(item => {
                    item.addEventListener('click', (ev) => {
                        renderProfile(JSON.parse(ev.currentTarget.dataset.info));
                        resDiv.style.display = 'none';
                        searchInp.value = '';
                    });
                });
            }
        }, 300);
    });

    function renderProfile(p) {
        document.getElementById('player-profile').style.display = 'block';
        document.getElementById('pp-name').textContent = p.short_name;
        document.getElementById('pp-club').textContent = p.club;
        document.getElementById('pp-ovr').textContent = p.overall;
        document.getElementById('pp-pot').textContent = p.potential;
        document.getElementById('pp-age').textContent = p.age;
        document.getElementById('pp-nat').textContent = p.nationality;
        document.getElementById('pp-foot').textContent = p.foot;
        document.getElementById('pp-val').textContent = p.value.toLocaleString();
        document.getElementById('pp-wage').textContent = p.wage.toLocaleString();
        document.getElementById('pp-pos').textContent = p.positions;

        // Radar Chart
        createChart('cp-radar', {
            type: 'radar',
            data: {
                labels: p.radar_cats,
                datasets: [{
                    data: p.radar_vals,
                    backgroundColor: 'rgba(0, 212, 255, 0.2)',
                    borderColor: 'var(--primary)',
                    pointRadius: 0
                }]
            },
            options: radarOpt
        });

        // Z-Score Table
        const zBody = document.getElementById('zscore-table-body');
        let zHtml = '';
        p.radar_cats.forEach((cat, i) => {
            const feat = cat.toLowerCase();
            const raw = p.radar_vals[i];
            const stats = p.global_stats[feat];
            if(stats) {
                const z = (raw - stats.mean) / stats.std;
                const percentile = normalCDF(z) * 100;
                let assessment = "AVERAGE";
                let color = "inherit";
                if(z > 2) { assessment = "ELITE (TOP 2%)"; color = "var(--green)"; }
                else if(z > 1) { assessment = "EXCELLENT"; color = "var(--primary)"; }
                else if(z < -1) { assessment = "BELOW AVG"; color = "var(--red)"; }

                zHtml += `
                    <tr>
                        <td style="font-weight:700;">${cat}</td>
                        <td class="mono">${raw}</td>
                        <td class="mono" style="color:var(--text-sub);">${stats.mean.toFixed(1)}</td>
                        <td class="mono" style="font-weight:700; color:${color};">${z > 0 ? '+' : ''}${z.toFixed(2)} σ</td>
                        <td class="mono">${percentile.toFixed(1)}%</td>
                        <td style="font-weight:700; color:${color}; font-size:10px;">${assessment}</td>
                    </tr>
                `;
            }
        });
        zBody.innerHTML = zHtml;
    }

    // Compare
    document.getElementById('btn-compare').addEventListener('click', async () => {
        const p1 = document.getElementById('comp-1').value;
        const p2 = document.getElementById('comp-2').value;
        if(!p1 || !p2) return;

        const res = await fetchAPI('/compare', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({label1: p1, label2: p2})
        });

        if(res.error) return;

        document.getElementById('comp-results').style.display = 'block';
        document.getElementById('ct-p1-name').textContent = res.p1.short_name;
        document.getElementById('ct-p2-name').textContent = res.p2.short_name;

        createChart('cc-radar', {
            type: 'radar',
            data: {
                labels: ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physic'],
                datasets: [
                    { label: res.p1.short_name, data: [res.p1.pace, res.p1.shooting, res.p1.passing, res.p1.dribbling, res.p1.defending, res.p1.physic], backgroundColor: 'rgba(0, 212, 255, 0.1)', borderColor: 'var(--primary)', pointRadius: 0 },
                    { label: res.p2.short_name, data: [res.p2.pace, res.p2.shooting, res.p2.passing, res.p2.dribbling, res.p2.defending, res.p2.physic], backgroundColor: 'rgba(255, 159, 28, 0.1)', borderColor: 'var(--orange)', pointRadius: 0 }
                ]
            },
            options: { ...radarOpt, plugins: { legend: { display: true, position: 'bottom', labels: { color: darkTheme.color, boxWidth: 10 } } } }
        });

        createChart('cc-bar', {
            type: 'bar',
            data: {
                labels: res.bar_attrs.map(a => a.toUpperCase()),
                datasets: [
                    { label: res.p1.short_name, data: res.bar_p1, backgroundColor: 'rgba(0, 212, 255, 0.5)', borderRadius: 2 },
                    { label: res.p2.short_name, data: res.bar_p2, backgroundColor: 'rgba(255, 159, 28, 0.5)', borderRadius: 2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } }, y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } } } }
        });

        const tbody = document.querySelector('#comp-table tbody');
        tbody.innerHTML = res.bar_attrs.map((attr, i) => `
            <tr>
                <td style="font-weight:700; font-size:12px;">${attr.toUpperCase()}</td>
                <td class="mono" style="color:${res.bar_p1[i] > res.bar_p2[i] ? 'var(--green)' : 'inherit'}">${res.bar_p1[i]}</td>
                <td class="mono" style="color:${res.bar_p2[i] > res.bar_p1[i] ? 'var(--green)' : 'inherit'}">${res.bar_p2[i]}</td>
            </tr>
        `).join('');
    });
}
