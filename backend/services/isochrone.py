import httpx
from typing import List, Tuple, Optional
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import math
from config import settings
from cache import cache_response
import logging

logger = logging.getLogger(__name__)

@cache_response(ttl_seconds=2592000, prefix="isochrone")
async def get_isochrone_polygon(lat: float, lon: float, drive_time_minutes: int) -> dict:
    url = "https://api.openrouteservice.org/v2/isochrones/driving-car"

    headers = {
        "Authorization": settings.openroute_api_key,
        "Content-Type": "application/json"
    }

    body = {
        "locations": [[lon, lat]],
        "range": [drive_time_minutes * 60],
        "range_type": "time"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=body, headers=headers, timeout=30.0)
            response.raise_for_status()
            data = response.json()

        coords = data["features"][0]["geometry"]["coordinates"][0]

        return {"coordinates": coords}
    except Exception as e:
        logger.error(f"Error getting isochrone, falling back to point polygon: {e}")
        import traceback
        traceback.print_exc()

        offset = 0.0001  # ~11 meters
        return {
            "coordinates": [
                [lon - offset, lat - offset],
                [lon + offset, lat - offset],
                [lon + offset, lat + offset],
                [lon - offset, lat + offset],
                [lon - offset, lat - offset]  # Close the polygon
            ]
        }

def get_radius_polygon(lat: float, lon: float, radius_miles: float) -> Polygon:
    radius_degrees = radius_miles / 69.0

    points = []
    for i in range(32):
        angle = (2*math.pi*i) / 32
        dlat = radius_degrees * math.cos(angle)
        dlon = radius_degrees * math.sin(angle) / math.cos(math.radians(lat))
        points.append((lon+dlon, lat+dlat))

    return Polygon(points)

async def get_search_area(
    lat: float,
    lon: float,
    drive_time_minutes: Optional[int] = None,
    radius_miles: Optional[float] = None
) -> Polygon:
    if drive_time_minutes:
        polygon_dict = await get_isochrone_polygon(lat, lon, drive_time_minutes)
        coords = polygon_dict["coordinates"]
        return Polygon(coords)
    elif radius_miles:
        return get_radius_polygon(lat, lon, radius_miles)
    else:
        return get_radius_polygon(lat, lon, 10.0)

def generate_grid_points(polygon: Polygon, spacing_miles: float = 2.0) -> List[Tuple[float, float]]:
    minlon, minlat, maxlon, maxlat = polygon.bounds
    spacing_degrees = spacing_miles / 69.0

    points = []
    lat = minlat
    while lat <= maxlat:
        lon = minlon
        while lon <= maxlon:
            point = Point(lon, lat)
            if polygon.contains(point):
                points.append((lat, lon))
            lon += spacing_degrees
        lat += spacing_degrees

    if len(points) == 0:
        center = polygon.centroid
        points.append((center.y, center.x))

    return points

def polygon_to_geojson(polygon: Polygon) -> dict:
    coords = list(polygon.exterior.coords)

    return {
        "type": "Polygon",
        "coordinates": [coords]
    }
