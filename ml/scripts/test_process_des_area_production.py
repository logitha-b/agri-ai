"""Tests for the multi-header DES/DACNET area-production workbook parser."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd
from openpyxl import Workbook, load_workbook

from ml.scripts.process_des_area_production import standardize_workbook


def create_workbook(path: Path, duplicate_year: bool = False) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "all crops-season wise"
    sheet.cell(1, 1, "District wise and season wise yearly area and production from 1997 to 2019")
    sheet.cell(
        2,
        1,
        "Units: Area in (000 Ha) : Production in (000 t) : Yield (Kg/ha) : "
        "Coconut production in 000 nuts and Yield (nuts/ha)",
    )
    sheet.cell(3, 1, "Note: Production data of Cotton, Jute and Mesta are reported in Bales")
    sheet.cell(4, 2, "DACNET")
    sheet.cell(7, 6, "Rice")
    sheet.cell(7, 7, "Rice")
    sheet.cell(7, 8, "Rice")
    sheet.cell(7, 9, "Coconut")
    sheet.cell(7, 10, "Coconut")
    sheet.cell(7, 11, "Coconut")
    sheet.cell(7, 12, "Sugarcane")
    sheet.cell(7, 13, "Sugarcane")
    sheet.cell(7, 14, "Sugarcane")
    sheet.cell(8, 6, "Total")
    sheet.cell(8, 7, "Total")
    sheet.cell(8, 8, "Total")
    sheet.cell(8, 9, "Total")
    sheet.cell(8, 10, "Total")
    sheet.cell(8, 11, "Total")
    sheet.cell(8, 12, "Total")
    sheet.cell(8, 13, "Total")
    sheet.cell(8, 14, "Total")
    for col, label in enumerate(
        ("State Code", "STNAME", "DIST", "DISTNAME", "YEAR",
         "Area", "Production", "Yield", "Area", "Production", "Yield",
         "Area", "Production (gur)", "Yield"),
        start=1,
    ):
        sheet.cell(9, col, label)
    for col, label in enumerate(
        ("State Code", "STNAME", "DIST", "DISTNAME", "YEAR",
         "RICE_TA", "RICE_TQ", "RICE_TY", "COCO_TA", "COCO_TQ", "COCO_TY",
         "SCAN_TA", "SGUR_TQ", "SCAN_TY"),
        start=1,
    ):
        sheet.cell(10, col, label)
    row = 11
    for year in ([2000, 2000] if duplicate_year else [2000]):
        values = (
            1, "Test State", 2, "Test District", year,
            2, 5, 2500, 1, 400, 400, 3, 4, 1333,
        )
        for col, value in enumerate(values, start=1):
            sheet.cell(row, col, value)
        row += 1
    workbook.save(path)


class DesAreaProductionTests(unittest.TestCase):
    def test_converts_documented_units_and_preserves_native_coconut_units(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "area-production.xlsx"
            create_workbook(source)
            result = standardize_workbook(source)

        rice = result[result["crop"].eq("Rice")].iloc[0]
        coconut = result[result["crop"].eq("Coconut")].iloc[0]
        self.assertEqual(len(result), 3)
        self.assertEqual(rice["season"], "Annual")
        self.assertEqual(rice["yield_source_unit"], "kg/ha")
        self.assertAlmostEqual(rice["area_ha"], 2000)
        self.assertAlmostEqual(rice["production_tonnes"], 5000)
        self.assertAlmostEqual(rice["yield_t_ha"], 2.5)
        self.assertAlmostEqual(rice["yield_from_area_production_t_ha"], 2.5)
        self.assertTrue(rice["yield_matches_area_production_1pct"])
        self.assertEqual(coconut["yield_source_unit"], "nuts/ha")
        self.assertAlmostEqual(coconut["yield_source_value"], 400)
        self.assertTrue(pd.isna(coconut["yield_t_ha"]))
        self.assertTrue(pd.isna(coconut["production_tonnes"]))
        self.assertTrue(pd.isna(coconut["yield_from_area_production_t_ha"]))
        sugarcane = result[result["crop"].eq("Sugarcane")].iloc[0]
        self.assertEqual(sugarcane["production_source_unit"], "1000 tonnes of gur")
        self.assertAlmostEqual(sugarcane["production_source_value"], 4)
        self.assertTrue(pd.isna(sugarcane["production_tonnes"]))

    def test_preserves_duplicate_source_keys_for_manual_review(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "area-production.xlsx"
            create_workbook(source, duplicate_year=True)
            result = standardize_workbook(source)
        rice = result[result["crop"].eq("Rice")]
        self.assertEqual(len(rice), 2)
        self.assertEqual(rice["year"].nunique(), 1)
        self.assertEqual(rice["source_row"].nunique(), 2)

    def test_rejects_workbook_without_expected_year_and_unit_documentation(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "area-production.xlsx"
            create_workbook(source)
            workbook = load_workbook(source)
            workbook.active["A1"] = "District crop data"
            workbook.save(source)
            with self.assertRaisesRegex(ValueError, "Workbook title"):
                standardize_workbook(source)


if __name__ == "__main__":
    unittest.main()
