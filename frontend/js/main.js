const API = '/api';

// Global filters state
let filters = {
    leagues: [],
    pos_groups: [],
    age_min: 17,
    age_max: 42,
    ovr_min: 48,
    ovr_max: 91,
    foot: []
};

// Chart.js Global Settings (FC24 Pro Style)
Chart.defaults.color = '#8a94a6';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.responsive = true;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.align = 'center';
Chart.defaults.plugins.title.font = { family: "'Outfit', sans-serif", size: 16, weight: '900' };
Chart.defaults.plugins.title.color = '#f0f4f8';

const darkTheme = {
    backgroundColor: '#161b22',
    color: '#f0f4f8',
    grid: { color: 'rgba(255,255,255,0.04)' },
    ticks: { color: '#8a94a6' },
    title: { color: '#f0f4f8' }
};

const CHART_COLORS = ['#00d4ff','#00ff88','#ffb800','#ff3b30','#bf5fff','#f0f4f8'];
const LEAGUE_COLORS = {
    'Premier League': '#00d4ff',
    'La Liga':        '#ffb800',
    'Serie A':        '#00ff88',
    'Bundesliga':     '#ff3b30',
    'Ligue 1':        '#bf5fff'
};

// Helpers
function buildQueryString(filters) {
    const params = new URLSearchParams();
    if (filters.leagues.length) params.append('leagues', filters.leagues.join(','));
    if (filters.pos_groups.length) params.append('pos_groups', filters.pos_groups.join(','));
    if (filters.foot.length) params.append('foot', filters.foot.join(','));
    params.append('age_min', filters.age_min);
    params.append('age_max', filters.age_max);
    params.append('ovr_min', filters.ovr_min);
    params.append('ovr_max', filters.ovr_max);
    return params.toString();
}

async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(`${API}${endpoint}`, options);
        const json = await res.json();
        if (!res.ok) {
            return { error: json.error || 'API Error' };
        }
        return json;
    } catch (e) {
        console.error(e);
        return { error: 'Connection failed. Please ensure the backend is running.' };
    }
}

function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '<div class="spinner"></div>';
}

function showError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="error-msg">${msg || 'An error occurred'}</div>`;
}

// Chart Instance Manager
const chartInstances = {};
function createChart(id, config) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    const existing = Chart.getChart(id);
    if (existing) existing.destroy();

    return new Chart(ctx, config);
}

// Navigation & Page Loading
let currentPage = 'dashboard';

async function loadPage(pageName) {
    currentPage = pageName;
    const content = document.getElementById('page-content');
    const badge = document.getElementById('syllabus-badge');
    const label = document.getElementById('current-page-label');
    const footer = document.getElementById('footer-nav-container');
    
    content.innerHTML = ''; 
    
    const pages = ['dashboard', 'graphical', 'stats', 'probability', 'regression', 'players', 'dataset'];
    const pageLabels = {
        'dashboard': 'Dashboard Overview',
        'graphical': 'Graphical Analysis',
        'stats': 'Descriptive Statistics',
        'probability': 'Probability Distributions',
        'regression': 'Regression Modeling',
        'players': 'Scouting & Comparison',
        'dataset': 'Dataset Explorer'
    };

    // Syllabus Badge Mapping
    const syllabusMap = {
        'dashboard': 'Project Overview',
        'graphical': 'Graphical Representation',
        'stats': 'Central Tendency & Dispersion',
        'probability': 'Probability & Distributions',
        'regression': 'Multivariate Modeling',
        'players': 'Applied Statistical Profiling',
        'dataset': 'Raw Data Repository'
    };

    label.textContent = pageLabels[pageName] || pageName.toUpperCase();
    badge.textContent = syllabusMap[pageName] || 'FC24 ANALYTICS';

    // Footer Navigation Logic
    const currentIndex = pages.indexOf(pageName);
    if (currentIndex !== -1 && currentIndex < pages.length - 1) {
        const next = pages[currentIndex + 1];
        footer.innerHTML = `
            <div class="footer-nav">
                <button class="next-page-btn" onclick="loadPage('${next}')">Next Topic: ${pageLabels[next]} »</button>
            </div>
        `;
    } else {
        footer.innerHTML = '';
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) link.classList.add('active');
    });

    const body = document.body;

    if (pageName === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
    else if (pageName === 'graphical' && typeof loadGraphical === 'function') loadGraphical();
    else if (pageName === 'stats' && typeof loadStats === 'function') loadStats();
    else if (pageName === 'probability' && typeof loadProbability === 'function') loadProbability();
    else if (pageName === 'regression' && typeof loadRegression === 'function') loadRegression();
    else if (pageName === 'players' && typeof loadPlayers === 'function') loadPlayers();
    else if (pageName === 'dataset' && typeof loadDataset === 'function') loadDataset();
}

async function applyFilters() {
    updatePlayerCount();
    loadPage(currentPage);
}

async function updatePlayerCount() {
    const data = await fetchAPI(`/dashboard?${buildQueryString(filters)}`);
    if (!data.error && data.kpis) {
        document.getElementById('player-count').textContent = `POPULATION: ${data.kpis.total_players}`;
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    
    // Sidebar Toggle Logic
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '[ » ]' : '[ « ]';
    });

    // Fetch initial filter options
    const fData = await fetchAPI('/filters');
    if (fData && !fData.error) {
        const lDiv = document.getElementById('filter-leagues');
        fData.leagues.forEach(l => {
            lDiv.innerHTML += `<label><input type="checkbox" value="${l}" class="f-league"> ${l}</label>`;
        });
        
        const pDiv = document.getElementById('filter-pos-groups');
        fData.pos_groups.forEach(p => {
            pDiv.innerHTML += `<label><input type="checkbox" value="${p}" class="f-pos"> ${p}</label>`;
        });
        
        const fDiv = document.getElementById('filter-foot');
        fData.feet.forEach(f => {
            fDiv.innerHTML += `<label><input type="checkbox" value="${f}" class="f-foot"> ${f}</label>`;
        });

        filters.age_min = fData.age_min;
        filters.age_max = fData.age_max;
        filters.ovr_min = fData.ovr_min;
        filters.ovr_max = fData.ovr_max;
        
        document.getElementById('age-min').min = fData.age_min;
        document.getElementById('age-min').max = fData.age_max;
        document.getElementById('age-min').value = fData.age_min;
        document.getElementById('age-max').min = fData.age_min;
        document.getElementById('age-max').max = fData.age_max;
        document.getElementById('age-max').value = fData.age_max;
        
        document.getElementById('ovr-min').min = fData.ovr_min;
        document.getElementById('ovr-min').max = fData.ovr_max;
        document.getElementById('ovr-min').value = fData.ovr_min;
        document.getElementById('ovr-max').min = fData.ovr_min;
        document.getElementById('ovr-max').max = fData.ovr_max;
        document.getElementById('ovr-max').value = fData.ovr_max;
        
        document.getElementById('age-val').textContent = `${fData.age_min} - ${fData.age_max}`;
        document.getElementById('ovr-val').textContent = `${fData.ovr_min} - ${fData.ovr_max}`;
    }

    // Filter Events
    document.querySelectorAll('.f-league').forEach(el => el.addEventListener('change', e => {
        if (e.target.checked) filters.leagues.push(e.target.value);
        else filters.leagues = filters.leagues.filter(v => v !== e.target.value);
        applyFilters();
    }));
    document.querySelectorAll('.f-pos').forEach(el => el.addEventListener('change', e => {
        if (e.target.checked) filters.pos_groups.push(e.target.value);
        else filters.pos_groups = filters.pos_groups.filter(v => v !== e.target.value);
        applyFilters();
    }));
    document.querySelectorAll('.f-foot').forEach(el => el.addEventListener('change', e => {
        if (e.target.checked) filters.foot.push(e.target.value);
        else filters.foot = filters.foot.filter(v => v !== e.target.value);
        applyFilters();
    }));

    ['age-min', 'age-max'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const min = parseInt(document.getElementById('age-min').value);
            const max = parseInt(document.getElementById('age-max').value);
            if (min <= max) {
                filters.age_min = min; filters.age_max = max;
                document.getElementById('age-val').textContent = `${min} - ${max}`;
            }
        });
        document.getElementById(id).addEventListener('change', applyFilters);
    });

    ['ovr-min', 'ovr-max'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            const min = parseInt(document.getElementById('ovr-min').value);
            const max = parseInt(document.getElementById('ovr-max').value);
            if (min <= max) {
                filters.ovr_min = min; filters.ovr_max = max;
                document.getElementById('ovr-val').textContent = `${min} - ${max}`;
            }
        });
        document.getElementById(id).addEventListener('change', applyFilters);
    });

    // Nav Links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            const page = e.currentTarget.dataset.page;
            if (page) loadPage(page);
        });
    });

    loadPage('dashboard');
    updatePlayerCount();
});
