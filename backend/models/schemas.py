from pydantic import BaseModel, Field
from typing import Optional, List

class SpotRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    drive_time_minutes: Optional[int] = Field(None, ge=5, le=120)
    radius_miles: Optional[float] = Field(None, ge=1, le=120)
    pollution_weight: Optional[int] = Field(50, ge=0, le=100)
    cloud_weight: Optional[int] = Field(25, ge=0, le=100)
    tree_weight: Optional[int] = Field(25, ge=0, le=100)

class HeatmapPoint(BaseModel):
    lat: float
    lon: float
    pollution_score: float
    cloud_cover: Optional[float] = None
    tree_density: Optional[float] = None
    stargazing_score: float

class RecommendedSpot(BaseModel):
    name: str
    lat: float
    lon: float
    pollution_score: float
    cloud_cover: Optional[float] = None
    tree_density_score: Optional[float] = None
    stargazing_score: Optional[float] = None
    place_type: str
    rating: Optional[float] = None
    address: Optional[str] = None
    google_place_id: Optional[str] = None

class SpotResponse(BaseModel):
    heatmap: List[HeatmapPoint]
    recommended_spots: List[RecommendedSpot]
    search_area: Optional[dict] = None

class CustomSpot(BaseModel):
    lat: float
    lon: float
    name: str
