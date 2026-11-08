"""Regression tests for NASA POWER India weather collection and validation."""

from __future__ import annotations

import json
import tempfile
import unittest
from argparse import Namespace
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon

import ml.scripts.download_india_weather as pipeline
from ml.scripts.download_india_weather import (
    PARAMETERS,
    Region,
    RequestPacer,
    combine_region,
    create_regions,
    create_plots,
    date_chunks,
    fetch_region_parameter,
    load_india_boundary,
    read_regional_csv,
    validate_final_data,
)


def response_csv(parameter: str = "T2M") -> str:
    return (
        "-BEGIN HEADER-\n"
        "Regional API response\n"
        "-END HEADER-\n"
        f"LAT,LON,YEAR,DOY,{parameter}\n"
        f"10.0,76.25,2020,1,20.5\n"
        f"10.0,76.25,2020,2,{-999 if parameter == 'T2M' else 4.0}\n"
    )


class FakeResponse:
    def __init__(self, text: str, status_code: int = 200):
        self.text = text
        self.status_code = status_code
        self.headers = {}
        self.url = "https://power.larc.nasa.gov/test"

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.headers = {}

    def get(self, url, params, timeout):
        self.calls.append((url, params, timeout))
        return self.responses.pop(0)

    def close(self):
        pass


class RegionalResponseTests(unittest.TestCase):
    def test_parser_converts_doy_and_power_missing_sentinel(self):
        result = read_regional_csv(
            response_csv("T2M"), "T2M", date(2020, 1, 1), date(2020, 1, 2)
        )
        self.assertEqual(result["date"].tolist(), ["2020-01-01", "2020-01-02"])
        self.assertEqual(result["temperature_avg_c"].iloc[0], 20.5)
        self.assertTrue(pd.isna(result["temperature_avg_c"].iloc[1]))

    def test_parser_removes_identical_duplicates_and_rejects_conflicting_ones(self):
        duplicate = response_csv("T2M") + "10.0,76.25,2020,1,20.5\n"
        result = read_regional_csv(
            duplicate, "T2M", date(2020, 1, 1), date(2020, 1, 2)
        )
        self.assertEqual(len(result), 2)
        self.assertEqual(result.attrs["duplicate_rows_removed"], 1)

        conflict = response_csv("T2M") + "10.0,76.25,2020,1,21.5\n"
        with self.assertRaisesRegex(ValueError, "Conflicting duplicate"):
            read_regional_csv(
                conflict, "T2M", date(2020, 1, 1), date(2020, 1, 2)
            )

    def test_parser_rejects_parameter_mismatch_and_out_of_period_dates(self):
        with self.assertRaisesRegex(ValueError, "do not include"):
            read_regional_csv(
                response_csv("T2M"), "T2M_MAX", date(2020, 1, 1), date(2020, 1, 2)
            )
        with self.assertRaisesRegex(ValueError, "outside the requested range"):
            read_regional_csv(
                response_csv("T2M"), "T2M", date(2020, 1, 2), date(2020, 1, 2)
            )
        with self.assertRaisesRegex(ValueError, "non-numeric values"):
            read_regional_csv(
                response_csv("T2M").replace("20.5", "not-a-number"),
                "T2M", date(2020, 1, 1), date(2020, 1, 2),
            )

    def test_tiles_intersect_boundary_and_never_exceed_ten_degrees(self):
        polygon = Polygon([(68, 7), (78, 7), (78, 17), (68, 17)])
        regions = create_regions(polygon, tile_degrees=5)
        self.assertEqual(len(regions), 9)
        for region in regions:
            self.assertLessEqual(region.latitude_max - region.latitude_min, 10)
            self.assertLessEqual(region.longitude_max - region.longitude_min, 10)
            self.assertTrue(
                polygon.intersects(
                    Polygon(
                        [
                            (region.longitude_min, region.latitude_min),
                            (region.longitude_max, region.latitude_min),
                            (region.longitude_max, region.latitude_max),
                            (region.longitude_min, region.latitude_max),
                        ]
                    )
                )
            )
        with self.assertRaisesRegex(ValueError, "between 2.001 and 10.0"):
            create_regions(polygon, tile_degrees=10.1)
        with self.assertRaisesRegex(ValueError, "between 2.001 and 10.0"):
            create_regions(polygon, tile_degrees=1.9)

    def test_loads_georeferenced_boundary_and_projects_to_wgs84(self):
        polygon = Polygon([(76, 10), (77, 10), (77, 11), (76, 11)])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "boundary.geojson"
            gpd.GeoDataFrame(
                {"name": ["India test polygon"]},
                geometry=[polygon],
                crs="EPSG:4326",
            ).to_file(path, driver="GeoJSON")
            frame, geometry = load_india_boundary(path)
        self.assertEqual(frame.crs.to_epsg(), 4326)
        self.assertEqual(geometry.bounds, (76.0, 10.0, 77.0, 11.0))

    def test_optional_plots_create_spatial_and_trend_visualizations(self):
        polygon = Polygon([(76, 10), (77, 10), (77, 11), (76, 11)])
        boundary_frame = gpd.GeoDataFrame(
            {"name": ["India test polygon"]}, geometry=[polygon], crs="EPSG:4326"
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "weather.csv"
            pd.DataFrame(
                [
                    {
                        "date": "2020-01-01",
                        "latitude": 10.5,
                        "longitude": 76.5,
                        "rainfall_mm": 1.0,
                        "temperature_avg_c": 20.0,
                    },
                    {
                        "date": "2020-01-02",
                        "latitude": 10.5,
                        "longitude": 76.5,
                        "rainfall_mm": 3.0,
                        "temperature_avg_c": 22.0,
                    },
                ]
            ).to_csv(source, index=False)
            output_dir = root / "plots"
            create_plots(source, boundary_frame, output_dir)
            self.assertTrue((output_dir / "india_weather_spatial_coverage.png").is_file())
            self.assertTrue((output_dir / "india_weather_trends.png").is_file())

    def test_date_chunks_cover_full_range_without_gaps_and_respect_api_limit(self):
        chunks = date_chunks(date(2020, 1, 1), date(2025, 12, 31))
        self.assertEqual(chunks[0][0], date(2020, 1, 1))
        self.assertEqual(chunks[-1][1], date(2025, 12, 31))
        self.assertEqual(len(chunks), 6)
        for index, (chunk_start, chunk_end) in enumerate(chunks):
            self.assertLessEqual((chunk_end - chunk_start).days + 1, 366)
            if index:
                self.assertEqual(chunk_start, chunks[index - 1][1] + pd.Timedelta(days=1))

    def test_success_records_http_status_hash_and_exact_single_parameter(self):
        region = Region("test", 10, 15, 75, 80, True, True)
        session = FakeSession([FakeResponse(response_csv())])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            destination = root / "regions" / "T2M.csv"
            manifest_path = root / "manifest.json"
            manifest = {"version": 1, "requests": {}}
            succeeded = fetch_region_parameter(
                session, region, "T2M", date(2020, 1, 1), date(2020, 1, 2),
                destination, manifest, manifest_path, RequestPacer(0), 2, (1, 1),
            )
            self.assertTrue(succeeded)
            request_parameters = session.calls[0][1]
            self.assertEqual(request_parameters["parameters"], "T2M")
            self.assertEqual(request_parameters["format"], "CSV")
            self.assertEqual(request_parameters["time-standard"], "UTC")
            saved = json.loads(manifest_path.read_text(encoding="utf-8"))
            request = next(iter(saved["requests"].values()))
            self.assertEqual(request["status"], "success")
            self.assertEqual(request["http_status"], 200)
            self.assertEqual(request["rows"], 2)
            self.assertTrue(request["sha256"])
            self.assertTrue(
                fetch_region_parameter(
                    session, region, "T2M", date(2020, 1, 1), date(2020, 1, 2),
                    destination, saved, manifest_path, RequestPacer(0), 2, (1, 1),
                )
            )
            self.assertEqual(len(session.calls), 1, "verified successful responses must be resumed")

    def test_failed_http_response_is_not_marked_successful(self):
        region = Region("test", 10, 15, 75, 80, True, True)
        session = FakeSession(
            [FakeResponse("temporary service error", 503), FakeResponse(response_csv())]
        )
        with tempfile.TemporaryDirectory() as directory, patch(
            "ml.scripts.download_india_weather.time.sleep"
        ):
            root = Path(directory)
            manifest = {"version": 1, "requests": {}}
            succeeded = fetch_region_parameter(
                session, region, "T2M", date(2020, 1, 1), date(2020, 1, 2),
                root / "T2M.csv", manifest, root / "manifest.json",
                RequestPacer(0), 2, (1, 1),
            )
        self.assertTrue(succeeded)
        self.assertEqual(len(session.calls), 2)
        self.assertEqual(next(iter(manifest["requests"].values()))["http_status"], 200)

    def test_nonretryable_http_error_is_logged_without_repeating_request(self):
        region = Region("test", 10, 15, 75, 80, True, True)
        session = FakeSession([FakeResponse("invalid request", 422)])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = {"version": 1, "requests": {}}
            succeeded = fetch_region_parameter(
                session, region, "T2M", date(2020, 1, 1), date(2020, 1, 2),
                root / "T2M.csv", manifest, root / "manifest.json",
                RequestPacer(0), 4, (1, 1),
            )
        self.assertFalse(succeeded)
        self.assertEqual(len(session.calls), 1)
        request = next(iter(manifest["requests"].values()))
        self.assertEqual(request["status"], "failed")
        self.assertEqual(request["http_status"], 422)

    def test_combine_filters_nonland_points_and_aligns_parameter_series(self):
        region = Region("test", 10, 15, 75, 80, True, True)
        polygon = Polygon([(76, 9), (77, 9), (77, 11), (76, 11)])
        with tempfile.TemporaryDirectory() as directory:
            region_dir = Path(directory) / region.region_id
            region_dir.mkdir()
            for parameter in PARAMETERS:
                parameter_dir = region_dir / parameter
                parameter_dir.mkdir()
                parameter_dir.joinpath("20200101_20200101.csv").write_text(
                    "-BEGIN HEADER-\n-END HEADER-\n"
                    f"LAT,LON,YEAR,DOY,{parameter}\n"
                    f"10.0,76.25,2020,1,"
                    f"{'2.0' if parameter == 'PRECTOTCORR' else '20.0'}\n"
                    f"14.0,79.0,2020,1,"
                    f"{'2.0' if parameter == 'PRECTOTCORR' else '20.0'}\n",
                    encoding="utf-8",
                )
            combined = combine_region(
                region, Path(directory), polygon, date(2020, 1, 1), date(2020, 1, 1)
            )
        self.assertEqual(len(combined), 1)
        self.assertEqual(combined.iloc[0]["latitude"], 10)
        self.assertEqual(combined.iloc[0]["rainfall_mm"], 2)
        self.assertEqual(combined.iloc[0]["temperature_avg_c"], 20)

    def test_final_validation_checks_schema_period_and_values(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "weather.csv"
            pd.DataFrame(
                [
                    {
                        "date": "2020-01-01",
                        "latitude": 10.0,
                        "longitude": 76.25,
                        "rainfall_mm": 2.0,
                        "temperature_avg_c": 20.0,
                        "temperature_max_c": 25.0,
                        "temperature_min_c": 15.0,
                    }
                ]
            ).to_csv(path, index=False)
            result = validate_final_data(path, date(2020, 1, 1), date(2020, 1, 1))
        self.assertEqual(result["rows"], 1)
        self.assertEqual(result["unique_grid_locations"], 1)
        self.assertEqual(result["days_covered"], 1)

    def test_final_validation_rejects_a_gap_in_requested_daily_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "weather.csv"
            row = {
                "latitude": 10.0,
                "longitude": 76.25,
                "rainfall_mm": 2.0,
                "temperature_avg_c": 20.0,
                "temperature_max_c": 25.0,
                "temperature_min_c": 15.0,
            }
            pd.DataFrame(
                [{**row, "date": "2020-01-01"}, {**row, "date": "2020-01-03"}]
            ).to_csv(path, index=False)
            with self.assertRaisesRegex(ValueError, "missing 1 requested dates"):
                validate_final_data(path, date(2020, 1, 1), date(2020, 1, 3))

    def test_pipeline_writes_combined_csv_and_provenance_after_verified_requests(self):
        polygon = Polygon([(76, 10), (76.5, 10), (76.5, 10.4), (76, 10.4)])
        responses = [FakeResponse(response_csv(parameter)) for parameter in PARAMETERS]
        fake_session = FakeSession(responses)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "india_agricultural_weather_2020_2025.csv"
            args = Namespace(
                start=date(2020, 1, 1),
                end=date(2020, 1, 2),
                retries=1,
                rate_limit_seconds=0,
                connect_timeout=1,
                read_timeout=1,
                output=output,
                overwrite=False,
                work_dir=root / "work",
                boundary=root / "official.shp",
                boundary_source="Official boundary source and version",
                tile_degrees=5,
                plots=False,
            )
            with (
                patch.object(pipeline, "load_india_boundary", return_value=(None, polygon)),
                patch.object(pipeline.requests, "Session", return_value=fake_session),
            ):
                self.assertEqual(pipeline.run(args), 0)
            result = pd.read_csv(output)
            metadata = json.loads(output.with_suffix(".metadata.json").read_text(encoding="utf-8"))
            for handler in list(pipeline.LOG.handlers):
                pipeline.LOG.removeHandler(handler)
                handler.close()
        self.assertEqual(len(fake_session.calls), len(PARAMETERS))
        self.assertEqual(len(result), 2)
        self.assertEqual(result["date"].iloc[0], "2020-01-01")
        self.assertEqual(metadata["boundary_source"], "Official boundary source and version")
        self.assertEqual(metadata["last_date"], "2020-01-02")
        self.assertTrue((metadata["missing_values"]["temperature_avg_c"] >= 1))


if __name__ == "__main__":
    unittest.main()
