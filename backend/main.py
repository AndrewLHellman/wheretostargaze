from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import SpotRequest, SpotResponse, LightPollutionPoint, RecommendedSpot

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
    return SpotResponse(
        heatmap=[
            LightPollutionPoint(lat=request.latitude, lon=request.longitude, pollution_score=0.5)
        ],
        recommended_spots=[
            RecommendedSpot(
                name="Test Spot",
                lat=request.latitude + 0.01,
                lon=request.longitude + 0.01,
                pollution_score=0.3,
                place_type="park",
                rating=4.5
            )
        ]
    )

@app.get("/")
async def root():
    return {"message": "WhereToStargaze API is running", "docs": "/docs"}
