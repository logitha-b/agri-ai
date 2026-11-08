# ERA5-Land total precipitation download script — India 2005-2020

import cdsapi
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "era5_precip_india_2005_2020.nc"

# Years that overlap with the lac production series (2008-09 to 2018-19)
# Download 2005-2020 to give a 2-year buffer on each side
YEARS  = [str(y) for y in range(2005, 2021)]
MONTHS = [f"{m:02d}" for m in range(1, 13)]

c = cdsapi.Client()

print(f"Requesting ERA5-Land monthly total precipitation...")
print(f"  Years  : {YEARS[0]} – {YEARS[-1]}")
print(f"  Months : all 12")
print(f"  Area   : India (6–37°N, 66–98°E)")
print(f"  Output : {OUT}")

c.retrieve(
    "reanalysis-era5-land-monthly-means",
    {
        "product_type": "monthly_averaged_reanalysis",
        "variable":     "total_precipitation",
        "year":         YEARS,
        "month":        MONTHS,
        "time":         "00:00",
        "area":         [37, 66, 6, 98],   # North, West, South, East
        "format":       "netcdf",
    },
    str(OUT),
)

print(f"\nDownload complete: {OUT}")

# Quick verification
import netCDF4 as nc
ds = nc.Dataset(str(OUT))
print(f"\nVariables : {list(ds.variables.keys())}")
tp = ds.variables.get("tp") or ds.variables.get("tp_sum")
if tp:
    print(f"tp shape  : {tp.shape}  (time, lat, lon)")
    print(f"tp units  : {getattr(tp, 'units', '?')}")
else:
    print("WARNING: 'tp' variable not found — check variable names above")
ds.close()
