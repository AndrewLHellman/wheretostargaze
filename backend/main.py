from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import SpotRequest, SpotResponse, LightPollutionPoint, RecommendedSpot
from services.isochrone import get_search_area, generate_grid_points, polygon_to_geojson

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
        polygon = await get_search_area(
            request.latitude,
            request.longitude,
            request.drive_time_minutes,
            request.radius_miles
        )

        grid_points = generate_grid_points(polygon, spacing_miles=2.0)

        heatmap = [
            LightPollutionPoint(lat=lat, lon=lon, pollution_score=0.5)
            for lat, lon in grid_points[:50]
        ]

        recommended_spots = [
            RecommendedSpot(
                name="Test Spot",
                lat=request.latitude + 0.01,
                lon=request.longitude + 0.01,
                pollution_score=0.3,
                place_type="park",
                rating=4.5
            )
        ]

        return SpotResponse(
            heatmap=heatmap,
            recommended_spots=recommended_spots,
            search_area=polygon_to_geojson(polygon)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "WhereToStargaze API is running", "docs": "/docs"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
