import httpx
from typing import List, Tuple, Optional
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import math
from config import settings

async def get_isochrone_polygon(lat: float, lon: float, drive_time_minutes: int) -> Polygon:
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

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=body, headers=headers, timeout=30.0)
        response.raise_for_status()
        data = response.json()

    coords = data["features"][0]["geometry"]["coordinates"][0]
    coords = [(lat, lon) for lon, lat in coords]

    return Polygon(coords)

def get_radius_polygon(lat: float, lon: float, radius_miles: float) -> Polygon:
    radius_degrees = radius_miles / 69.0

    center = Point(lat, lon)

    points = []
    for i in range(32):
        angle = (2*math.pi*i) / 32
        dx = radius_degrees * math.cos(angle)
        dy = radius_degrees * math.sin(angle) / math.cos(math.radians(lat))
        points.append((lat+dx, lon+dy))

    return Polygon(points)

async def get_search_area(
    lat: float,
    lon: float,
    drive_time_mintues: Optional[int] = None,
    radius_miles: Optional[float] = None
) -> Polygon:
    if drive_time_mintues:
        return await get_isochrone_polygon(lat, lon, drive_time_mintues)
    elif radius_miles:
        return get_radius_polygon
    else:
        return get_radius_polygon(lat, lon, 10.0)

def generate_grid_points(polygon: Polygon, spacing_miles: float = 2.0) -> List[Tuple[float, float]]:
    minx, miny, maxx, maxy = polygon.bounds
    spacing_degrees = spacing_miles / 69.0

    points = []
    lat = miny
    while lat <= maxy:
        lon = minx
        while lon <= maxx:
            point = Point(lat, lon)
            if polygon.contains(point):
                points.append((lat, lon))
            lon += spacing_degrees
        lat += spacing_degrees

    return points

def polygon_to_geojson(polygon: Polygon) -> dict:
    coords = list(polygon.exterior.coords)
    coords = [[lon, lat] for lat, lon in coords]

    return {
        "type": "Polygon",
        "coordinates": [coords]
    }
