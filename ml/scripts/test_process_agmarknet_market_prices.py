"""Tests for the user-supplied AGMARKNET market-price export."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import pandas as pd

from ml.scripts.process_agmarknet_market_prices import process, standardize_source


def sample_frame() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "State": " Tamil Nadu ",
                "District": "Thanjavur",
                "Market": "Budalur APMC",
                "Commodity": "Paddy(Common)",
                "Variety": "B P T",
                "Grade": "FAQ",
                "Arrival_Date": "13/10/2026",
                "Min_x0020_Price": "2,300",
                "Max_x0020_Price": "2500",
                "Modal_x0020_Price": "2400.00",
            },
            {
                "State": "Tamil Nadu",
                "District": "Villupuram",
                "Market": "Avalurpet APMC",
                "Commodity": "Paddy(Common)",
                "Variety": "Other",
                "Grade": "FAQ",
                "Arrival_Date": "13/10/2026",
                "Min_x0020_Price": "2412",
                "Max_x0020_Price": "4609",
                "Modal_x0020_Price": "3510.5",
            },
        ]
    )


class AgmarknetProcessingTests(unittest.TestCase):
    def test_standardizes_prices_and_ddmmyyyy_date_without_unit_conversion(self):
        records, summary = standardize_source(sample_frame())
        self.assertEqual(records[0]["arrival_date"], "2026-10-13")
        self.assertEqual(records[0]["state"], "Tamil Nadu")
        self.assertEqual(records[0]["modal_price_rs_per_quintal"], 2400)
        self.assertEqual(summary["record_count"], 2)
        self.assertEqual(summary["price_unit"], "Indian rupees per quintal (100 kg)")

    def test_missing_price_markers_remain_missing_not_zero(self):
        frame = sample_frame().iloc[:1].copy()
        frame.loc[frame.index[0], "Min_x0020_Price"] = "-"
        frame.loc[frame.index[0], "Max_x0020_Price"] = "2500"
        frame.loc[frame.index[0], "Modal_x0020_Price"] = "2500"
        records, _ = standardize_source(frame)
        self.assertIsNone(records[0]["min_price_rs_per_quintal"])

    def test_rejects_missing_columns_and_invalid_price_ranges(self):
        with self.assertRaisesRegex(ValueError, "missing required columns"):
            standardize_source(sample_frame().drop(columns=["Market"]))
        frame = sample_frame().iloc[:1].copy()
        frame.loc[frame.index[0], "Min_x0020_Price"] = "2600"
        with self.assertRaisesRegex(ValueError, "Minimum price exceeds maximum"):
            standardize_source(frame)

    def test_duplicate_rows_removed_and_processing_preserves_input_file(self):
        frame = pd.concat([sample_frame().iloc[:1], sample_frame().iloc[:1]], ignore_index=True)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.csv"
            output = root / "src" / "data.json"
            frame.to_csv(source, index=False)
            source_before = source.read_bytes()
            metadata = process(source, output, "AGMARKNET test export")
            self.assertEqual(source.read_bytes(), source_before)
            self.assertEqual(metadata["record_count"], 1)
            self.assertEqual(metadata["duplicate_rows_removed"], 1)
            self.assertTrue(output.is_file())


if __name__ == "__main__":
    unittest.main()
