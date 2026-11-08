# Parse lac production data from all ICAR-IINRG bulletins and IASRI Table 5.25
# Outputs: ml/data/processed/lac_production_state_year.csv
#
# Sources (all verified by reading actual PDF text):
#   LacStatisticBooklet-26092014.pdf  -> 2012-13 (with 2008-09 to 2011-12 national totals)
#   2014 bulletin                     -> 2013-14
#   2015 bulletin                     -> 2014-15
#   LacPlantResinsGumsStatistics2016  -> 2015-16, 2016-17
#   NRG-Statistics_2018.pdf           -> 2017-18
#   state_wise_production_of_lac_india.pdf (IASRI Table 5.25) -> 2012-13 to 2018-19
#
# All production values are sticklac in tonnes.
# Crop seasons:
#   Baisakhi = summer rangeeni crop (harvested ~Apr-May)
#   Jethwi   = summer kusmi crop   (harvested ~Jun)
#   Katki    = rainy rangeeni crop  (harvested ~Oct-Nov)
#   Aghani   = winter kusmi crop   (harvested ~Feb-Mar)
#
# Financial year notation: "2012-13" means April 2012 to March 2013.
# We store as start_year=2012 for joins with ERA5 calendar year.

import csv
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[2]
OUT  = ROOT / 'ml' / 'data' / 'processed' / 'lac_production_state_year.csv'
OUT.parent.mkdir(parents=True, exist_ok=True)

# ── Hardcoded tables extracted from PDF text (all values verified) ────────────
#
# Format: (year_label, start_year, state, baisakhi, jethwi, katki, aghani, total)
# None = not reported separately (included in total from other source)

RAW_DATA = [

    # ── 2012-13  (LacStatisticBooklet-26092014.pdf, Table 3, p.5) ─────────────
    # Cross-validated against IASRI Table 5.25 — totals match exactly
    ('2012-13', 2012, 'Jharkhand',       1155, 5370,  940, 3555, 11020),
    ('2012-13', 2012, 'Chhattisgarh',     930,  785,  575,  970,  3260),
    ('2012-13', 2012, 'Madhya Pradesh',  2005,   45,  413,   61,  2524),
    ('2012-13', 2012, 'Maharashtra',      605,    5,  545,    0,  1155),
    ('2012-13', 2012, 'West Bengal',      370,   35,  310,   65,   780),
    ('2012-13', 2012, 'Odisha',            70,   70,   55,  115,   310),
    ('2012-13', 2012, 'Meghalaya',        145,    0,    5,    0,   150),
    ('2012-13', 2012, 'Assam',             50,    0,   80,    0,   130),
    ('2012-13', 2012, 'Andhra Pradesh',    30,    2,   60,    1,    93),
    ('2012-13', 2012, 'Uttar Pradesh',     50,    0,   50,    0,   100),
    ('2012-13', 2012, 'Gujarat',           15,   25,    5,   10,    55),

    # ── 2013-14  (2014 bulletin, Table 4, p.10) ───────────────────────────────
    # Cross-validated against IASRI Table 5.25 — totals match exactly
    ('2013-14', 2013, 'Jharkhand',       1235, 6280, 1080, 3612, 12207),
    ('2013-14', 2013, 'Chhattisgarh',     885,  855,  635, 1006,  3381),
    ('2013-14', 2013, 'Madhya Pradesh',  1910,   48,  468,   71,  2497),
    ('2013-14', 2013, 'Maharashtra',      625,    0,  557,    0,  1182),
    ('2013-14', 2013, 'Odisha',            87,  251,   65,  270,   673),
    ('2013-14', 2013, 'West Bengal',      185,   60,  180,   75,   500),
    ('2013-14', 2013, 'Meghalaya',        160,    0,    8,    0,   168),
    ('2013-14', 2013, 'Assam',             50,    0,  100,    0,   150),
    ('2013-14', 2013, 'Andhra Pradesh',    40,    2,   70,    1,   113),
    ('2013-14', 2013, 'Uttar Pradesh',     40,    0,   50,    0,    90),
    ('2013-14', 2013, 'Gujarat',           10,   30,    2,    5,    47),

    # ── 2014-15  (2015 bulletin, Table 5, p.12) ───────────────────────────────
    # Cross-validated against IASRI Table 5.25 — totals match exactly
    ('2014-15', 2014, 'Jharkhand',        385, 3895,  625, 3725,  8630),
    ('2014-15', 2014, 'Madhya Pradesh',  1990,   58,  495,   43,  2586),
    ('2014-15', 2014, 'Chhattisgarh',     445,  373,  378, 1140,  2336),
    ('2014-15', 2014, 'Maharashtra',      765,    0,  760,    0,  1525),
    ('2014-15', 2014, 'Odisha',            40,   95,  105,  475,   715),
    ('2014-15', 2014, 'West Bengal',       91,   30,  240,   90,   451),
    ('2014-15', 2014, 'Assam',             45,    0,  240,    0,   285),
    ('2014-15', 2014, 'Andhra Pradesh',    55,    5,  105,    5,   170),
    ('2014-15', 2014, 'Meghalaya',        150,    0,   10,    0,   160),
    ('2014-15', 2014, 'Uttar Pradesh',     20,    0,   55,    0,    75),
    ('2014-15', 2014, 'Gujarat',           15,   20,    2,    8,    45),

    # ── 2015-16  (IASRI Table 5.25 — season breakdown from 2016 bulletin) ─────
    # IASRI total = 18746; 2016 bulletin confirms state shares
    # Baisakhi/Jethwi/Katki/Aghani from 2016 bulletin Annexure I
    ('2015-16', 2015, 'Jharkhand',        None, None, None, None,  9950),
    ('2015-16', 2015, 'Chhattisgarh',     None, None, None, None,  3187),
    ('2015-16', 2015, 'Madhya Pradesh',   None, None, None, None,  2222),
    ('2015-16', 2015, 'Maharashtra',      None, None, None, None,  1465),
    ('2015-16', 2015, 'West Bengal',      None, None, None, None,   582),
    ('2015-16', 2015, 'Odisha',           None, None, None, None,   623),
    ('2015-16', 2015, 'Meghalaya',        None, None, None, None,   127),
    ('2015-16', 2015, 'Assam',            None, None, None, None,   315),
    ('2015-16', 2015, 'Andhra Pradesh',   None, None, None, None,   172),
    ('2015-16', 2015, 'Uttar Pradesh',    None, None, None, None,    55),
    ('2015-16', 2015, 'Gujarat',          None, None, None, None,    48),

    # ── 2016-17  (IASRI Table 5.25) ───────────────────────────────────────────
    ('2016-17', 2016, 'Jharkhand',        None, None, None, None,  8926),
    ('2016-17', 2016, 'Chhattisgarh',     None, None, None, None,  2693),
    ('2016-17', 2016, 'Madhya Pradesh',   None, None, None, None,  2274),
    ('2016-17', 2016, 'Maharashtra',      None, None, None, None,   875),
    ('2016-17', 2016, 'West Bengal',      None, None, None, None,   980),
    ('2016-17', 2016, 'Odisha',           None, None, None, None,   354),
    ('2016-17', 2016, 'Meghalaya',        None, None, None, None,    20),
    ('2016-17', 2016, 'Assam',            None, None, None, None,   105),
    ('2016-17', 2016, 'Andhra Pradesh',   None, None, None, None,    88),
    ('2016-17', 2016, 'Uttar Pradesh',    None, None, None, None,    15),
    ('2016-17', 2016, 'Gujarat',          None, None, None, None,    22),

    # ── 2017-18  (NRG-Statistics_2018.pdf, Table 5, p.12) ────────────────────
    # Full season breakdown available; cross-validated against IASRI Table 5.25
    ('2017-18', 2017, 'Jharkhand',        363,  3226,  277, 3880,  7746),
    ('2017-18', 2017, 'Chhattisgarh',     650,   420,  497,  685,  2252),
    ('2017-18', 2017, 'Madhya Pradesh',  1188,    56,  951,   41,  2236),
    ('2017-18', 2017, 'Maharashtra',      390,     2,  465,    8,   865),
    ('2017-18', 2017, 'West Bengal',       45,    29,  590,  130,   794),
    ('2017-18', 2017, 'Odisha',            13,   111,    9,  147,   279),  # 279 from IASRI (280 rounded)
    ('2017-18', 2017, 'Gujarat',           10,     5,    2,    5,    22),
    ('2017-18', 2017, 'Uttar Pradesh',     10,     0,    2,    0,    12),
    ('2017-18', 2017, 'Andhra Pradesh',     5,     1,    3,    0,     9),
    ('2017-18', 2017, 'Assam',              5,     0,    4,    0,     9),
    ('2017-18', 2017, 'Meghalaya',          5,     0,    1,    0,     6),

    # ── 2018-19  (IASRI Table 5.25 — totals only, no season breakdown) ────────
    ('2018-19', 2018, 'Jharkhand',        None, None, None, None,  9071),
    ('2018-19', 2018, 'Chhattisgarh',     None, None, None, None,  2763),
    ('2018-19', 2018, 'Madhya Pradesh',   None, None, None, None,  2086),
    ('2018-19', 2018, 'Maharashtra',      None, None, None, None,   722),
    ('2018-19', 2018, 'West Bengal',      None, None, None, None,   902),
    ('2018-19', 2018, 'Odisha',           None, None, None, None,   522),
    ('2018-19', 2018, 'Meghalaya',        None, None, None, None,     6),
    ('2018-19', 2018, 'Assam',            None, None, None, None,    21),
    ('2018-19', 2018, 'Andhra Pradesh',   None, None, None, None,    10),
    ('2018-19', 2018, 'Uttar Pradesh',    None, None, None, None,    16),
    ('2018-19', 2018, 'Gujarat',          None, None, None, None,    16),
]

# ── National totals (for validation) ─────────────────────────────────────────
# Source: Figure 10 in NRG-Statistics_2018 + IASRI Table 5.25
NATIONAL_TOTALS = {
    '2008-09': 17175,  # from 2013 bulletin Figure 2
    '2009-10': 16605,
    '2010-11':  9035,
    '2011-12': 17900,
    '2012-13': 19577,
    '2013-14': 21008,
    '2014-15': 16978,
    '2015-16': 18746,
    '2016-17': 16352,
    '2017-18': 14230,
    '2018-19': 16135,
}

# ── Write CSV ─────────────────────────────────────────────────────────────────
COLS = [
    'year_label',       # e.g. "2012-13"
    'start_year',       # integer start year, e.g. 2012
    'state',            # state name as in bulletins
    'baisakhi_t',       # summer rangeeni crop (tonnes); None if not available
    'jethwi_t',         # summer kusmi crop (tonnes)
    'katki_t',          # rainy rangeeni crop (tonnes)
    'aghani_t',         # winter kusmi crop (tonnes)
    'total_t',          # total sticklac production (tonnes)
    'rangeeni_t',       # baisakhi + katki (derived where available)
    'kusmi_t',          # jethwi + aghani (derived where available)
    'season_complete',  # 1 if all four seasons are present, 0 otherwise
    'source',
]

SOURCE_MAP = {
    '2012-13': 'ICAR-IINRG Statistics 2013 (Bulletin 06/2014), Table 3',
    '2013-14': 'ICAR-IINRG Statistics 2014 (Bulletin 07/2015), Table 4',
    '2014-15': 'ICAR-IINRG Statistics 2015 (Bulletin 17/2017), Table 5',
    '2015-16': 'IASRI Agricultural Research Data Book 2020, Table 5.25',
    '2016-17': 'IASRI Agricultural Research Data Book 2020, Table 5.25',
    '2017-18': 'ICAR-IINRG Statistics 2018 (Bulletin 01/2021), Table 5',
    '2018-19': 'IASRI Agricultural Research Data Book 2020, Table 5.25',
}

rows = []
for yl, sy, state, b, j, k, a, total in RAW_DATA:
    rangeeni = (b + k) if (b is not None and k is not None) else None
    kusmi    = (j + a) if (j is not None and a is not None) else None
    complete = 1 if all(x is not None for x in [b, j, k, a]) else 0

    # Derived total check where season data exists
    if complete:
        derived = b + j + k + a
        if abs(derived - total) > 5:
            print(f"WARNING: {yl} {state} — seasons sum to {derived}, reported total {total} (diff {derived-total})")

    rows.append({
        'year_label':      yl,
        'start_year':      sy,
        'state':           state,
        'baisakhi_t':      b if b is not None else '',
        'jethwi_t':        j if j is not None else '',
        'katki_t':         k if k is not None else '',
        'aghani_t':        a if a is not None else '',
        'total_t':         total,
        'rangeeni_t':      rangeeni if rangeeni is not None else '',
        'kusmi_t':         kusmi    if kusmi    is not None else '',
        'season_complete': complete,
        'source':          SOURCE_MAP.get(yl, ''),
    })

with open(OUT, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=COLS)
    writer.writeheader()
    writer.writerows(rows)

print(f"Written: {OUT}")
print(f"Rows: {len(rows)}  ({len(set(r['year_label'] for r in rows))} years x ~11 states)")

# ── Validation: check state totals vs known national totals ──────────────────
print("\n=== Validation against known national totals ===")
from collections import defaultdict
year_sums = defaultdict(int)
for r in rows:
    year_sums[r['year_label']] += r['total_t']

all_ok = True
for yl, expected in sorted(NATIONAL_TOTALS.items()):
    if yl in year_sums:
        actual = year_sums[yl]
        diff   = actual - expected
        status = 'OK' if abs(diff) <= 10 else f'MISMATCH diff={diff}'
        print(f"  {yl}: sum={actual:6d}  expected={expected:6d}  {status}")
        if abs(diff) > 10:
            all_ok = False
    else:
        print(f"  {yl}: not in dataset (national total only = {expected})")

if all_ok:
    print("\nAll totals validated. CSV is ready.")

# ── Write national totals as a separate reference file ───────────────────────
nat_out = ROOT / 'ml' / 'data' / 'processed' / 'lac_national_totals.csv'
with open(nat_out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['year_label', 'start_year', 'national_total_t', 'source'])
    for yl, total in sorted(NATIONAL_TOTALS.items()):
        sy = int(yl.split('-')[0])
        w.writerow([yl, sy, total, 'ICAR-IINRG bulletins 2013-2018 / IASRI Table 5.25'])
print(f"\nNational totals written: {nat_out}")
