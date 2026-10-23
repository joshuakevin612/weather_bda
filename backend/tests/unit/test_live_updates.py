"""Coverage and collector setup regressions; no database or provider calls."""

import argparse
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock

import yaml

from app.cli import cmd_enable_weather
from app.core.config import Settings
from app.db.models.data_sources import DataSource
from app.worker import IngestionWorker


def test_curated_locations_cover_thirty_cities():
    config_dir = Path(__file__).resolve().parents[2] / "config"
    locations = yaml.safe_load((config_dir / "locations.yaml").read_text())["locations"]
    example = yaml.safe_load((config_dir / "locations.example.yaml").read_text())["locations"]
    assert example == locations
    assert len(locations) == 30
    assert len({item["slug"] for item in locations}) == 30
    assert all(item["is_active"] and -90 <= item["latitude"] <= 90 for item in locations)
    assert all(-180 <= item["longitude"] <= 180 for item in locations)
    assert {"kochi", "hyderabad", "guwahati", "srinagar"} <= {item["slug"] for item in locations}


def test_enable_weather_preserves_existing_provider_config(monkeypatch):
    source = DataSource(is_enabled=False, interval_seconds=3600, config={"past_days": 2})
    session = MagicMock()
    session.__enter__.return_value = session
    monkeypatch.setattr("app.cli.SessionLocal", lambda: session)
    repo = MagicMock()
    repo.get_by_name.return_value = source
    monkeypatch.setattr("app.repositories.sources.DataSourceRepository", lambda db: repo)
    assert cmd_enable_weather(argparse.Namespace()) == 0
    assert source.is_enabled is True
    assert source.interval_seconds == 900
    assert source.config == {"past_days": 2}
    session.commit.assert_called_once()


def test_new_collection_schedule_runs_immediately_and_is_not_reset(monkeypatch):
    session = MagicMock()
    session.__enter__.return_value = session
    source = DataSource(id=1, name="open_meteo", adapter_key="open_meteo", is_enabled=True,
                        interval_seconds=900, config={})
    repo = MagicMock()
    repo.list_all.return_value = [source]
    monkeypatch.setattr("app.worker.DataSourceRepository", lambda db: repo)
    worker = IngestionWorker(session_factory=lambda: session, settings=Settings(INGESTION_ENABLED=True))
    before = datetime.now(UTC)
    worker.sync_scheduled_jobs()
    job = worker.scheduler.get_job("source_job_1")
    assert before <= job.next_run_time <= datetime.now(UTC) + timedelta(seconds=1)
    assert job.trigger.interval.total_seconds() == 900
    worker.sync_scheduled_jobs()
    assert worker.scheduler.get_job("source_job_1") is job
    source.is_enabled = False
    worker.sync_scheduled_jobs()
    assert worker.scheduler.get_job("source_job_1") is None
