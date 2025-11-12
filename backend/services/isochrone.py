import httpx
from typing import List, Tuple, Optional
from shapely.geometry import Point, Polygon
from shapely.ops import transform
import math
from config import settings
from cache import cache_response
import logging

logger = logging.getLogger(__name__)

GLOBAL_GRID_SPACING_DEGREES = 0.02

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

def snap_to_global_grid(lat: float, lon: float, grid_spacing: float = GLOBAL_GRID_SPACING_DEGREES) -> Tuple[float, float]:
    snapped_lat = round(lat / grid_spacing) * grid_spacing
    snapped_lon = round(lon / grid_spacing) * grid_spacing

    snapped_lat = round(snapped_lat, 6)
    snapped_lon = round(snapped_lon, 6)

    return (snapped_lat, snapped_lon)

def generate_grid_points(polygon: Polygon, grid_spacing_degrees: float = GLOBAL_GRID_SPACING_DEGREES) -> List[Tuple[float, float]]:
    minlon, minlat, maxlon, maxlat = polygon.bounds

    start_lat = math.floor(minlat / grid_spacing_degrees) * grid_spacing_degrees
    start_lon = math.floor(minlon / grid_spacing_degrees) * grid_spacing_degrees
    end_lat = math.ceil(maxlat / grid_spacing_degrees) * grid_spacing_degrees
    end_lon = math.ceil(maxlon / grid_spacing_degrees) * grid_spacing_degrees

    points = []

    lat = start_lat
    while lat <= end_lat:
        lon = start_lon
        while lon <= end_lon:
            snapped_lat, snapped_lon = snap_to_global_grid(lat, lon, grid_spacing_degrees)

            point = Point(snapped_lon, snapped_lat)
            if polygon.contains(point) or polygon.boundary.distance(point) < grid_spacing_degrees * 0.1:
                points.append((snapped_lat, snapped_lon))
            lon += grid_spacing_degrees
        lat += grid_spacing_degrees

    points = list(set(points))

    if len(points) == 0:
        center = polygon.centroid
        center_snapped = snap_to_global_grid(center.y, center.x, grid_spacing_degrees)
        points.append(center_snapped)

    return points

def generate_coarse_grid(polygon: Polygon) -> List[Tuple[float, float]]:
    return generate_grid_points(polygon, grid_spacing_degrees=0.1)

def miles_to_degrees(miles: float, latitude: float = 38.0) -> float:
    """
    Convert miles to degrees of latitude/longitude.

    Args:
        miles: Distance in miles
        latitude: Reference latitude (for longitude calculation)

    Returns:
        Approximate degrees
    """
    # 1 degree latitude ≈ 69 miles everywhere
    lat_degrees = miles / 69.0

    # 1 degree longitude varies by latitude
    lon_degrees = miles / (69.0 * math.cos(math.radians(latitude)))

    return (lat_degrees + lon_degrees) / 2

def degrees_to_miles(degrees: float, latitude: float = 38.0) -> float:
    """
    Convert degrees to miles.

    Args:
        degrees: Angular distance in degrees
        latitude: Reference latitude

    Returns:
        Approximate distance in miles
    """
    return degrees * 69.0

def polygon_to_geojson(polygon: Polygon) -> dict:
    coords = list(polygon.exterior.coords)

    return {
        "type": "Polygon",
        "coordinates": [coords]
    }

def get_grid_spacing_for_miles(target_miles: float) -> float:
    """
    Get the best global grid spacing for a target distance in miles.

    Args:
        target_miles: Desired spacing in miles

    Returns:
        Grid spacing in degrees that's close to target

    Examples:
        get_grid_spacing_for_miles(1.0) → 0.015 (≈1.04 miles)
        get_grid_spacing_for_miles(2.0) → 0.02  (≈1.38 miles)
        get_grid_spacing_for_miles(5.0) → 0.05  (≈3.45 miles)
    """
    # 1 degree ≈ 69 miles at equator
    degrees = target_miles / 69.0

    # Round to nice values for better cache alignment
    if degrees < 0.01:
        return 0.01
    elif degrees < 0.02:
        return 0.015
    elif degrees < 0.03:
        return 0.02
    elif degrees < 0.05:
        return 0.05
    elif degrees < 0.1:
        return 0.1
    else:
        return round(degrees, 2)
