"""
GDACS Automatic Disaster Data Collector:
Fetches live multi-hazard disaster alerts from the official GDACS API,
maps events to the platform disaster schema, and performs idempotent upserts.
Runs in the background via FastAPI lifespan with non-blocking async execution.
"""
import os
import sys
import json
import logging
import ssl
import time
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import urllib.request
import urllib.error

from sqlalchemy.orm import Session
from database import SessionLocal
import models
from disaster_upsert import upsert_external_disaster

logger = logging.getLogger("gdacs_collector")

# Default feed configuration
DEFAULT_GDACS_FEED_URL = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP"
DEFAULT_POLL_INTERVAL_SECONDS = 300
DEFAULT_TIMEOUT_SECONDS = 15
DEFAULT_MAX_RETRIES = 3

# Hazard mapping
EVENT_TYPE_MAP = {
    "EQ": "Earthquake",
    "TC": "Cyclone",
    "FL": "Flood",
    "WF": "Wildfire",
    "VO": "Volcano",
    "DR": "Drought",
    "TS": "Tsunami",
}

# Severity / Alert mapping
ALERT_LEVEL_MAP = {
    "RED": "HIGH",
    "ORANGE": "MEDIUM",
    "GREEN": "LOW",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class GDACSCollector:
    """Manages periodic and on-demand synchronization with the GDACS API."""

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._sync_lock = asyncio.Lock()
        self._is_syncing = False

        self.feed_url = os.getenv("GDACS_FEED_URL", DEFAULT_GDACS_FEED_URL).strip() or DEFAULT_GDACS_FEED_URL
        try:
            self.poll_interval = int(os.getenv("GDACS_POLL_INTERVAL_SECONDS", str(DEFAULT_POLL_INTERVAL_SECONDS)))
        except (ValueError, TypeError):
            self.poll_interval = DEFAULT_POLL_INTERVAL_SECONDS

        # Minimum poll interval protection (prevent hammering GDACS)
        if self.poll_interval < 60:
            self.poll_interval = 60

        self.status = {
            "service": "GDACS Disaster Data Collector",
            "state": "IDLE",
            "feed_url": self.feed_url,
            "poll_interval_seconds": self.poll_interval,
            "last_attempt": None,
            "last_successful_fetch": None,
            "events_processed": 0,
            "events_created": 0,
            "events_updated": 0,
            "recent_error": None,
        }

    def get_status(self) -> Dict[str, Any]:
        """Returns non-sensitive telemetry about collector health and activity."""
        res = dict(self.status)
        res["poll_interval_seconds"] = self.poll_interval
        res["feed_url"] = self.feed_url
        return res

    def fetch_feed_data(self) -> Dict[str, Any]:
        """
        Synchronous fetcher with timeouts and limited retries.
        Uses standard urllib.request with secure SSL context.
        """
        req = urllib.request.Request(
            self.feed_url,
            headers={
                "User-Agent": "DisasterManagementPlatform/2.0 (GDACS-Collector)",
                "Accept": "application/json",
            },
        )
        ctx = ssl.create_default_context()
        last_error = None

        for attempt in range(1, DEFAULT_MAX_RETRIES + 1):
            try:
                with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS, context=ctx) as response:
                    if response.status == 200:
                        raw_bytes = response.read()
                        text_data = raw_bytes.decode("utf-8")
                        return json.loads(text_data)
                    else:
                        raise RuntimeError(f"Unexpected HTTP status {response.status} from GDACS API")
            except Exception as e:
                last_error = e
                logger.warning(
                    "GDACS fetch attempt %d/%d failed: %s",
                    attempt,
                    DEFAULT_MAX_RETRIES,
                    e,
                )
                if attempt < DEFAULT_MAX_RETRIES:
                    time.sleep(2 * attempt)

        raise RuntimeError(f"GDACS fetch failed after {DEFAULT_MAX_RETRIES} attempts: {last_error}")

    def parse_event(self, feature: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extracts structured disaster model fields from a GDACS GeoJSON feature.
        Preserves original event ID, timestamp, source, and exact coordinates without inventing data.
        """
        if not isinstance(feature, dict):
            return None

        props = feature.get("properties") or {}
        geom = feature.get("geometry") or {}

        event_id = props.get("eventid")
        if not event_id:
            return None

        raw_type = str(props.get("eventtype") or "EVENT").strip().upper()
        disaster_type = EVENT_TYPE_MAP.get(raw_type, f"GDACS {raw_type}")

        raw_alert = str(props.get("alertlevel") or "GREEN").strip().upper()
        severity = ALERT_LEVEL_MAP.get(raw_alert, "MEDIUM")

        is_current = str(props.get("iscurrent", "true")).strip().lower()
        status = "ACTIVE" if is_current in ["true", "1"] else "RESOLVED"

        # Safe coordinate extraction from GeoJSON Point: [longitude, latitude]
        coords = geom.get("coordinates")
        lat: Optional[float] = None
        lon: Optional[float] = None
        if isinstance(coords, (list, tuple)) and len(coords) >= 2:
            try:
                lon_val = float(coords[0])
                lat_val = float(coords[1])
                # Validate coordinates range
                if -90.0 <= lat_val <= 90.0 and -180.0 <= lon_val <= 180.0:
                    lat = lat_val
                    lon = lon_val
            except (ValueError, TypeError):
                lat = None
                lon = None

        # Parse timestamp safely
        reported_date = utc_now()
        date_str = props.get("fromdate") or props.get("datemodified")
        if date_str and isinstance(date_str, str):
            try:
                clean_date = date_str.replace("Z", "+00:00")
                if len(clean_date) >= 19:
                    reported_date = datetime.fromisoformat(clean_date[:19])
            except Exception:
                reported_date = utc_now()

        country = (props.get("country") or "International").strip()
        name = (props.get("name") or props.get("eventname") or f"{disaster_type} in {country}").strip()
        description = (
            props.get("description")
            or props.get("htmldescription")
            or f"GDACS alert: {raw_alert} {disaster_type} incident reported in {country}."
        ).strip()

        external_id = f"GDACS_{raw_type}_{event_id}"

        return {
            "disasterName": name[:150],
            "disasterType": disaster_type[:80],
            "district": country[:100],
            "location": name[:150],
            "severity": severity,
            "status": status,
            "description": description,
            "latitude": lat,
            "longitude": lon,
            "reportedDate": reported_date,
            "source": "GDACS",
            "external_id": external_id,
        }

    def process_feed_in_db(self, feed_data: Dict[str, Any]) -> Tuple[int, int, int]:
        """
        Parses all features and upserts them into the database safely.
        Returns (total_processed, created_count, updated_count).
        """
        features = feed_data.get("features")
        if not isinstance(features, list):
            logger.warning("GDACS feed returned payload without 'features' list.")
            return 0, 0, 0

        created_count = 0
        updated_count = 0
        processed_count = 0

        db: Session = SessionLocal()
        try:
            for feat in features:
                parsed = self.parse_event(feat)
                if not parsed:
                    continue

                try:
                    # Upsert with resolve_missing_coordinates=False to strictly preserve coordinates without inventing them
                    _, is_created = upsert_external_disaster(
                        db,
                        parsed,
                        resolve_missing_coordinates=False,
                    )
                    processed_count += 1
                    if is_created:
                        created_count += 1
                    else:
                        updated_count += 1
                except Exception as item_err:
                    logger.error("Failed to upsert GDACS item %s: %s", parsed.get("external_id"), item_err)
                    db.rollback()

            return processed_count, created_count, updated_count

        finally:
            db.close()

    def sync_once(self) -> Dict[str, Any]:
        """
        Synchronous single-cycle execution: fetch, parse, and upsert.
        Updates internal status telemetry.
        """
        self.status["last_attempt"] = utc_now_iso()
        self.status["state"] = "POLLING"

        try:
            feed_data = self.fetch_feed_data()
            processed, created, updated = self.process_feed_in_db(feed_data)

            self.status["last_successful_fetch"] = utc_now_iso()
            self.status["events_processed"] += processed
            self.status["events_created"] += created
            self.status["events_updated"] += updated
            self.status["recent_error"] = None
            self.status["state"] = "IDLE"

            logger.info(
                "GDACS sync successful: %d processed (%d created, %d updated).",
                processed,
                created,
                updated,
            )
            return {
                "success": True,
                "processed": processed,
                "created": created,
                "updated": updated,
                "timestamp": self.status["last_successful_fetch"],
            }

        except Exception as e:
            err_msg = str(e)
            self.status["recent_error"] = err_msg
            self.status["state"] = "ERROR"
            logger.error("GDACS sync failed: %s", err_msg)
            return {
                "success": False,
                "error": err_msg,
                "timestamp": self.status["last_attempt"],
            }

    async def sync_now(self) -> Dict[str, Any]:
        """Thread-safe, non-blocking manual sync trigger."""
        async with self._sync_lock:
            return await asyncio.to_thread(self.sync_once)

    async def _run_loop(self):
        """Continuous background polling loop that respects graceful cancellation."""
        logger.info("GDACS background collector started (interval: %ds).", self.poll_interval)
        self.status["state"] = "RUNNING"

        # Initial fetch on startup
        try:
            await self.sync_now()
        except Exception as e:
            logger.warning("Initial GDACS fetch on startup encountered an issue: %s", e)

        while not self._stop_event.is_set():
            try:
                # Wait for poll interval or until stop event is signaled
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.poll_interval)
                break  # If wait finishes without timeout, stop_event was set
            except asyncio.TimeoutError:
                # Normal interval elapsed, run sync
                if not self._stop_event.is_set():
                    try:
                        await self.sync_now()
                    except Exception as e:
                        logger.error("GDACS periodic poll error: %s", e)

        self.status["state"] = "STOPPED"
        logger.info("GDACS background collector stopped cleanly.")

    def start(self):
        """Starts background worker task if not already running."""
        if self._task is None or self._task.done():
            self._stop_event.clear()
            self._task = asyncio.create_task(self._run_loop())

    async def stop(self):
        """Stops background worker task cleanly without blocking shutdown."""
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.status["state"] = "STOPPED"


# Global singleton collector instance
collector = GDACSCollector()


def get_gdacs_collector() -> GDACSCollector:
    return collector
