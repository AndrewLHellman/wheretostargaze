import httpx
import logging
from typing import Optional
from config import settings
from cache import cache_response

logger = logging.getLogger(__name__)

@cache_response(ttl_seconds=1800, prefix="cloud_cover")
async def _get_cloud_cover_cached(lat: float, lon: float) -> Optional[float]:
    if not hasattr(settings, 'openweather_api_key') or not settings.openweather_api_key:
        logger.warning("OpenWeather API key not configured")
        return None

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'lat': lat,
        'lon': lon,
        'appid': settings.openweather_api_key,
        'units': 'metric'
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=5.0)
            response.raise_for_status()
            data = response.json()

            cloud_cover = data.get('clouds', {}).get('all', 0)
            return float(cloud_cover)
    except Exception as e:
        logger.error(f"Error fetching cloud cover: {e}")
        return None

async def get_cloud_cover(lat: float, lon: float) -> Optional[float]:
    lat_rounded = round(lat, 1)
    lon_rounded = round(lon, 1)

    if lat != lat_rounded or lon != lon_rounded:
        logger.debug(
            f"Cloud cover rounding: ({lat:.5f}, {lon:.5f}) → "
            f"({lat_rounded:.1f}, {lon_rounded:.1f})"
        )

    return await _get_cloud_cover_cached(lat_rounded, lon_rounded)

def get_cloud_quality_score(cloud_cover: Optional[float]) -> float:
    if cloud_cover is None:
        return 0.5

    return 1.0 - (cloud_cover / 100.0)

def should_recommend_spot(cloud_cover: Optional[float], threshold: float = 50.0) -> bool:
    if cloud_cover is None:
        return True

    return cloud_cover <= threshold
