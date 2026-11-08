import sys
sys.path.insert(0, r'c:\Users\nemol\OneDrive\Desktop\agri')
from backend.imd_rainfall import get_district_rainfall, dataset_info

info = dataset_info()
print('Rows:', info['total_rows'], '| Date range:', info['date_min'], '->', info['date_max'])

tests = [
    ('TAMIL NADU', 'TIRUVALLUR'),
    ('Tamil Nadu', 'Thiruvallur'),
    ('ANDHRA PRADESH', 'KRISHNA'),
    ('MAHARASHTRA', 'PUNE'),
]
for state, dist in tests:
    r = get_district_rainfall(state, dist)
    if r['available']:
        acc = r['accumulated']
        print(f"  OK  {state}/{dist}: {r['latest_date']} daily={r['daily_actual_mm']}mm weekly={r['weekly_actual_mm']}mm acc7={acc['last_7_days_mm']}mm cat={r['daily_category']}")
    else:
        print(f"  MISS {state}/{dist}: {r['reason']}")
