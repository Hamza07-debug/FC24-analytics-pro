# FC24 Analytics Pro

A professional football data analytics dashboard built for a university Probability & Statistics project.

## Features
- **Executive Dashboard**: KPI overview and high-level distribution.
- **Graphical Analysis**: Histogram, Boxplot, Scatter plots, and Correlation Heatmap.
- **Descriptive Stats**: Summary metrics, 95% Confidence Intervals, and Skewness/Kurtosis analysis.
- **Probability Models**: Normal, Binomial, and Poisson distribution modeling with Theoretical vs Empirical comparison.
- **Linear Regression**: Predictive modeling for player overall ratings based on technical attributes.
- **Scouting Hub**: Detailed player profile search and side-by-side comparison with Radar charts.

## Technology Stack
- **Backend**: FastAPI (Python), Pandas, NumPy, SciPy, Scikit-learn.
- **Frontend**: Vanilla HTML, CSS, JavaScript, Chart.js.

## Getting Started

### 1. Prerequisites
- Python 3.8+
- `male_players.csv` dataset in the `backend` folder.

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 3. Frontend Setup
Because the frontend is built with pure HTML/CSS/JS, the FastAPI backend automatically serves it! 
Simply go to:
`http://localhost:8000/frontend/index.html`

---
*Created by Antigravity AI*
