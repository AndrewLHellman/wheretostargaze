from typing import Tuple

def round_coordinates(
    lat: float,
    lon: float,
    precision: int = 2
) -> Tuple[float, float]:
    return (
        round(lat, precision),
        round(lon, precision)
    )

def round_for_light_pollution(lat: float, lon: float) -> Tuple[float, float]:
    return round_coordinates(lat, lon, precision=2)

def round_for_cloud_cover(lat: float, lon: float) -> Tuple[float, float]:
    return round_coordinates(lat, lon, precision=1)
