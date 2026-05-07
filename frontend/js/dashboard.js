/* ============================================================
   DASHBOARD PAGE - MINIMAL DESIGN
   ============================================================ */

async function loadDashboard() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-container">
            <div class="dashboard-hero">
                <div class="hero-content">
                    <div class="hero-text">
                        <span class="hero-subtitle">Probability & Statistics Project</span>
                        <h1 class="hero-title">FC24 ANALYTICS PRO</h1>
                        <p class="hero-desc">Advanced performance metrics and predictive modeling for the professional player population.</p>
                    </div>
                </div>
            </div>

            <header class="section-header">
                <h2>Executive Summary</h2>
                <p>High-level overview of the professional player population metrics.</p>
            </header>

            <div class="kpi-grid" id="dash-kpis"></div>

            <div class="grid-2">
                <div class="chart-container">
                    <h3>Top 10 Players by Overall Rating</h3>
                    <div class="canvas-wrapper"><canvas id="cd-top-players"></canvas></div>
                </div>
                <div class="chart-container">
                    <h3>League Representation Distribution</h3>
                    <div class="canvas-wrapper"><canvas id="cd-league-dist"></canvas></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="chart-container">
                    <h3>Population by Position Groups</h3>
                    <div class="canvas-wrapper"><canvas id="cd-pos-dist"></canvas></div>
                </div>
                <div class="chart-container">
                    <h3>Top 10 Nationalities</h3>
                    <div class="canvas-wrapper"><canvas id="cd-nat-dist"></canvas></div>
                </div>
            </div>

            <div class="chart-container">
                <h3>Average Overall Rating by League</h3>
                <div class="canvas-wrapper"><canvas id="cd-avg-ovr"></canvas></div>
            </div>
        </div>
    `;

    showLoading('dash-kpis');
    const data = await fetchAPI(`/dashboard?${buildQueryString(filters)}`);
    
    if (data.error) {
        showError('dash-kpis', data.error);
        return;
    }

    const k = data.kpis;
    document.getElementById('dash-kpis').innerHTML = `
        <div class="card kpi-card">
            <span class="label">Total Players</span>
            <span class="value">${k.total_players.toLocaleString()}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Avg Rating</span>
            <span class="value">${k.avg_overall.toFixed(1)}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Top Nationality</span>
            <span class="value">${k.top_nationality}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Max Wage</span>
            <span class="value">€${k.max_wage.toLocaleString()}</span>
        </div>
        <div class="card kpi-card">
            <span class="label">Max Value</span>
            <span class="value">€${k.max_value_m}M</span>
        </div>
    `;

    const commonOpt = {
        responsive: true, maintainAspectRatio: false,
        plugins: { 
            legend: { 
                display: false,
                labels: { color: darkTheme.color, font: { size: 11 } } 
            } 
        },
        scales: {
            x: { ticks: { color: darkTheme.ticks.color }, grid: { display: false } },
            y: { ticks: { color: darkTheme.ticks.color }, grid: { color: 'rgba(255,255,255,0.03)' } }
        }
    };

    // Top 10 Bar (Backend key: top10)
    createChart('cd-top-players', {
        type: 'bar',
        data: {
            labels: data.top10.map(p => p.name),
            datasets: [{
                label: 'Overall Rating',
                data: data.top10.map(p => p.overall),
                backgroundColor: 'rgba(0, 212, 255, 0.4)',
                borderRadius: 2
            }]
        },
        options: { 
            ...commonOpt, 
            indexAxis: 'y', 
            scales: { 
                x: { 
                    min: 80, 
                    max: 95, 
                    ticks: { color: darkTheme.ticks.color, stepSize: 5 }, 
                    grid: { color: 'rgba(255,255,255,0.05)' } 
                }, 
                y: { 
                    ticks: { color: darkTheme.ticks.color, font: { size: 11 } } 
                } 
            } 
        }
    });

    // League Dist (Backend key: league_dist)
    createChart('cd-league-dist', {
        type: 'doughnut',
        data: {
            labels: data.league_dist.map(l => l.league),
            datasets: [{
                data: data.league_dist.map(l => l.count),
                backgroundColor: CHART_COLORS,
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'right', labels: { color: darkTheme.color, boxWidth: 12 } } },
            cutout: '70%'
        }
    });

    // Pos Group (Backend key: position_dist)
    createChart('cd-pos-dist', {
        type: 'bar',
        data: {
            labels: data.position_dist.map(p => p.position),
            datasets: [{
                data: data.position_dist.map(p => p.count),
                backgroundColor: 'rgba(0, 255, 136, 0.4)',
                borderRadius: 2
            }]
        },
        options: commonOpt
    });

    // Nat Dist (Backend key: nationality_top10)
    createChart('cd-nat-dist', {
        type: 'doughnut',
        data: {
            labels: data.nationality_top10.map(n => n.nationality),
            datasets: [{
                data: data.nationality_top10.map(n => n.count),
                backgroundColor: CHART_COLORS,
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'right', labels: { color: darkTheme.color, boxWidth: 12 } } },
            cutout: '70%'
        }
    });

    // Avg OVR by League (Backend key: avg_by_league)
    createChart('cd-avg-ovr', {
        type: 'bar',
        data: {
            labels: data.avg_by_league.map(l => l.league),
            datasets: [{
                label: 'Avg Overall',
                data: data.avg_by_league.map(l => l.avg),
                backgroundColor: data.avg_by_league.map(l => LEAGUE_COLORS[l.league] || 'rgba(0, 212, 255, 0.4)'),
                borderRadius: 2
            }]
        },
        options: { ...commonOpt, scales: { y: { min: 60, max: 85, ticks: { color: darkTheme.ticks.color } }, x: { ticks: { color: darkTheme.ticks.color } } } }
    });
}
