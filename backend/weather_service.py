"""
Open-Meteo Weather Intelligence Service:
Retrieves current meteorological telemetry (temperature, relative humidity,
precipitation, wind speed, wind gusts) for verified disaster coordinates on demand.
Does not persist weather responses as disaster incidents or alter severity.
"""
import os
import json
import logging
import ssl
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("weather_service")

DEFAULT_OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"
DEFAULT_TIMEOUT_SECONDS = 8
DEFAULT_MAX_RETRIES = 3

# In-memory weather cache to prevent repeated external network latency (5-minute TTL)
_WEATHER_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}
WEATHER_CACHE_TTL_SECONDS = 300


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fetch_weather_for_coordinates(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Queries Open-Meteo for real-time meteorological observations for valid coordinates.
    Uses in-memory caching to eliminate redundant external network delays and ensure fast response times.

    Parameters:
        latitude: Valid latitude float (-90.0 to 90.0)
        longitude: Valid longitude float (-180.0 to 180.0)

    Returns:
        Structured dictionary containing meteorological observation metrics.

    Raises:
        ValueError: If coordinates are missing, non-numeric, or out of geographical bounds.
        RuntimeError: If Open-Meteo cannot be reached after retries.
    """
    if latitude is None or longitude is None:
        raise ValueError("Latitude and longitude must both be provided.")

    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise ValueError("Coordinates must be valid floating point numbers.")

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
        raise ValueError(f"Coordinates ({lat}, {lon}) are out of valid geographical bounds.")

    # 1. Fast Cache Check: avoid repeat external network requests
    cache_key = (round(lat, 2), round(lon, 2))
    now_ts = time.time()
    if cache_key in _WEATHER_CACHE:
        cached_ts, cached_data = _WEATHER_CACHE[cache_key]
        if now_ts - cached_ts < WEATHER_CACHE_TTL_SECONDS:
            return cached_data

    base_url = os.getenv("OPEN_METEO_BASE_URL", DEFAULT_OPEN_METEO_BASE_URL).strip() or DEFAULT_OPEN_METEO_BASE_URL

    params = {
        "latitude": f"{lat:.4f}",
        "longitude": f"{lon:.4f}",
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m",
    }
    encoded_query = urllib.parse.urlencode(params)
    url = f"{base_url}?{encoded_query}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "DisasterManagementPlatform/2.0 (WeatherService)",
            "Accept": "application/json",
        },
    )
    ctx = ssl.create_default_context()

    last_error = None
    payload = None

    for attempt in range(1, DEFAULT_MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS, context=ctx) as resp:
                if resp.status == 200:
                    raw = resp.read().decode("utf-8")
                    payload = json.loads(raw)
                    break
                else:
                    raise RuntimeError(f"Open-Meteo returned status {resp.status}")
        except Exception as e:
            last_error = e
            logger.warning(
                "Open-Meteo weather fetch attempt %d/%d failed: %s",
                attempt,
                DEFAULT_MAX_RETRIES,
                e,
            )
            if attempt < DEFAULT_MAX_RETRIES:
                time.sleep(1.0 * attempt)

    if payload is None:
        raise RuntimeError(f"Unable to reach Open-Meteo weather service after {DEFAULT_MAX_RETRIES} attempts: {last_error}")

    current = payload.get("current") or {}
    units = payload.get("current_units") or {}

    result = {
        "provider": "Open-Meteo",
        "observationTime": current.get("time"),
        "retrievedAt": utc_now_iso(),
        "temperature": current.get("temperature_2m"),
        "temperatureUnit": units.get("temperature_2m", "°C"),
        "humidity": current.get("relative_humidity_2m"),
        "humidityUnit": units.get("relative_humidity_2m", "%"),
        "precipitation": current.get("precipitation"),
        "precipitationUnit": units.get("precipitation", "mm"),
        "windSpeed": current.get("wind_speed_10m"),
        "windSpeedUnit": units.get("wind_speed_10m", "km/h"),
        "windGusts": current.get("wind_gusts_10m"),
        "windGustsUnit": units.get("wind_gusts_10m", "km/h"),
    }
    _WEATHER_CACHE[cache_key] = (now_ts, result)
    return result
