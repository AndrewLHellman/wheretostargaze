from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import Point
from models.schemas import CustomSpot, HeatmapPoint, SpotRequest, SpotResponse, RecommendedSpot
from services.isochrone import get_search_area, generate_grid_points, polygon_to_geojson
from services.light_pollution import (
    get_light_pollution_score,
    get_quality_description,
    load_light_pollution_data,
    get_dataset_info
)
from services.places import calculate_stargazing_score, find_best_stargazing_spots
from services.cloud_cover import get_cloud_cover, get_cloud_quality_score
from services.cloud_cover_strategy import get_cloud_cover_for_area, estimate_api_calls
from cache import get_cache_stats
from services.get_astronomy_details import get_astronomy_details
import traceback
import logging
import asyncio
from datetime import datetime
from services.tree_density import load_tree_density_data, get_tree_density_scores_batch
from tinydb import TinyDB, Query

# Create (or open) a database file
db = TinyDB('map_data.json')
locations = db.table('locations')

logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s:     %(name)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="WhereToStargaze API",
    description="Find the best stargazing spots near you",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("Loading light pollution data...")
    load_light_pollution_data()
    logger.info("Loading tree density data...")
    load_tree_density_data()

@app.post("/api/spots", response_model=SpotResponse)
async def get_stargazing_spots(request: SpotRequest):
    try:
        logger.info(f"Processing request for lat={request.latitude}, lon={request.longitude}")

        polygon = await get_search_area(
            request.latitude,
            request.longitude,
            request.drive_time_minutes,
            request.radius_miles
        )

        grid_points = generate_grid_points(polygon, spacing_miles=2.0)

        pollution_tasks = [
            get_light_pollution_score(lat, lon)
            for lat, lon in grid_points
        ]
        pollution_scores = await asyncio.gather(*pollution_tasks)
        tree_scores = await get_tree_density_scores_batch(grid_points)

        cloud_covers = await get_cloud_cover_for_area(
            grid_points,
            sample_strategy="sparse"
        )

        api_calls = estimate_api_calls(len(grid_points), "sparse")
        logger.info(f"Cloud cover: {api_calls} API calls for {len(grid_points)} points")

        heatmap = [
            HeatmapPoint(lat=lat, lon=lon, pollution_score=score, cloud_cover=cloud, tree_density=tree, stargazing_score=calculate_stargazing_score(score, cloud))
            for (lat, lon), score, cloud, tree in zip(grid_points, pollution_scores, cloud_covers, tree_scores)
        ]

        best_spots = await find_best_stargazing_spots(
            grid_points,
            pollution_scores,
            cloud_covers,
            tree_scores,
            max_spots=10
        )

        recommended_spots = [
            RecommendedSpot(
                name=spot['name'],
                lat=spot['lat'],
                lon=spot['lon'],
                pollution_score=spot['pollution_score'],
                cloud_cover=spot.get('cloud_cover'),
                tree_density_score=spot.get('tree_density_score'),
                stargazing_score=spot.get('stargazing_score'),
                place_type=spot['place_type'],
                rating=spot.get('rating'),
                address=spot.get('address') or get_quality_description(spot['pollution_score']),
                google_place_id=spot.get('place_id')
            )
            for spot in best_spots
        ]
        
        custom_spots = locations.all() # type: ignore
        spots_in_polygon = [
            spot for spot in custom_spots
            if polygon.contains(Point(spot['lon'], spot['lat']))
        ]
        custom_tree_scores = await get_tree_density_scores_batch([(spot['lat'], spot['lon']) for spot in spots_in_polygon])
        i = 0
        for spot in spots_in_polygon:
            lat, lon = spot['lat'], spot['lon']
            pollution = await get_light_pollution_score(lat, lon)
            cloud_cover = await get_cloud_cover(lat, lon)
            tree_density = custom_tree_scores[i]
            stargazing_score = calculate_stargazing_score(
                pollution,
                cloud_cover,
                tree_density,
                pollution,
            )
            recommended_spots.append(RecommendedSpot(
                name=spot['name'],
                lat=lat,
                lon=lon,
                pollution_score=pollution,
                cloud_cover=cloud_cover,
                tree_density_score=tree_density,
                stargazing_score=stargazing_score,
                place_type='custom_spot',
                rating=None,
                address='N/A',
                google_place_id='N/A'

            ))
            i += 1

        return SpotResponse(
            heatmap=heatmap,
            recommended_spots=recommended_spots,
            search_area=polygon_to_geojson(polygon)
        )
    except Exception as e:
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "WhereToStargaze API is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/cache/stats")
async def cache_stats():
    return get_cache_stats()

@app.get("/api/astronomy")
async def get_astronomy(latitude: float, longitude: float, date: str = None, time: str = "20:00:00"):

    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")

    try:
        celestial_bodies = await get_astronomy_details(latitude, longitude, date, time)
        return {"celestial_bodies": celestial_bodies}
    except Exception as e:
        logger.error(f"Error fetching astronomy details: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug/dataset")
async def debug_dataset():
    """Get information about the light pollution dataset"""
    return get_dataset_info()

@app.get("/debug/tree-density")
async def debug_tree_density(lat: float = 38.9634, lon: float = -92.3293):
    """Test tree density lookup for a specific location"""
    try:
        from services.tree_density import get_tree_density_score, _tree_dataset_stats

        score = await get_tree_density_score(lat, lon)

        return {
            "location": {"lat": lat, "lon": lon},
            "tree_density_score": score,
            "interpretation": {
                "score": score,
                "description": "0=no trees, 0.3=open, 0.6=moderate, 1.0=dense forest"
            },
            "dataset_info": _tree_dataset_stats if _tree_dataset_stats else {"status": "not_loaded"}
        }
    except Exception as e:
        logger.error(f"Error testing tree density: {e}")
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/debug/test-location")
async def debug_test_location(lat: float = 38.9634, lon: float = -92.3293):
    """Test light pollution lookup for a specific location"""
    try:
        score = await get_light_pollution_score(lat, lon)
        from services.light_pollution import pollution_score_to_bortle
        bortle = pollution_score_to_bortle(score)
        description = get_quality_description(score)

        return {
            "location": {"lat": lat, "lon": lon},
            "pollution_score": score,
            "bortle_scale": bortle,
            "description": description,
            "dataset_info": get_dataset_info()
        }
    except Exception as e:
        logger.error(f"Error testing location: {e}")
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

class CustomSpotBody(BaseModel):
    lat: float
    lon: float
    name: str

@app.post("/api/spots/custom")
async def add_custom_spot(body: CustomSpotBody):
    locations.insert({
        'name': body.name,
        'lat': body.lat,
        'lon': body.lon
    })
    return locations.all()

# debug delete
@app.delete("/api/spots/custom")
async def delete_custom_spots():
    return locations.remove()
