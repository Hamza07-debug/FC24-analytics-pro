from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import math
import os
from typing import List, Optional

app = FastAPI(title="FC24 Analytics Pro API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend directory for static serving
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path, html=True), name="frontend")

# Global data variable
df = None

def load_data():
    global df
    try:
        # Fix: Robust pathing relative to script location
        base_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(base_dir, "male_players.csv")
        
        raw_df = pd.read_csv(csv_path, low_memory=False)
        
        # Coerce critical columns to numeric to prevent filtering bugs
        raw_df['fifa_version'] = pd.to_numeric(raw_df['fifa_version'], errors='coerce')
        raw_df['overall'] = pd.to_numeric(raw_df['overall'], errors='coerce')
        raw_df['age'] = pd.to_numeric(raw_df['age'], errors='coerce')
        
        # Filter for FIFA 24 and Top 5 Leagues
        leagues = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']
        df = raw_df[(raw_df['fifa_version'] == 24) & (raw_df['league_name'].isin(leagues))].copy()
        
        # Position grouping logic
        def get_pos_group(pos):
            if pd.isna(pos): return 'Other'
            pos = str(pos).split(',')[0].strip()
            if pos == 'GK': return 'GK'
            if pos in ['CB', 'LB', 'RB', 'LWB', 'RWB']: return 'DEF'
            if pos in ['CM', 'CDM', 'CAM', 'LM', 'RM']: return 'MID'
            if pos in ['ST', 'CF', 'LW', 'RW', 'LS', 'RS']: return 'ATT'
            return 'Other'
        
        df['pos_group'] = df['player_positions'].apply(get_pos_group)
        df['value_millions'] = pd.to_numeric(df['value_eur'], errors='coerce') / 1_000_000
        
        # Ensure technical columns are numeric for stats
        tech_cols = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
        for col in tech_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
            
        print(f"SUCCESS: Backend Ready: {len(df)} players loaded from {csv_path}")
    except Exception as e:
        print(f"ERROR: Initialization Error: {e}")

load_data()

def get_filtered_df(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None),
    ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    if df is None: return pd.DataFrame()
    f_df = df.copy()
    
    # Process inputs if they come as comma-separated strings inside a list element
    if leagues and len(leagues) == 1 and ',' in leagues[0]:
        leagues = [x.strip() for x in leagues[0].split(',')]
    if pos_groups and len(pos_groups) == 1 and ',' in pos_groups[0]:
        pos_groups = [x.strip() for x in pos_groups[0].split(',')]
    if foot and len(foot) == 1 and ',' in foot[0]:
        foot = [x.strip() for x in foot[0].split(',')]

    if leagues: f_df = f_df[f_df['league_name'].isin(leagues)]
    if pos_groups: f_df = f_df[f_df['pos_group'].isin(pos_groups)]
    if age_min is not None: f_df = f_df[f_df['age'] >= age_min]
    if age_max is not None: f_df = f_df[f_df['age'] <= age_max]
    if ovr_min is not None: f_df = f_df[f_df['overall'] >= ovr_min]
    if ovr_max is not None: f_df = f_df[f_df['overall'] <= ovr_max]
    if foot: f_df = f_df[f_df['preferred_foot'].isin(foot)]
    return f_df

@app.get("/api/filters")
def get_filters():
    if df is None: return {"error": "Data not loaded"}
    return {
        "leagues": sorted(df['league_name'].dropna().unique().tolist()),
        "pos_groups": sorted(df['pos_group'].unique().tolist()),
        "feet": sorted(df['preferred_foot'].dropna().unique().tolist()),
        "age_min": int(df['age'].min()),
        "age_max": int(df['age'].max()),
        "ovr_min": int(df['overall'].min()),
        "ovr_max": int(df['overall'].max())
    }

@app.get("/api/dashboard")
def get_dashboard(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None),
    ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if f_df.empty: return {"error": "No players match the current filters."}
    
    avg_by_league = f_df.groupby('league_name')['overall'].mean().reset_index()
    avg_by_league = avg_by_league.rename(columns={'league_name': 'league', 'overall': 'avg'})
    
    return {
        "kpis": {
            "total_players": len(f_df),
            "avg_overall": round(float(f_df['overall'].mean()), 1),
            "max_wage": int(f_df['wage_eur'].max()) if not f_df['wage_eur'].empty else 0,
            "max_value_m": round(float(f_df['value_millions'].max()), 2) if not f_df['value_millions'].empty else 0,
            "top_nationality": f_df['nationality_name'].mode()[0] if not f_df['nationality_name'].empty else "N/A"
        },
        "top10": f_df.nlargest(10, 'overall')[['short_name', 'overall', 'league_name']].rename(columns={'short_name': 'name', 'league_name': 'league'}).to_dict('records'),
        "league_dist": f_df['league_name'].value_counts().reset_index().rename(columns={'league_name': 'league', 'count': 'count'}).to_dict('records'),
        "nationality_top10": f_df['nationality_name'].value_counts().head(10).reset_index().rename(columns={'nationality_name': 'nationality', 'count': 'count'}).to_dict('records'),
        "position_dist": f_df['pos_group'].value_counts().reset_index().rename(columns={'pos_group': 'position', 'count': 'count'}).to_dict('records'),
        "avg_by_league": avg_by_league.to_dict('records')
    }

@app.get("/api/graphical")
def get_graphical(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None),
    ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if f_df.empty: return {"error": "No data"}

    # Histogram & Normal Curve
    counts, bins = np.histogram(f_df['overall'].dropna(), bins=30)
    bin_centers = (bins[:-1] + bins[1:]) / 2
    
    mu, std = f_df['overall'].mean(), f_df['overall'].std()
    x = np.linspace(f_df['overall'].min(), f_df['overall'].max(), 100)
    y = stats.norm.pdf(x, mu, std)
    # Scale density back to counts for overlaying on the same Y axis
    y_scaled = y * len(f_df['overall'].dropna()) * (bins[1] - bins[0])
    
    histogram = {
        "labels": bin_centers.tolist(),
        "values": counts.tolist(),
        "normal_x": x.tolist(),
        "normal_y": y_scaled.tolist()
    }
    
    # Boxplot
    boxplot_data = []
    for league in f_df['league_name'].dropna().unique():
        ldf = f_df[f_df['league_name'] == league]['overall'].dropna()
        if not ldf.empty:
            boxplot_data.append({
                "league": league,
                "min": float(ldf.min()),
                "q1": float(ldf.quantile(0.25)),
                "median": float(ldf.median()),
                "q3": float(ldf.quantile(0.75)),
                "max": float(ldf.max())
            })
            
    # Scatter plots
    age_ovr = f_df.sample(min(600, len(f_df)))[['age', 'overall', 'league_name', 'short_name']].rename(columns={'short_name':'name', 'league_name':'league'}).to_dict('records')
    
    wage_df = f_df[f_df['wage_eur'] > 0]
    wage_ovr = wage_df.sample(min(600, len(wage_df)))[['overall', 'wage_eur', 'league_name', 'short_name']].rename(columns={'short_name':'name', 'league_name':'league', 'wage_eur':'wage'}).to_dict('records')
    
    # Correlation Matrix
    cols = ['overall', 'potential', 'age', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic', 'wage_eur']
    corr_df = f_df[cols].corr().fillna(0)
    corr_matrix = corr_df.values.tolist()
    
    heatmap = {
        "labels": cols,
        "matrix": corr_matrix
    }
    
    # Preferred Foot
    foot_dist = f_df['preferred_foot'].value_counts().reset_index().rename(columns={'preferred_foot': 'foot', 'count': 'count'}).to_dict('records')
    
    # Work Rate
    work_rate = f_df['work_rate'].value_counts().head(8).reset_index().rename(columns={'work_rate': 'work_rate', 'count': 'count'}).to_dict('records')
    
    # Table Data
    table_cols = ['short_name', 'overall', 'potential', 'age', 'wage_eur', 'nationality_name', 'league_name', 'player_positions']
    table_data = f_df[table_cols].head(200).fillna("").to_dict('records')
    
    return {
        "histogram": histogram,
        "boxplot": boxplot_data,
        "scatter_age": age_ovr,
        "scatter_wage": wage_ovr,
        "heatmap": heatmap,
        "foot_dist": foot_dist,
        "work_rate": work_rate,
        "table_data": table_data
    }

@app.get("/api/stats")
def get_stats(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None),
    ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if f_df.empty: return {"error": "Insufficient data"}
    
    variables = ['overall', 'potential', 'age', 'wage_eur', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    descriptive = []
    ci_table = []
    
    for var in variables:
        data = f_df[var].dropna()
        if data.empty: continue
        mean, std, n = data.mean(), data.std(), len(data)
        mode_val = data.mode()[0] if not data.mode().empty else None
        
        descriptive.append({
            "variable": var,
            "count": n,
            "mean": round(float(mean), 2),
            "median": round(float(data.median()), 2),
            "mode": round(float(mode_val), 2) if mode_val is not None else None,
            "std": round(float(std), 2),
            "variance": round(float(data.var()), 2),
            "cvar": round(float((std / mean) * 100), 2) if mean != 0 else 0,
            "min": float(data.min()),
            "max": float(data.max()),
            "skewness": round(float(data.skew()), 2),
            "kurtosis": round(float(data.kurtosis()), 2)
        })
        
        if n > 1:
            margin = stats.t.ppf(0.975, n-1) * (std / math.sqrt(n))
            ci_table.append({
                "variable": var,
                "mean": round(float(mean), 2),
                "ci_lower": round(float(mean - margin), 2),
                "ci_upper": round(float(mean + margin), 2),
                "margin": round(float(margin), 2)
            })

    tech = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    attr_means = []
    for t in tech:
        data = f_df[t].dropna()
        if data.empty: continue
        mean, std, n = data.mean(), data.std(), len(data)
        margin = stats.t.ppf(0.975, n-1) * (std / math.sqrt(n)) if n > 1 else 0
        attr_means.append({
            "attr": t,
            "mean": round(float(mean), 2),
            "error": round(float(margin), 2)
        })

    skew_kurt = [{"attr": v, "skewness": round(float(f_df[v].skew()), 2), "kurtosis": round(float(f_df[v].kurtosis()), 2)} for v in tech if not f_df[v].dropna().empty]

    p_labels = [5, 10, 25, 50, 75, 90, 95, 99]
    percentiles = []
    if not f_df['overall'].dropna().empty:
        percentiles = [{"label": f"P{p}", "value": float(f_df['overall'].quantile(p/100))} for p in p_labels]

    return {
        "descriptive": descriptive,
        "ci_table": ci_table,
        "attr_means": attr_means,
        "skew_kurt": skew_kurt,
        "percentiles": percentiles
    }

@app.get("/api/probability")
def get_probability(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None), age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None), ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    """
    Probability distributions endpoint.
    Normal PDF, Binomial (n=50, p=P(OVR>=80)), Poisson (lambda=mean per top-10 nationality),
    Z-Score histogram, ECDF vs Theoretical, 6 prob cards, Shapiro-Wilk on 200 sample.
    """
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if f_df.empty: return {"error": "No data"}

    ovr = f_df['overall'].dropna()
    if len(ovr) < 2: return {"error": "Not enough data"}
    mu, std = ovr.mean(), ovr.std()
    x = np.linspace(ovr.min() - 5, ovr.max() + 5, 100)
    pdf = stats.norm.pdf(x, mu, std)

    # Normal PDF with shaded regions (OVR >= 80 = elite, 65-75 = mid)
    elite_mask = x >= 80
    mid_mask = (x >= 65) & (x <= 75)
    normal = {
        "x": x.tolist(), "y": pdf.tolist(),
        "mean": float(mu), "std": float(std),
        "shade_elite_x": x[elite_mask].tolist(), "shade_elite_y": pdf[elite_mask].tolist(),
        "shade_mid_x": x[mid_mask].tolist(),    "shade_mid_y": pdf[mid_mask].tolist()
    }

    # Binomial — p = P(overall >= 80), n = 50 trials
    p_80 = float((ovr >= 80).mean())
    n_binom = 50
    k = np.arange(0, 21)
    binom_pmf = stats.binom.pmf(k, n_binom, p_80)
    binomial = {"k": k.tolist(), "pmf": binom_pmf.tolist(), "expected": float(n_binom * p_80), "p": p_80, "n": n_binom}

    # Poisson — λ = mean players per top-10 nationality
    top10_counts = f_df['nationality_name'].value_counts().head(10)
    lambda_p = float(top10_counts.mean()) if len(top10_counts) > 0 else 1.0
    kp = np.arange(0, 20)
    poisson_pmf = stats.poisson.pmf(kp, lambda_p)
    poisson = {"k": kp.tolist(), "pmf": poisson_pmf.tolist(), "lambda_val": round(lambda_p, 2)}

    # Z-Score distribution — 40-bin histogram
    z_scores = stats.zscore(ovr)
    z_counts, z_bins = np.histogram(z_scores, bins=40)
    z_centers = (z_bins[:-1] + z_bins[1:]) / 2
    zscore_data = {"labels": z_centers.tolist(), "values": z_counts.tolist()}

    # CDF — ECDF vs Theoretical Normal CDF
    sorted_ovr = np.sort(ovr)
    empirical_y = np.arange(1, len(sorted_ovr) + 1) / len(sorted_ovr)
    theoretical_y = stats.norm.cdf(sorted_ovr, mu, std)
    cdf = {
        "empirical_x": sorted_ovr.tolist(), "empirical_y": empirical_y.tolist(),
        "theoretical_x": sorted_ovr.tolist(), "theoretical_y": theoretical_y.tolist()
    }

    # 6 Probability Cards per spec
    p_ovr85       = float((ovr >= 85).mean())
    p_ovr_lt70    = float((ovr < 70).mean())
    p_age_lt23    = float((f_df['age'] < 23).mean())
    p_wage_gt100k = float((f_df['wage_eur'] > 100000).mean())
    p_future_star = float(((ovr >= 80) & (f_df['age'] < 25)).mean())

    prob_cards = [
        {
            "label": "P(OVR \u2265 85)",
            "empirical": round(p_ovr85, 4),
            "theoretical": round(float(1 - stats.norm.cdf(85, mu, std)), 4),
            "description": "Probability of selecting a world-class elite player.",
            "color": "#FFD60A"
        },
        {
            "label": "P(OVR \u2265 80)",
            "empirical": round(p_80, 4),
            "theoretical": round(float(1 - stats.norm.cdf(80, mu, std)), 4),
            "description": "Probability of selecting a high-performing player.",
            "color": "#00D4FF"
        },
        {
            "label": "P(OVR < 70)",
            "empirical": round(p_ovr_lt70, 4),
            "theoretical": round(float(stats.norm.cdf(70, mu, std)), 4),
            "description": "Probability of selecting a developing player.",
            "color": "#FF3B30"
        },
        {
            "label": "P(Age < 23)",
            "empirical": round(p_age_lt23, 4),
            "theoretical": round(float(stats.norm.cdf(23, float(f_df['age'].mean()), float(f_df['age'].std()))), 4),
            "description": "Probability of selecting a young talent prospect.",
            "color": "#00FF88"
        },
        {
            "label": "P(Wage > 100k)",
            "empirical": round(p_wage_gt100k, 4),
            "theoretical": round(float(1 - stats.norm.cdf(100000, float(f_df['wage_eur'].mean()), float(f_df['wage_eur'].std()))), 4),
            "description": "Probability of a top earner (wage > \u20ac100k/week).",
            "color": "#BF5FFF"
        },
        {
            "label": "P(OVR \u2265 80 AND Age < 25)",
            "empirical": round(p_future_star, 4),
            "theoretical": 0.0,
            "description": "Future Star: high-rated & young. Empirical only (joint event).",
            "color": "#FF9F1C"
        },
    ]

    # Empirical vs Theoretical comparison (for grouped bar chart)
    comparison = [
        {"event": "OVR \u2265 85", "empirical": float(prob_cards[0]['empirical']), "theoretical": float(prob_cards[0]['theoretical'])},
        {"event": "OVR \u2265 80", "empirical": float(prob_cards[1]['empirical']), "theoretical": float(prob_cards[1]['theoretical'])},
        {"event": "OVR < 70", "empirical": float(prob_cards[2]['empirical']), "theoretical": float(prob_cards[2]['theoretical'])},
        {"event": "Age < 23", "empirical": float(prob_cards[3]['empirical']), "theoretical": float(prob_cards[3]['theoretical'])},
    ]

    # Shapiro-Wilk normality test — 200-sample subset (reproducible)
    sample_size = min(200, len(ovr))
    sw_stat, sw_pval = stats.shapiro(ovr.sample(sample_size, random_state=42))
    shapiro = {
        "statistic": float(sw_stat),
        "p_value": float(sw_pval),
        "result": "Normal" if sw_pval > 0.05 else "Not Normal"
    }

    return {
        "normal": normal,
        "binomial": binomial,
        "poisson": poisson,
        "zscore": zscore_data,
        "cdf": cdf,
        "prob_cards": prob_cards,
        "shapiro": shapiro,
        "comparison": comparison
    }

@app.get("/api/regression")
def get_regression(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None), age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None), ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if len(f_df) < 20: return {"error": "Insufficient data"}
    
    features = ['age', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    rdf = f_df[features + ['overall']].dropna()
    X = rdf[features]
    y = rdf['overall']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = LinearRegression().fit(X_train, y_train)
    y_pred = model.predict(X_test)
    
    # Metrics
    metrics = {
        "r2": round(float(r2_score(y_test, y_pred)), 4),
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "rmse": round(float(math.sqrt(mean_squared_error(y_test, y_pred))), 4),
        "train_size": len(X_train)
    }
    
    # Actual vs Pred
    actual_vs_pred = [{"actual": float(a), "predicted": float(p)} for a, p in zip(y_test[:400], y_pred[:400])]
    
    # Coefficients
    coefficients = [{"feature": f, "value": float(c)} for f, c in zip(features, model.coef_)]
    coefficients = sorted(coefficients, key=lambda x: x['value'])
    
    # Residuals
    residuals = y_test - y_pred
    res_counts, res_bins = np.histogram(residuals, bins=40)
    res_centers = (res_bins[:-1] + res_bins[1:]) / 2
    residuals_hist = {"labels": res_centers.tolist(), "values": res_counts.tolist()}
    
    residuals_scatter = [{"predicted": float(p), "residual": float(r)} for p, r in zip(y_pred[:400], residuals[:400])]
    
    # Equation
    equation = {
        "intercept": float(model.intercept_),
        "terms": [{"feature": f, "coef": float(c)} for f, c in zip(features, model.coef_)]
    }
    
    # Feature ranges for prediction
    feature_ranges = {f: {"min": float(X[f].min()), "max": float(X[f].max()), "mean": float(X[f].mean())} for f in features}
    
    return {
        "metrics": metrics,
        "actual_vs_pred": actual_vs_pred,
        "coefficients": coefficients,
        "residuals_hist": residuals_hist,
        "residuals_scatter": residuals_scatter,
        "equation": equation,
        "feature_ranges": feature_ranges
    }

class PredictionRequest(BaseModel):
    age: float
    pace: float
    shooting: float
    passing: float
    dribbling: float
    defending: float
    physic: float

@app.post("/api/predict")
def predict_overall(body: PredictionRequest):
    if df is None: return {"error": "Data not loaded"}
    
    features = ['age', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    rdf = df[features + ['overall']].dropna()
    X = rdf[features]
    y = rdf['overall']
    model = LinearRegression().fit(X, y)
    
    input_data = pd.DataFrame([[body.age, body.pace, body.shooting, body.passing, body.dribbling, body.defending, body.physic]], columns=features)
    predicted = model.predict(input_data)[0]
    
    tier = "DEVELOPING"
    color = "#F0F4F8"
    if predicted >= 87:
        tier, color = "WORLD CLASS", "#FFD60A"
    elif predicted >= 83:
        tier, color = "ELITE", "#00D4FF"
    elif predicted >= 78:
        tier, color = "VERY GOOD", "#00FF88"
    elif predicted >= 73:
        tier, color = "GOOD", "#FF9F1C"
        
    return {
        "predicted": round(float(predicted), 1),
        "tier": tier,
        "color": color
    }

@app.get("/api/players")
def get_players():
    """Return top 500 players by overall for comparison dropdowns."""
    if df is None: return {"players": []}
    top_df = df.nlargest(500, 'overall')
    players_list = (top_df['short_name'] + " — " + top_df['club_name'] + " (OVR " + top_df['overall'].astype(str) + ")").dropna().unique().tolist()
    return {"players": sorted(players_list)}

@app.get("/api/player/search")
def search_player(q: str):
    if df is None or not q: return []
    res = df[df['short_name'].str.contains(q, case=False, na=False)].head(15)
    
    matches = []
    # Pre-calculate global stats for Z-scores
    stats_dict = {}
    radar_features = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    for feat in radar_features:
        stats_dict[feat] = {
            "mean": float(df[feat].mean()),
            "std": float(df[feat].std())
        }

    for _, row in res.iterrows():
        matches.append({
            "label": f"{row['short_name']} — {row['club_name']} (OVR {row['overall']})",
            "short_name": row['short_name'],
            "overall": int(row['overall']),
            "potential": int(row['potential']),
            "age": int(row['age']),
            "positions": row['player_positions'],
            "nationality": row['nationality_name'],
            "club": row['club_name'],
            "league": row['league_name'],
            "value": float(row['value_millions']),
            "wage": float(row['wage_eur']),
            "foot": row['preferred_foot'],
            "reputation": int(row['international_reputation']),
            "skill_moves": int(row['skill_moves']),
            "is_gk": str(row['player_positions']).startswith("GK"),
            "radar_cats": ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physic'],
            "radar_vals": [int(row['pace']), int(row['shooting']), int(row['passing']), int(row['dribbling']), int(row['defending']), int(row['physic'])],
            "global_stats": stats_dict
        })
    return matches

class CompareRequest(BaseModel):
    label1: str
    label2: str

@app.post("/api/compare")
def compare_players(body: CompareRequest):
    if df is None: return {"error": "Data not loaded"}
    
    def parse_name(label):
        return label.split(" — ")[0]
    
    name1 = parse_name(body.label1)
    name2 = parse_name(body.label2)
    
    match1 = df[df['short_name'] == name1].head(1)
    match2 = df[df['short_name'] == name2].head(1)
    
    if match1.empty or match2.empty: return {"error": "Player not found"}
    
    def extract_info(row):
        return {
            "short_name": row['short_name'].values[0],
            "overall": int(row['overall'].values[0]),
            "potential": int(row['potential'].values[0]),
            "age": int(row['age'].values[0]),
            "value": float(row['value_millions'].values[0]),
            "wage": float(row['wage_eur'].values[0]),
            "pace": int(row['pace'].values[0]),
            "shooting": int(row['shooting'].values[0]),
            "passing": int(row['passing'].values[0]),
            "dribbling": int(row['dribbling'].values[0]),
            "defending": int(row['defending'].values[0]),
            "physic": int(row['physic'].values[0])
        }
        
    p1 = extract_info(match1)
    p2 = extract_info(match2)
    
    attrs = ['overall', 'potential', 'age', 'value', 'wage', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physic']
    return {
        "p1": p1,
        "p2": p2,
        "bar_attrs": attrs,
        "bar_p1": [p1[a] for a in attrs],
        "bar_p2": [p2[a] for a in attrs]
    }

@app.get("/api/dataset")
def get_dataset(
    leagues: Optional[List[str]] = Query(None),
    pos_groups: Optional[List[str]] = Query(None),
    age_min: Optional[int] = Query(None), age_max: Optional[int] = Query(None),
    ovr_min: Optional[int] = Query(None), ovr_max: Optional[int] = Query(None),
    foot: Optional[List[str]] = Query(None)
):
    """
    Dataset Explorer endpoint.
    Returns up to 500 rows with rich player info + summary stats for the dataset page.
    All calculations (summary) use the full filtered dataset.
    """
    f_df = get_filtered_df(leagues, pos_groups, age_min, age_max, ovr_min, ovr_max, foot)
    if f_df.empty: return {"error": "No players match the current filters."}

    # Summary KPIs from full dataset
    summary = {
        "total_players": len(f_df),
        "avg_overall":   round(float(f_df['overall'].mean()), 1),
        "avg_age":       round(float(f_df['age'].mean()), 1),
        "avg_wage":      round(float(f_df['wage_eur'].mean()), 0),
        "avg_value_m":   round(float(f_df['value_millions'].mean()), 2),
        "top_league":    f_df['league_name'].mode()[0] if not f_df['league_name'].empty else "N/A",
        "top_nationality": f_df['nationality_name'].mode()[0] if not f_df['nationality_name'].empty else "N/A",
        "pos_breakdown": f_df['pos_group'].value_counts().to_dict()
    }

    # 500-row sample for table display
    cols = [
        'short_name', 'overall', 'potential', 'age',
        'player_positions', 'pos_group', 'nationality_name',
        'club_name', 'league_name', 'preferred_foot',
        'wage_eur', 'value_millions', 'pace', 'shooting',
        'passing', 'dribbling', 'defending', 'physic'
    ]
    sample = f_df[cols].head(500).fillna("").copy()
    sample['value_millions'] = sample['value_millions'].round(2)
    sample['wage_eur'] = sample['wage_eur'].astype(int)
    rows = sample.to_dict('records')

    return {
        "summary": summary,
        "rows": rows,
        "total_shown": len(rows)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
