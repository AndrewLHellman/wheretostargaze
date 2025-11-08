import logging
from typing import Optional
from cache import cache_response
from config import settings
import rasterio
from rasterio.transform import rowcol
from rasterio.warp import transform_bounds
import numpy as np

logger = logging.getLogger(__name__)

_light_pollution_dataset = None
_dataset_stats = None

def load_light_pollution_data():
    """Load VIIRS light pollution raster data with diagnostics"""
    global _light_pollution_dataset, _dataset_stats

    data_path = settings.light_pollution_data_path

    try:
        import os
        if not os.path.exists(data_path):
            logger.error(f"❌ Light pollution data not found at {data_path}")
            logger.warning("Using simplified distance-based model")
            return None

        _light_pollution_dataset = rasterio.open(data_path)

        # Collect dataset statistics for debugging
        _dataset_stats = {
            'path': data_path,
            'size': f"{_light_pollution_dataset.width}x{_light_pollution_dataset.height}",
            'crs': str(_light_pollution_dataset.crs),
            'bounds': _light_pollution_dataset.bounds,
            'nodata': _light_pollution_dataset.nodata,
            'dtype': _light_pollution_dataset.dtypes[0],
            'transform': str(_light_pollution_dataset.transform)
        }

        logger.info(f"✓ Light pollution data loaded successfully")
        logger.info(f"  Path: {data_path}")
        logger.info(f"  Size: {_dataset_stats['size']}")
        logger.info(f"  CRS: {_dataset_stats['crs']}")
        logger.info(f"  Bounds: {_dataset_stats['bounds']}")
        logger.info(f"  NoData: {_dataset_stats['nodata']}")

        # Sample some data to verify it's readable
        center_row = _light_pollution_dataset.height // 2
        center_col = _light_pollution_dataset.width // 2
        sample_window = ((center_row-5, center_row+5), (center_col-5, center_col+5))
        sample_data = _light_pollution_dataset.read(1, window=sample_window)

        valid_samples = sample_data[sample_data != _light_pollution_dataset.nodata]
        if len(valid_samples) > 0:
            logger.info(f"  Sample stats: min={np.min(valid_samples):.2f}, "
                       f"max={np.max(valid_samples):.2f}, "
                       f"mean={np.mean(valid_samples):.2f}")
        else:
            logger.warning("  ⚠ All sample values are NoData")

        return _light_pollution_dataset

    except Exception as e:
        logger.error(f"❌ Error loading light pollution data: {e}")
        logger.warning("Using simplified distance-based model")
        import traceback
        traceback.print_exc()
        return None


@cache_response(ttl_seconds=31536000, prefix="light_pollution")
async def get_light_pollution_score(lat: float, lon: float) -> float:
    """
    Get light pollution score (0-1) for a location.

    Returns:
        float: Pollution score from 0 (darkest) to 1 (brightest)
    """
    global _light_pollution_dataset

    if _light_pollution_dataset is not None:
        try:
            # Convert lat/lon to raster coordinates
            row, col = rowcol(_light_pollution_dataset.transform, lon, lat)

            # Check if coordinates are within bounds
            if not (0 <= row < _light_pollution_dataset.height and 0 <= col < _light_pollution_dataset.width):
                logger.debug(f"Coordinates ({lat}, {lon}) -> pixel ({row}, {col}) out of bounds "
                           f"(dataset size: {_light_pollution_dataset.width}x{_light_pollution_dataset.height})")
                return await _get_distance_based_score(lat, lon)

            # Read the radiance value
            radiance = _light_pollution_dataset.read(1, window=((row, row+1), (col, col+1)))[0, 0]

            # Check for NoData
            if radiance == _light_pollution_dataset.nodata or np.isnan(radiance):
                logger.debug(f"NoData at ({lat}, {lon}) -> pixel ({row}, {col}), using fallback")
                return await _get_distance_based_score(lat, lon)

            # Log raw value occasionally for debugging
            if np.random.random() < 0.01:  # 1% of the time
                logger.debug(f"Sample: ({lat:.4f}, {lon:.4f}) -> radiance={radiance:.4f}")

            # VIIRS data is in nanoWatts/cm²/sr
            # Typical range: 0-100+ for bright cities, 0.1-10 for rural/suburban
            # We'll use a logarithmic scale to compress the range

            if radiance <= 0:
                score = 0.0
            else:
                # Logarithmic scaling:
                # radiance=0.1 -> score≈0.15 (dark rural)
                # radiance=1.0 -> score≈0.4 (suburban)
                # radiance=10 -> score≈0.65 (city)
                # radiance=100 -> score≈0.9 (bright city center)
                score = np.log10(radiance + 1) / 2.3
                score = min(1.0, max(0.0, score))

            return float(score)

        except Exception as e:
            logger.error(f"Error reading raster at ({lat}, {lon}): {e}")
            logger.debug(f"Dataset stats: {_dataset_stats}")
            import traceback
            traceback.print_exc()

    # Fallback to distance-based model
    return await _get_distance_based_score(lat, lon)


async def _get_distance_based_score(lat: float, lon: float) -> float:
    """
    Fallback: Simple distance-based light pollution estimate.

    This is used when:
    - Raster data is not available
    - Coordinates are outside raster bounds
    - Raster value is NoData
    """
    cities = [
        (38.6270, -90.1994, 1.0),  # St. Louis
        (39.0997, -94.5786, 1.0),  # Kansas City
        (37.0902, -94.5135, 0.8),  # Springfield MO
        (38.9517, -92.3341, 0.7),  # Columbia MO
    ]

    min_pollution = 0.1

    for city_lat, city_lon, city_intensity in cities:
        distance = ((lat - city_lat)**2 + (lon - city_lon)**2)**0.5
        # Distance in degrees, roughly 69 miles per degree
        distance_miles = distance * 69

        if distance_miles < 100:
            pollution_contribution = city_intensity * (1 - (distance_miles / 100))
            min_pollution = max(min_pollution, pollution_contribution)

    return min(max(min_pollution, 0.0), 1.0)


def pollution_score_to_bortle(score: float) -> int:
    """
    Convert pollution score (0-1) to Bortle scale (1-9).
    1 = darkest, 9 = brightest
    """
    if score <= 0.1:
        return 1  # Excellent dark sky
    elif score <= 0.2:
        return 2  # Typical rural sky
    elif score <= 0.3:
        return 3  # Rural sky
    elif score <= 0.4:
        return 4  # Rural/suburban transition
    elif score <= 0.5:
        return 5  # Suburban sky
    elif score <= 0.6:
        return 6  # Bright suburban sky
    elif score <= 0.75:
        return 7  # Suburban/urban transition
    elif score <= 0.9:
        return 8  # City sky
    else:
        return 9  # Inner-city sky


def get_quality_description(score: float) -> str:
    """Get human-readable sky quality description"""
    bortle = pollution_score_to_bortle(score)

    descriptions = {
        1: "Excellent - Milky Way casts shadows",
        2: "Typical rural - Milky Way highly visible",
        3: "Rural - Milky Way visible",
        4: "Rural/Suburban - Milky Way weak",
        5: "Suburban - Milky Way very weak",
        6: "Bright Suburban - Milky Way invisible",
        7: "Suburban/Urban - Strong light sources",
        8: "City - Sky glow visible",
        9: "Inner City - Entire sky glowing"
    }

    return descriptions.get(bortle, "Unknown")


def get_dataset_info() -> dict:
    """Get information about the loaded dataset for debugging"""
    if _light_pollution_dataset is None:
        return {"status": "not_loaded"}

    return {
        "status": "loaded",
        **_dataset_stats
    }
