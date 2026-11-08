"""Tests for source-specific production-data reshaping."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd

from ml.scripts.process_data import standardize_source


class ICRISATWideDataTests(unittest.TestCase):
    def test_wide_icrisat_export_becomes_documented_tonnes_per_hectare_rows(self):
        source = pd.DataFrame(
            [
                {
                    "Year": 2000,
                    "State Name": "Test State",
                    "Dist Name": "Test District",
                    "RICE AREA (1000 ha)": 10,
                    "RICE PRODUCTION (1000 tons)": 20,
                    "RICE YIELD (Kg per ha)": 2000,
                    "KHARIF SORGHUM AREA (1000 ha)": 2,
                    "KHARIF SORGHUM PRODUCTION (1000 tons)": 1,
                    "KHARIF SORGHUM YIELD (Kg per ha)": 500,
                },
                {
                    "Year": 2001,
                    "State Name": "Test State",
                    "Dist Name": "Test District",
                    "RICE AREA (1000 ha)": 10,
                    "RICE PRODUCTION (1000 tons)": 0,
                    "RICE YIELD (Kg per ha)": -1,
                    "KHARIF SORGHUM AREA (1000 ha)": 0,
                    "KHARIF SORGHUM PRODUCTION (1000 tons)": 0,
                    "KHARIF SORGHUM YIELD (Kg per ha)": 0,
                },
            ]
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "icrisat_crop_production.csv"
            source.to_csv(path, index=False)
            result = standardize_source(path, None, None, None, {})

        rice = result[result["crop"].eq("Rice")].iloc[0]
        sorghum = result[result["crop"].eq("Sorghum")].iloc[0]
        self.assertEqual(len(result), 2)
        self.assertEqual(rice["season"], "Annual")
        self.assertAlmostEqual(rice["area_ha"], 10_000)
        self.assertAlmostEqual(rice["production_tonnes"], 20_000)
        self.assertAlmostEqual(rice["yield_t_ha"], 2)
        self.assertEqual(sorghum["season"], "Kharif")
        self.assertAlmostEqual(sorghum["yield_t_ha"], 0.5)
        self.assertEqual(result.attrs["invalid_rows_removed"], 2)


if __name__ == "__main__":
    unittest.main()
