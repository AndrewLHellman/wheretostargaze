import pytest
from fastapi import status

def test_root_endpoint(client):
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()

def test_health_endpoint(client):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "healthy"}

def test_get_spots_with_drive_time(client, sample_request):
    """Test getting spots with drive time"""
    response = client.post("/api/spots", json=sample_request)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "heatmap" in data
    assert "recommended_spots" in data
    assert "search_area" in data
    assert isinstance(data["heatmap"], list)
    assert isinstance(data["recommended_spots"], list)

def test_get_spots_with_radius(client, sample_radius_request):
    """Test getting spots with radius"""
    response = client.post("/api/spots", json=sample_radius_request)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert "heatmap" in data
    assert len(data["heatmap"]) > 0

def test_invalid_latitude(client):
    """Test with invalid latitude"""
    invalid_request = {
        "latitude": 95.0,  # Invalid: > 90
        "longitude": -92.3293,
        "radius_miles": 10
    }
    response = client.post("/api/spots", json=invalid_request)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_invalid_longitude(client):
    """Test with invalid longitude"""
    invalid_request = {
        "latitude": 38.9634,
        "longitude": 200.0,  # Invalid: > 180
        "radius_miles": 10
    }
    response = client.post("/api/spots", json=invalid_request)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_missing_required_fields(client):
    """Test with missing required fields"""
    invalid_request = {
        "latitude": 38.9634
        # Missing longitude
    }
    response = client.post("/api/spots", json=invalid_request)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_no_search_params_uses_default(client):
    """Test that default radius is used when no search params provided"""
    request = {
        "latitude": 38.9634,
        "longitude": -92.3293
        # No drive_time_minutes or radius_miles
    }
    response = client.post("/api/spots", json=request)
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert len(data["heatmap"]) > 0

def test_heatmap_points_structure(client, sample_request):
    """Test that heatmap points have correct structure"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if len(data["heatmap"]) > 0:
        point = data["heatmap"][0]
        assert "lat" in point
        assert "lon" in point
        assert "pollution_score" in point
        assert isinstance(point["pollution_score"], (int, float))

def test_recommended_spots_structure(client, sample_request):
    """Test that recommended spots have correct structure"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if len(data["recommended_spots"]) > 0:
        spot = data["recommended_spots"][0]
        assert "name" in spot
        assert "lat" in spot
        assert "lon" in spot
        assert "pollution_score" in spot
        assert "place_type" in spot

def test_search_area_geojson_structure(client, sample_request):
    """Test that search_area is valid GeoJSON"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if data["search_area"]:
        assert "type" in data["search_area"]
        assert "coordinates" in data["search_area"]
        assert data["search_area"]["type"] == "Polygon"
