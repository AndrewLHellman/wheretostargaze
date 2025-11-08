from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import SpotRequest, SpotResponse, LightPollutionPoint, RecommendedSpot
from services.isochrone import get_search_area, generate_grid_points, polygon_to_geojson
from services.light_pollution import get_light_pollution_score, get_quality_description
from cache import get_cache_stats
import traceback
import logging
import asyncio

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

        heatmap = [
            LightPollutionPoint(lat=lat, lon=lon, pollution_score=score)
            for (lat, lon), score in zip(grid_points, pollution_scores)
        ]

        sorted_points = sorted(zip(grid_points, pollution_scores), key=lambda x: x[1])
        best_spots = sorted_points[:5]

        recommended_spots = [
            RecommendedSpot(
                name=f"Dark Sky Location {i+1}",
                lat=lat,
                lon=lon,
                pollution_score=score,
                place_type="dark_site",
                rating=None,
                address=get_quality_description(score)
            )
            for i, ((lat, lon), score) in enumerate(best_spots)
        ]

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
