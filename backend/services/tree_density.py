import logging
from typing import Optional, List, Tuple
from cache import cache_response
from config import settings
import rasterio
from rasterio.transform import rowcol
from rasterio.warp import transform
import numpy as np

logger = logging.getLogger(__name__)

_tree_density_dataset = None
_tree_dataset_stats = None

def load_tree_density_data():
    """Load TreeMap2022 ALSTK (Above-ground Live STocK) raster data"""
    global _tree_density_dataset, _tree_dataset_stats

    data_path = settings.tree_density_data_path

    try:
        if data_path.startswith('http'):
            logger.info(f"Loading data from S3: {data_path}")

            _tree_density_dataset = rasterio.open(data_path)

            # aws_session = AWSSession(
            #     aws_access_key_id=settings.aws_access_key_id,
            #     aws_secret_access_key=settings.aws_secret_access_key
            # )
            # with rasterio.Env(aws_session):
            #     _tree_density_dataset = rasterio.open(data_path)
        else:
            import os
            if not os.path.exists(data_path):
                logger.warning(f"⚠️  Tree density data not found at {data_path}")
                logger.info("Tree density features will be disabled. The app will still work normally.")
                logger.info("To enable tree density: Download TreeMap2022_CONUS_ALSTK.tif and place it in data/tree_density/")
                return None

            _tree_density_dataset = rasterio.open(data_path)

            _tree_dataset_stats = {
                'path': data_path,
                'size': f"{_tree_density_dataset.width}x{_tree_density_dataset.height}",
                'crs': str(_tree_density_dataset.crs),
                'bounds': _tree_density_dataset.bounds,
                'nodata': _tree_density_dataset.nodata,
                'dtype': _tree_density_dataset.dtypes[0]
            }

        logger.info(f"✓ Tree density data loaded successfully")
        logger.info(f"  Path: {data_path}")
        # logger.info(f"  Size: {_tree_dataset_stats['size']}")

        return _tree_density_dataset

    except Exception as e:
        logger.error(f"❌ Error loading tree density data: {e}")
        logger.info("Tree density features will be disabled. The app will still work normally.")
        return None

def close_tree_density_data():
    """Close the tree density dataset to free resources"""
    global _tree_density_dataset
    if _tree_density_dataset is not None:
        _tree_density_dataset.close()
        _tree_density_dataset = None
        logger.info("Tree density dataset closed")

@cache_response(ttl_seconds=31536000, prefix="tree_density")
async def get_tree_density_score(lat: float, lon: float) -> float:
    """
    Get tree density score (0-1) for a location.
    ALSTK = Above-ground Live Stock (tons per acre)

    Returns:
        float: Tree density from 0 (no trees) to 1 (dense forest)
    """
    global _tree_density_dataset

    if _tree_density_dataset is None:
        logger.warning("Tree density dataset not loaded, returning default 0.0")
        return 0.0  # If dataset not loaded, assume open sky

    try:
        # Transform lat/lon (EPSG:4326) to dataset CRS (EPSG:5070)
        xs, ys = transform('EPSG:4326', _tree_density_dataset.crs, [lon], [lat])
        x, y = xs[0], ys[0]

        logger.debug(f"Transformed ({lat}, {lon}) -> ({x:.2f}, {y:.2f}) in {_tree_density_dataset.crs}")

        # Convert projected coordinates to raster row/col
        row, col = rowcol(_tree_density_dataset.transform, x, y)

        logger.debug(f"Pixel coordinates: row={row}, col={col} (bounds: 0-{_tree_density_dataset.height}, 0-{_tree_density_dataset.width})")

        if not (0 <= row < _tree_density_dataset.height and
                0 <= col < _tree_density_dataset.width):
            logger.debug(f"Coordinates ({lat}, {lon}) -> pixel ({row}, {col}) OUT OF BOUNDS")
            return 0.0  # Out of bounds = not in CONUS forest areas = assume open

        alstk_value = _tree_density_dataset.read(1, window=((row, row+1), (col, col+1)))[0, 0]

        logger.debug(f"Raw ALSTK value: {alstk_value}, NoData value: {_tree_density_dataset.nodata}")

        if alstk_value == _tree_density_dataset.nodata or np.isnan(alstk_value):
            logger.debug(f"NoData at ({lat}, {lon}), assuming no forest cover (urban/water), returning 0.0")
            return 0.0  # NoData = no forest coverage = open sky = good for stargazing

        # ALSTK values typically range from 0-200+ tons/acre
        # Normalize to 0-1 scale
        # Higher values = denser forest (worse for stargazing due to blocked sky)
        normalized = min(alstk_value / 150.0, 1.0)

        logger.debug(f"SUCCESS: Tree density at ({lat}, {lon}) = {normalized:.3f} (raw ALSTK={alstk_value:.2f})")

        return float(normalized)

    except Exception as e:
        logger.error(f"Error reading tree density at ({lat}, {lon}): {e}")
        import traceback
        traceback.print_exc()
        return 0.0  # Error = assume open sky

# Batch processing for performance
async def get_tree_density_scores_batch(points: List[Tuple[float, float]]) -> List[float]:
    """Get tree density for multiple points efficiently"""
    global _tree_density_dataset

    if _tree_density_dataset is None or len(points) == 0:
        return [0.0] * len(points)  # No dataset = assume open sky

    try:
        # Transform all lat/lon points to dataset CRS at once
        lats = [p[0] for p in points]
        lons = [p[1] for p in points]
        xs, ys = transform('EPSG:4326', _tree_density_dataset.crs, lons, lats)

        # Find bounding box in projected coordinates
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        min_row, min_col = rowcol(_tree_density_dataset.transform, min_x, min_y)
        max_row, max_col = rowcol(_tree_density_dataset.transform, max_x, max_y)

        if min_row > max_row:
            min_row, max_row = max_row, min_row
        if min_col > max_col:
            min_col, max_col = max_col, min_col

        min_row = max(0, min_row - 1)
        min_col = max(0, min_col - 1)
        max_row = min(_tree_density_dataset.height - 1, max_row + 1)
        max_col = min(_tree_density_dataset.width - 1, max_col + 1)

        window = ((min_row, max_row + 1), (min_col, max_col + 1))
        raster_data = _tree_density_dataset.read(1, window=window)

        scores = []
        for x, y in zip(xs, ys):
            try:
                row, col = rowcol(_tree_density_dataset.transform, x, y)
                rel_row = row - min_row
                rel_col = col - min_col

                if not (0 <= rel_row < raster_data.shape[0] and
                        0 <= rel_col < raster_data.shape[1]):
                    scores.append(0.0)  # Out of bounds = open
                    continue

                alstk_value = raster_data[rel_row, rel_col]

                if alstk_value == _tree_density_dataset.nodata or np.isnan(alstk_value):
                    scores.append(0.0)  # NoData = no forest = open sky
                    continue

                normalized = min(alstk_value / 150.0, 1.0)
                scores.append(float(normalized))

            except Exception as e:
                logger.error(f"Error processing point: {e}")
                scores.append(0.0)  # Error = assume open

        return scores

    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        import traceback
        traceback.print_exc()
        return [0.0] * len(points)  # Error = assume open
