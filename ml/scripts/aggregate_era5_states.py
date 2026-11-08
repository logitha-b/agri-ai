# Aggregate ERA5-Land monthly temperature and precipitation to
# state-level seasonal averages for lac-producing states.
#
# Method:
#   1. Load GADM India district boundaries (gadm41_IND_2.json)
#   2. For each ERA5 grid cell, determine which state it falls in
#      using point-in-polygon (centroid of each 0.1deg cell)
#   3. Average all grid cells within each state for each month/year
#   4. Aggregate monthly state averages to seasonal windows
#
# Seasonal windows (calendar year basis):
#   pre_monsoon  = Mar, Apr, May   (months 3-5)
#   monsoon      = Jun, Jul, Aug, Sep (months 6-9)
#   post_monsoon = Oct, Nov        (months 10-11)
#   winter       = Dec, Jan, Feb   (months 12, 1, 2 of NEXT year)
#   annual       = all 12 months
#
# Financial year note:
#   Lac year "2012-13" = Apr 2012 to Mar 2013
#   We align climate to start_year (e.g. 2012) using:
#     pre_monsoon  -> start_year (Mar-May 2012 before kharif inoculation)
#     monsoon      -> start_year (Jun-Sep 2012 brood development)
#     post_monsoon -> start_year (Oct-Nov 2012 katki harvest)
#     winter       -> start_year+1 (Dec 2012 - Feb 2013 kusmi harvest)
#
# Output: ml/data/processed/era5_state_season_averages.csv

import sys, json
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

import numpy as np
import netCDF4 as nc
import geopandas as gpd
from shapely.geometry import Point

sys.stdout.reconfigure(encoding='utf-8')

ROOT     = Path(__file__).resolve().parents[2]
T_FILE   = ROOT / 'data_stream-moda.nc'
P_FILE   = ROOT / 'era5_precip_india_2005_2020.nc'
GADM     = ROOT / 'gadm41_IND_2.json'
OUT      = ROOT / 'ml' / 'data' / 'processed' / 'era5_state_season_averages.csv'
OUT.parent.mkdir(parents=True, exist_ok=True)

# Lac-producing states — must match names in lac_production_state_year.csv
LAC_STATES = [
    'Jharkhand', 'Chhattisgarh', 'Madhya Pradesh', 'Maharashtra',
    'West Bengal', 'Odisha', 'Assam', 'Andhra Pradesh',
    'Uttar Pradesh', 'Gujarat', 'Meghalaya',
]

# Seasonal windows: name -> list of month numbers
SEASONS = {
    'pre_monsoon':  [3, 4, 5],
    'monsoon':      [6, 7, 8, 9],
    'post_monsoon': [10, 11],
    'winter':       [12, 1, 2],   # Dec of year Y, Jan+Feb of year Y+1
    'annual':       list(range(1, 13)),
}

# ── Step 1: Load GADM and build state geometries ─────────────────────────────
print("Loading GADM boundaries...")
with open(GADM, encoding='utf-8') as f:
    gj = json.load(f)

# Build a mapping from normalised state name -> union of district polygons
# GADM NAME_1 has no spaces: 'MadhyaPradesh', 'WestBengal', etc.
# We need to match to our lac state names.
STATE_NAME_MAP = {
    'AndhraPradesh':    'Andhra Pradesh',
    'Assam':            'Assam',
    'Chhattisgarh':     'Chhattisgarh',
    'Gujarat':          'Gujarat',
    'Jharkhand':        'Jharkhand',
    'MadhyaPradesh':    'Madhya Pradesh',
    'Maharashtra':      'Maharashtra',
    'Meghalaya':        'Meghalaya',
    'Odisha':           'Odisha',
    'Telangana':        'Andhra Pradesh',  # merged with AP for consistency
    'UttarPradesh':     'Uttar Pradesh',
    'WestBengal':       'West Bengal',
}

# Load as GeoDataFrame, dissolve to state level
gdf = gpd.GeoDataFrame.from_features(gj['features'], crs='EPSG:4326')
gdf['state_std'] = gdf['NAME_1'].map(STATE_NAME_MAP)
gdf = gdf[gdf['state_std'].notna()]
states_gdf = gdf.dissolve(by='state_std').reset_index()[['state_std', 'geometry']]
states_gdf = states_gdf[states_gdf['state_std'].isin(LAC_STATES)]
print(f"  States loaded: {sorted(states_gdf['state_std'].tolist())}")

# ── Step 2: Build grid-cell to state lookup ───────────────────────────────────
print("Building ERA5 grid-cell → state mapping (this takes ~1-2 min)...")
ds_t   = nc.Dataset(str(T_FILE))
lat    = ds_t.variables['latitude'][:]
lon    = ds_t.variables['longitude'][:]

# Build point GeoDataFrame for every grid cell in the India bounding box
# lat: 6-37 (311 points), lon: 66-98 (321 points) => 99,831 cells
# We only need cells that fall in our target states
print(f"  Grid size: {len(lat)} lat x {len(lon)} lon = {len(lat)*len(lon):,} cells")

lat_idx_arr = np.arange(len(lat))
lon_idx_arr = np.arange(len(lon))
LON2D, LAT2D = np.meshgrid(lon_idx_arr, lat_idx_arr)  # shape (311, 321)

# Flatten to points
flat_lat_i = LAT2D.ravel()
flat_lon_i = LON2D.ravel()
flat_lat_v = np.array(lat)[flat_lat_i]
flat_lon_v = np.array(lon)[flat_lon_i]

points_gdf = gpd.GeoDataFrame(
    {'lat_i': flat_lat_i, 'lon_i': flat_lon_i},
    geometry=[Point(x, y) for x, y in zip(flat_lon_v, flat_lat_v)],
    crs='EPSG:4326'
)

# Spatial join: which state does each grid cell fall in?
joined = gpd.sjoin(points_gdf, states_gdf, how='left', predicate='within')
joined = joined[joined['state_std'].notna()]
print(f"  Grid cells matched to lac states: {len(joined):,}")

# Build dict: state -> list of (lat_i, lon_i)
state_cells = defaultdict(list)
for _, row in joined.iterrows():
    state_cells[row['state_std']].append((int(row['lat_i']), int(row['lon_i'])))

for s in LAC_STATES:
    print(f"  {s:25s}: {len(state_cells[s]):4d} cells")

# ── Step 3: Extract monthly state-mean temperature and precipitation ──────────
print("\nExtracting monthly ERA5 values per state...")

# Parse time axis for both files
def parse_times(ds):
    tvar  = ds.variables['valid_time']
    times = [datetime.fromtimestamp(int(t), tz=timezone.utc) for t in tvar[:]]
    return times

times_t = parse_times(ds_t)
ds_p    = nc.Dataset(str(P_FILE))
times_p = parse_times(ds_p)

t2m_var = ds_t.variables['t2m']   # Kelvin
tp_var  = ds_p.variables['tp']    # metres (monthly accumulated)

# Days in each month (ERA5 monthly tp is total for the month in metres)
import calendar

# Build monthly records: {(year, month, state): {temp_c, precip_mm}}
monthly = {}  # key: (year, month, state)

# Temperature
print("  Processing temperature...")
for ti, dt in enumerate(times_t):
    yr, mo = dt.year, dt.month
    for state, cells in state_cells.items():
        if not cells:
            continue
        vals = [float(t2m_var[ti, li, xi]) for li, xi in cells]
        mean_k = np.mean(vals)
        mean_c = mean_k - 273.15
        key = (yr, mo, state)
        if key not in monthly:
            monthly[key] = {}
        monthly[key]['temp_c'] = round(mean_c, 3)

# Precipitation
print("  Processing precipitation...")
for ti, dt in enumerate(times_p):
    yr, mo = dt.year, dt.month
    days_in_month = calendar.monthrange(yr, mo)[1]
    for state, cells in state_cells.items():
        if not cells:
            continue
        vals = [float(tp_var[ti, li, xi]) for li, xi in cells]
        mean_m_per_day = np.mean(vals)
        # ERA5 monthly tp is total monthly precipitation in metres
        # (not per day — ERA5-Land monthly means for tp are already monthly totals)
        mean_mm = mean_m_per_day * 1000  # convert m to mm
        key = (yr, mo, state)
        if key not in monthly:
            monthly[key] = {}
        monthly[key]['precip_mm'] = round(mean_mm, 2)

ds_t.close()
ds_p.close()

print(f"  Monthly records: {len(monthly):,}")

# ── Step 4: Aggregate to seasonal windows ────────────────────────────────────
print("\nAggregating to seasonal windows...")

# For each lac start_year (2012-2018) and state, compute seasonal stats
# pre_monsoon/monsoon/post_monsoon -> start_year
# winter -> Dec of start_year + Jan/Feb of start_year+1

rows = []
for start_year in range(2005, 2021):
    for state in LAC_STATES:
        row = {
            'start_year': start_year,
            'state':      state,
        }

        for season_name, months in SEASONS.items():
            temps    = []
            precips  = []

            for mo in months:
                # winter: Dec belongs to start_year, Jan/Feb to start_year+1
                if season_name == 'winter':
                    yr = start_year + 1 if mo in [1, 2] else start_year
                else:
                    yr = start_year

                key = (yr, mo, state)
                if key in monthly:
                    rec = monthly[key]
                    if 'temp_c'    in rec: temps.append(rec['temp_c'])
                    if 'precip_mm' in rec: precips.append(rec['precip_mm'])

            row[f'{season_name}_temp_mean_c']   = round(float(np.mean(temps)),   3) if temps   else ''
            row[f'{season_name}_temp_max_c']    = round(float(np.max(temps)),    3) if temps   else ''
            row[f'{season_name}_temp_min_c']    = round(float(np.min(temps)),    3) if temps   else ''
            row[f'{season_name}_precip_sum_mm'] = round(float(np.sum(precips)),  2) if precips else ''
            row[f'{season_name}_precip_mean_mm']= round(float(np.mean(precips)), 2) if precips else ''

        rows.append(row)

print(f"  Seasonal records: {len(rows)}")

# ── Step 5: Write CSV ─────────────────────────────────────────────────────────
import csv

fieldnames = ['start_year', 'state']
for s in SEASONS:
    fieldnames += [
        f'{s}_temp_mean_c', f'{s}_temp_max_c', f'{s}_temp_min_c',
        f'{s}_precip_sum_mm', f'{s}_precip_mean_mm',
    ]

with open(OUT, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"\nWritten: {OUT}")
print(f"Rows: {len(rows)}  ({len(set(r['start_year'] for r in rows))} years x {len(LAC_STATES)} states)")

# ── Step 6: Quick sanity check ───────────────────────────────────────────────
print("\n=== Sanity check — Jharkhand 2012 seasonal climate ===")
jh_2012 = next(r for r in rows if r['start_year'] == 2012 and r['state'] == 'Jharkhand')
for s in SEASONS:
    temp  = jh_2012[f'{s}_temp_mean_c']
    prec  = jh_2012[f'{s}_precip_sum_mm']
    print(f"  {s:15s}: temp={temp}°C  precip={prec}mm")

print("\nDone. ERA5 state-season aggregation complete.")
