/* ============================================================
   DATASET EXPLORER PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadDataset() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <header class="section-header">
                <h2>Dataset Explorer</h2>
                <p>Full-access raw data view with global filtering applied.</p>
            </header>

            <div id="data-loading"></div>
            <div id="data-content" style="display:none;">
                
                <div style="margin-bottom:12px;">
                    <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--text-sub);">
                        Live Summary Statistics
                    </span>
                </div>
                <div class="kpi-grid" id="data-kpis" style="margin-bottom:32px;"></div>

                <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:var(--text-sub);">
                        Player Registry (Top 500 Samples)
                    </span>
                    <input type="text" id="table-search" placeholder="Filter rows..." 
                           style="padding:6px 12px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-main); font-size:0.75rem; border-radius:4px; width:200px;">
                </div>
                
                <div class="table-container" style="max-height:600px; overflow-y:auto;">
                    <table>
                        <thead style="position:sticky; top:0; z-index:10; background:var(--bg-card);">
                            <tr>
                                <th style="width:50px;">#</th>
                                <th>Player Name</th>
                                <th>OVR</th>
                                <th>POT</th>
                                <th>Age</th>
                                <th>Nationality</th>
                                <th>Club / League</th>
                                <th>Positions</th>
                                <th>Wage (EUR)</th>
                            </tr>
                        </thead>
                        <tbody id="dataset-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    showLoading('data-loading');
    const data = await fetchAPI(`/dataset?${buildQueryString(filters)}`);
    document.getElementById('data-loading').style.display = 'none';

    if (data.error) {
        showError('data-content', data.error);
        document.getElementById('data-content').style.display = 'block';
        return;
    }
    document.getElementById('data-content').style.display = 'block';

    // Fixed Mapping for Dataset Explorer KPIs
    const k = data.summary;
    document.getElementById('data-kpis').innerHTML = `
        <div class="card kpi-card">
            <span class="label">Filtered Population</span>
            <span class="value">${k.total_players.toLocaleString()}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Avg Rating</span>
            <span class="value">${k.avg_overall}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Top League</span>
            <span class="value">${k.top_league}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Avg Value</span>
            <span class="value">€${k.avg_value_m}M</span>
        </div>
    `;

    // Populate Table
    const tbody = document.getElementById('dataset-table-body');
    const renderTable = (rows) => {
        tbody.innerHTML = rows.map((p, i) => `
            <tr>
                <td class="mono" style="color:var(--text-sub); font-size:0.7rem;">${i + 1}</td>
                <td style="font-weight:700; color:var(--text-main);">${p.short_name}</td>
                <td class="mono" style="font-weight:700; color:${p.overall >= 80 ? 'var(--primary)' : 'inherit'}">${p.overall}</td>
                <td class="mono">${p.potential}</td>
                <td class="mono">${p.age}</td>
                <td style="color:var(--text-sub); font-size:0.75rem;">${p.nationality_name}</td>
                <td style="color:var(--text-sub); font-size:0.75rem;">${p.club_name}</td>
                <td><span style="font-size:0.7rem; color:var(--primary); font-weight:700;">${p.player_positions}</span></td>
                <td class="mono">€${p.wage_eur.toLocaleString()}</td>
            </tr>
        `).join('');
    };

    if(data.rows) renderTable(data.rows);

    // Live Search
    document.getElementById('table-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = data.rows.filter(r => 
            r.short_name.toLowerCase().includes(q) || 
            r.nationality_name.toLowerCase().includes(q) ||
            r.league_name.toLowerCase().includes(q)
        );
        renderTable(filtered);
    });
}
