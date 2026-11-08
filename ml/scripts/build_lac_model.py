# BioAsset Intelligence — Lac + Rice ML pipeline
# Steps 3-6: join datasets, build models, evaluate, SHAP explain
#
# MODEL DESIGN:
#   Target  : total_t  (state-level annual sticklac, tonnes)
#   Features: ERA5 seasonal temp + precip per state
#   Validation: Leave-One-Year-Out (LOYO) — no random splits on temporal data
#   Two models: M1 climate-only, M2 climate + lag-1 production
#
# Honest constraints stated in output JSON.

import sys, json, datetime, warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

from sklearn.base            import clone
from sklearn.ensemble        import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model    import Ridge
from sklearn.preprocessing   import StandardScaler
from sklearn.pipeline        import Pipeline
from sklearn.metrics         import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import LeaveOneGroupOut
import shap

warnings.filterwarnings('ignore')
sys.stdout.reconfigure(encoding='utf-8')

ROOT     = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / 'ml' / 'data' / 'processed'
OUT_DIR  = ROOT / 'ml' / 'metadata'
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Model definitions (defined once, cloned per fold) ─────────────────────────
def make_models():
    return {
        'Ridge': Pipeline([('sc', StandardScaler()), ('r', Ridge(alpha=10.0))]),
        'RF':    RandomForestRegressor(n_estimators=200, max_depth=4,
                                       min_samples_leaf=3, random_state=42),
        'GBM':   GradientBoostingRegressor(n_estimators=200, max_depth=3,
                                           learning_rate=0.05, subsample=0.8,
                                           min_samples_leaf=3, random_state=42),
    }

# ── LOYO evaluation helper ────────────────────────────────────────────────────
def loyo_evaluate(df_in, feat_cols, target, year_col, label):
    logo   = LeaveOneGroupOut()
    groups = df_in[year_col].values
    X_all  = df_in[feat_cols].copy()
    y_all  = df_in[target].values

    preds_all = {n: [] for n in ['Ridge','RF','GBM']}
    y_true_all = []

    for tr, te in logo.split(X_all, y_all, groups=groups):
        Xtr, Xte = X_all.iloc[tr].copy(), X_all.iloc[te].copy()
        ytr = y_all[tr]

        # Impute with train-set median (no leakage)
        for col in feat_cols:
            med = Xtr[col].median()
            Xtr[col] = Xtr[col].fillna(med)
            Xte[col] = Xte[col].fillna(med)

        for name, mdl in make_models().items():
            m = clone(mdl)
            m.fit(Xtr, ytr)
            preds_all[name].extend(m.predict(Xte).tolist())

        y_true_all.extend(y_all[te].tolist())

    print(f"\n  [{label}]  n={len(y_true_all)}")
    metrics = {}
    for name in preds_all:
        yt = np.array(y_true_all)
        yp = np.array(preds_all[name])
        mae  = mean_absolute_error(yt, yp)
        rmse = np.sqrt(mean_squared_error(yt, yp))
        r2   = r2_score(yt, yp)
        mape = np.mean(np.abs((yt - yp) / np.where(np.abs(yt) < 1, 1, yt))) * 100
        print(f"    {name:6s}  MAE={mae:7.0f}  RMSE={rmse:7.0f}  R²={r2:+.3f}  MAPE={mape:.1f}%")
        metrics[name] = {'MAE': round(mae,1), 'RMSE': round(rmse,1),
                         'R2': round(r2,3),  'MAPE': round(mape,1)}

    return {'y_true': y_true_all, 'y_pred': preds_all}, metrics


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — JOIN
# ══════════════════════════════════════════════════════════════════════════════
print("=" * 65)
print("STEP 3 — Join lac production + ERA5 climate")
print("=" * 65)

lac = pd.read_csv(DATA_DIR / 'lac_production_state_year.csv')
era = pd.read_csv(DATA_DIR / 'era5_state_season_averages.csv')

df = lac.merge(era, on=['start_year', 'state'], how='inner')
df = df.sort_values(['state', 'start_year']).reset_index(drop=True)
df['lag1_total_t'] = df.groupby('state')['total_t'].shift(1)
df['state_code']   = pd.factorize(df['state'])[0]
df = df.dropna(subset=['total_t'])

print(f"  Rows: {len(df)}  Years: {sorted(df['start_year'].unique())}  States: {df['state'].nunique()}")

# Build feature list from ERA5 columns actually present
SEASONS   = ['pre_monsoon', 'monsoon', 'post_monsoon', 'winter', 'annual']
CLIM_FEAT = []
for s in SEASONS:
    for metric in ['temp_mean_c', 'temp_max_c', 'precip_sum_mm']:
        col = f'{s}_{metric}'
        if col in df.columns:
            CLIM_FEAT.append(col)

# Drop cols with >50% missing
miss = df[CLIM_FEAT].isna().mean()
CLIM_FEAT = [c for c in CLIM_FEAT if miss[c] < 0.50]
ALL_FEAT  = CLIM_FEAT + ['state_code']
LAG_FEAT  = CLIM_FEAT + ['lag1_total_t', 'state_code']

print(f"  Climate features: {len(CLIM_FEAT)}")
print(f"  Sample features : {CLIM_FEAT[:4]}")

df.to_csv(DATA_DIR / 'lac_model_dataset.csv', index=False)
print(f"  Saved: {DATA_DIR / 'lac_model_dataset.csv'}")


# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — LAC MODELS
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 65)
print("STEP 4 — Lac LOYO cross-validation")
print("=" * 65)

res_clim, met_clim = loyo_evaluate(df, ALL_FEAT, 'total_t', 'start_year',
                                   'M1 Climate-only (all states)')

df_lag = df.dropna(subset=['lag1_total_t']).copy()
res_lag, met_lag   = loyo_evaluate(df_lag, LAG_FEAT, 'total_t', 'start_year',
                                   'M2 Lag-enhanced  (states with lag)')


# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — RICE DISTRICT MODEL
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 65)
print("STEP 5 — Rice district-year model (ICRISAT 1978-2017)")
print("=" * 65)

RICE_STATES = ['Jharkhand','Chhattisgarh','Madhya Pradesh','Maharashtra',
               'West Bengal','Orissa','Bihar','Uttar Pradesh',
               'Andhra Pradesh','Gujarat','Assam']

rice_raw = pd.read_csv(ROOT / 'ml' / 'data' / 'raw' / 'icrisat_crop_production.csv')
rice = rice_raw[rice_raw['State Name'].isin(RICE_STATES)].copy()
rice = rice.rename(columns={
    'Year': 'year', 'State Name': 'state', 'Dist Name': 'district',
    'RICE PRODUCTION (1000 tons)': 'rice_prod_kt',
    'RICE AREA (1000 ha)': 'rice_area_kha',
    'RICE YIELD (Kg per ha)': 'rice_yield_kg_ha',
})
rice = rice[['year','state','district','rice_prod_kt','rice_area_kha','rice_yield_kg_ha']]
rice = rice.dropna(subset=['rice_yield_kg_ha'])
rice = rice[rice['rice_yield_kg_ha'] > 0]
rice['year'] = rice['year'].astype(int)

# Join ERA5 (overlap 2005-2017)
era_r = era.rename(columns={'start_year':'year'})
# Normalise state names for join (ICRISAT uses 'Orissa' not 'Odisha')
era_r['state'] = era_r['state'].replace({'Odisha': 'Orissa'})
rice_m = rice[rice['year'] >= 2005].merge(era_r, on=['year','state'], how='inner')
rice_m['district_code'] = pd.factorize(rice_m['state'] + '|' + rice_m['district'])[0]
rice_m['state_code']    = pd.factorize(rice_m['state'])[0]

print(f"  Rows with ERA5: {len(rice_m)}  Years: {rice_m['year'].nunique()}  States: {rice_m['state'].nunique()}")

# Use only climate features available in rice dataset
R_CLIM = [c for c in CLIM_FEAT if c in rice_m.columns]
R_FEAT = R_CLIM + ['state_code', 'district_code']

print(f"  Rice features  : {len(R_FEAT)}")

res_rice, met_rice = loyo_evaluate(rice_m, R_FEAT, 'rice_yield_kg_ha', 'year',
                                   'Rice yield kg/ha — LOYO')


# ══════════════════════════════════════════════════════════════════════════════
# STEP 6 — SHAP EXPLAINABILITY
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 65)
print("STEP 6 — SHAP feature importance (RF on full lac dataset)")
print("=" * 65)

X_sh = df[ALL_FEAT].copy()
for col in CLIM_FEAT:
    X_sh[col] = X_sh[col].fillna(X_sh[col].median())
y_sh = df['total_t'].values

rf_full = RandomForestRegressor(n_estimators=300, max_depth=4,
                                 min_samples_leaf=3, random_state=42)
rf_full.fit(X_sh, y_sh)
print(f"  RF trained on {len(X_sh)} observations  ({len(ALL_FEAT)} features)")

explainer   = shap.TreeExplainer(rf_full)
shap_vals   = explainer.shap_values(X_sh)
mean_shap   = np.abs(shap_vals).mean(axis=0)

shap_df = pd.DataFrame({'feature': ALL_FEAT, 'mean_abs_shap': mean_shap})\
            .sort_values('mean_abs_shap', ascending=False).reset_index(drop=True)

print("\n  Top 10 features by mean |SHAP|:")
for _, row in shap_df.head(10).iterrows():
    bar = chr(9608) * int(row['mean_abs_shap'] / shap_df['mean_abs_shap'].max() * 28)
    print(f"    {row['feature']:38s}  {row['mean_abs_shap']:7.1f}  {bar}")

shap_df.to_csv(OUT_DIR / 'lac_shap_importance.csv', index=False)
print(f"\n  Saved: {OUT_DIR / 'lac_shap_importance.csv'}")


# ══════════════════════════════════════════════════════════════════════════════
# CHARTS
# ══════════════════════════════════════════════════════════════════════════════
print("\nGenerating charts...")
pdf_path = OUT_DIR / 'lac_model_results.pdf'

with PdfPages(str(pdf_path)) as pdf:

    # 1. Production time series — top 5 states
    fig, ax = plt.subplots(figsize=(11, 5))
    palette = ['#2d6a4f','#74c69d','#f4a261','#e76f51','#264653']
    top5    = ['Jharkhand','Chhattisgarh','Madhya Pradesh','Maharashtra','West Bengal']
    for state, col in zip(top5, palette):
        sub = df[df['state']==state].sort_values('start_year')
        ax.plot(sub['start_year'], sub['total_t']/1000,
                marker='o', label=state, color=col, linewidth=2.2)
    ax.set_xlabel('Year (start of financial year)')
    ax.set_ylabel('Sticklac production (000 tonnes)')
    ax.set_title('Lac Production by State  2012–2018\nSource: ICAR-IINRG Statistics Bulletins')
    ax.legend(fontsize=9); ax.grid(axis='y', alpha=0.3)
    fig.tight_layout(); pdf.savefig(fig); plt.close(fig)

    # 2. National total vs Jharkhand monsoon rainfall
    nat = df.groupby('start_year')['total_t'].sum().reset_index()
    jh  = df[df['state']=='Jharkhand'].sort_values('start_year')
    if 'monsoon_precip_sum_mm' in jh.columns:
        fig, ax1 = plt.subplots(figsize=(10, 4))
        ax2 = ax1.twinx()
        ax1.bar(nat['start_year'], nat['total_t']/1000, color='#74c69d', alpha=0.7,
                label='National production (000t)')
        ax2.plot(jh['start_year'], jh['monsoon_precip_sum_mm'], color='#1d6fa4',
                 marker='s', linewidth=2, label='Jharkhand monsoon rain (mm)')
        ax1.set_xlabel('Year'); ax1.set_ylabel('National lac (000 t)', color='#2d6a4f')
        ax2.set_ylabel('Monsoon precip mm (Jharkhand)', color='#1d6fa4')
        ax1.set_title('National Lac Production vs Jharkhand Monsoon Rainfall')
        h1,l1 = ax1.get_legend_handles_labels()
        h2,l2 = ax2.get_legend_handles_labels()
        ax1.legend(h1+h2, l1+l2, fontsize=9)
        fig.tight_layout(); pdf.savefig(fig); plt.close(fig)

    # 3. SHAP bar
    top12 = shap_df.head(12)
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.barh(top12['feature'][::-1], top12['mean_abs_shap'][::-1],
            color='#2d6a4f', alpha=0.8)
    ax.set_xlabel('Mean |SHAP value| (tonnes)')
    ax.set_title('Feature Importance — Random Forest Lac Model\nSHAP TreeExplainer, full dataset')
    ax.grid(axis='x', alpha=0.3)
    fig.tight_layout(); pdf.savefig(fig); plt.close(fig)

    # 4. LOYO actual vs predicted  (M1 RF)
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    for ax, res, title in zip(axes,
        [res_clim, res_lag],
        ['M1 Climate-only (RF)','M2 Lag-enhanced (RF)']):
        yt = np.array(res['y_true']); yp = np.array(res['y_pred']['RF'])
        ax.scatter(yt/1000, yp/1000, alpha=0.6, color='#2d6a4f', s=45)
        lim = [min(yt.min(),yp.min())/1000*0.9, max(yt.max(),yp.max())/1000*1.05]
        ax.plot(lim, lim, 'r--', lw=1, label='Perfect fit')
        ax.set_xlabel('Actual (000 t)'); ax.set_ylabel('Predicted (000 t)')
        ax.set_title(f'{title}\nR²={r2_score(yt,yp):+.3f}  MAE={mean_absolute_error(yt,yp):.0f}t')
        ax.legend(fontsize=8); ax.grid(alpha=0.3)
    fig.suptitle('LOYO Cross-Validation: Actual vs Predicted Lac Production',
                 fontsize=10, fontweight='bold')
    fig.tight_layout(); pdf.savefig(fig); plt.close(fig)

    # 5. SHAP dependence — top feature
    top_feat = shap_df.iloc[0]['feature']
    if top_feat in X_sh.columns:
        top_i = list(ALL_FEAT).index(top_feat)
        fig, ax = plt.subplots(figsize=(8, 5))
        sc = ax.scatter(X_sh[top_feat], shap_vals[:, top_i],
                        c=y_sh/1000, cmap='RdYlGn', alpha=0.7, s=50)
        plt.colorbar(sc, ax=ax, label='Actual production (000 t)')
        ax.axhline(0, color='gray', lw=0.8, ls='--')
        ax.set_xlabel(top_feat.replace('_',' '))
        ax.set_ylabel('SHAP value (impact on prediction)')
        ax.set_title(f'SHAP Dependence — {top_feat}')
        fig.tight_layout(); pdf.savefig(fig); plt.close(fig)

print(f"  Saved: {pdf_path}")


# ══════════════════════════════════════════════════════════════════════════════
# SAVE METADATA JSON
# ══════════════════════════════════════════════════════════════════════════════
eval_doc = {
    'generated': datetime.datetime.now().isoformat(),
    'dataset': {
        'rows': int(len(df)),
        'years': sorted(int(y) for y in df['start_year'].unique()),
        'states': sorted(df['state'].unique().tolist()),
        'n_climate_features': len(CLIM_FEAT),
        'validation': 'Leave-One-Year-Out (LOYO)',
    },
    'M1_climate_only': met_clim,
    'M2_lag_enhanced': met_lag,
    'rice_model': met_rice,
    'shap_top5': shap_df.head(5)[['feature','mean_abs_shap']]\
                        .round(2).to_dict(orient='records'),
    'honest_caveats': [
        f"Only {len(df)} observations (7 years x 11 states). Results are exploratory.",
        "State-level aggregation hides within-state district variation.",
        "ERA5 is a reanalysis product (~11km grid), not farm-level measurements.",
        "No satellite vegetation features included in this version.",
        "Lac production estimates come from market surveys, not crop-cutting experiments.",
        "LOYO is conservative but year-level effects may inflate apparent R2.",
    ],
}

eval_path = OUT_DIR / 'lac_model_evaluation.json'
with open(eval_path, 'w', encoding='utf-8') as f:
    json.dump(eval_doc, f, indent=2, ensure_ascii=False)
print(f"  Saved: {eval_path}")

print("\n" + "=" * 65)
print("PIPELINE COMPLETE — all 4 steps finished")
print("=" * 65)
print(f"  {DATA_DIR / 'lac_model_dataset.csv'}")
print(f"  {OUT_DIR  / 'lac_shap_importance.csv'}")
print(f"  {OUT_DIR  / 'lac_model_evaluation.json'}")
print(f"  {OUT_DIR  / 'lac_model_results.pdf'}")
