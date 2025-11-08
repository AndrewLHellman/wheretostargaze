"""
Smart cloud cover fetching strategy to avoid API spam
"""
import asyncio
from typing import List, Tuple, Optional
from services.cloud_cover import get_cloud_cover
import math

async def get_cloud_cover_for_area(
    grid_points: List[Tuple[float, float]],
    sample_strategy: str = "sparse"
) -> List[Optional[float]]:
    """
    Get cloud cover for an area without hitting API limits.

    Strategies:
        "single": One API call for center, apply to all points
        "sparse": Sample 5-10 points, interpolate for the rest
        "moderate": Sample 20-30 points, interpolate for the rest
        "all": Call API for every point (NOT RECOMMENDED)

    Returns:
        List of cloud cover values (one per grid point)
    """

    if len(grid_points) == 0:
        return []

    if sample_strategy == "single":
        # Just get cloud cover for the center point
        # Cloud cover is usually consistent across 25-50 mile radius
        center_lat = sum(lat for lat, _ in grid_points) / len(grid_points)
        center_lon = sum(lon for _, lon in grid_points) / len(grid_points)

        center_clouds = await get_cloud_cover(center_lat, center_lon)

        # Apply same cloud cover to all points
        return [center_clouds] * len(grid_points)

    elif sample_strategy == "sparse":
        # Sample ~10 points across the area, interpolate for others
        return await _sample_and_interpolate(grid_points, num_samples=10)

    elif sample_strategy == "moderate":
        # Sample ~25 points
        return await _sample_and_interpolate(grid_points, num_samples=25)

    elif sample_strategy == "all":
        # Call API for every point (use with caution!)
        tasks = [get_cloud_cover(lat, lon) for lat, lon in grid_points]
        return await asyncio.gather(*tasks)

    else:
        raise ValueError(f"Unknown strategy: {sample_strategy}")


async def _sample_and_interpolate(
    grid_points: List[Tuple[float, float]],
    num_samples: int
) -> List[Optional[float]]:
    """
    Sample a subset of points and interpolate cloud cover for the rest.
    """
    if len(grid_points) <= num_samples:
        # If we have fewer points than samples, just get all of them
        tasks = [get_cloud_cover(lat, lon) for lat, lon in grid_points]
        return await asyncio.gather(*tasks)

    # Sample points evenly across the grid
    sample_indices = _get_sample_indices(len(grid_points), num_samples)
    sample_points = [grid_points[i] for i in sample_indices]

    # Get cloud cover for sample points
    tasks = [get_cloud_cover(lat, lon) for lat, lon in sample_points]
    sample_clouds = await asyncio.gather(*tasks)

    # Interpolate for all points
    all_clouds = []
    for lat, lon in grid_points:
        cloud = _interpolate_cloud_cover(lat, lon, sample_points, sample_clouds)
        all_clouds.append(cloud)

    return all_clouds


def _get_sample_indices(total: int, num_samples: int) -> List[int]:
    """
    Get evenly distributed sample indices.
    """
    if num_samples >= total:
        return list(range(total))

    step = total / num_samples
    return [int(i * step) for i in range(num_samples)]


def _interpolate_cloud_cover(
    lat: float,
    lon: float,
    sample_points: List[Tuple[float, float]],
    sample_clouds: List[Optional[float]]
) -> Optional[float]:
    """
    Interpolate cloud cover using inverse distance weighting.
    """
    # Filter out None values
    valid_samples = [
        (slat, slon, cloud)
        for (slat, slon), cloud in zip(sample_points, sample_clouds)
        if cloud is not None
    ]

    if not valid_samples:
        return None

    # Find nearest sample point
    min_dist = float('inf')
    nearest_cloud = None

    for slat, slon, cloud in valid_samples:
        dist = math.sqrt((lat - slat)**2 + (lon - slon)**2)
        if dist < min_dist:
            min_dist = dist
            nearest_cloud = cloud

    # For cloud cover, nearest neighbor is usually good enough
    # (clouds don't vary much over small distances)
    return nearest_cloud


def estimate_api_calls(num_grid_points: int, strategy: str) -> int:
    """
    Estimate how many API calls a strategy will use.
    """
    if strategy == "single":
        return 1
    elif strategy == "sparse":
        return min(10, num_grid_points)
    elif strategy == "moderate":
        return min(25, num_grid_points)
    elif strategy == "all":
        return num_grid_points
    else:
        return 0
