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

def test_cache_stats_endpoint(client):
    """Test cache stats endpoint"""
    response = client.get("/cache/stats")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "status" in data

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

        # Pollution score should be between 0 and 1
        assert 0.0 <= point["pollution_score"] <= 1.0

def test_pollution_scores_vary(client, sample_request):
    """Test that pollution scores vary across grid points"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if len(data["heatmap"]) > 1:
        scores = [p["pollution_score"] for p in data["heatmap"]]
        # Should have some variation in scores
        assert len(set(scores)) > 1

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
        assert "address" in spot

        # Pollution score should be valid
        assert 0.0 <= spot["pollution_score"] <= 1.0

def test_recommended_spots_sorted_by_darkness(client, sample_request):
    """Test that recommended spots are sorted by pollution (darkest first)"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if len(data["recommended_spots"]) > 1:
        scores = [s["pollution_score"] for s in data["recommended_spots"]]
        # Scores should be in ascending order (darkest first)
        assert scores == sorted(scores)

def test_search_area_geojson_structure(client, sample_request):
    """Test that search_area is valid GeoJSON"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if data["search_area"]:
        assert "type" in data["search_area"]
        assert "coordinates" in data["search_area"]
        assert data["search_area"]["type"] == "Polygon"

def test_heatmap_coordinates_within_search_area(client, sample_request):
    """Test that heatmap points are within the search area bounds"""
    response = client.post("/api/spots", json=sample_request)
    data = response.json()

    if len(data["heatmap"]) > 0 and data["search_area"]:
        # Get bounds from polygon
        coords = data["search_area"]["coordinates"][0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]

        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)

        # Check that heatmap points are within bounds
        for point in data["heatmap"]:
            assert min_lat <= point["lat"] <= max_lat
            assert min_lon <= point["lon"] <= max_lon

def test_response_performance(client, sample_request):
    """Test that response is reasonably fast"""
    import time

    start = time.time()
    response = client.post("/api/spots", json=sample_request)
    elapsed = time.time() - start

    assert response.status_code == status.HTTP_200_OK
    # Should respond in under 2 seconds (generous for testing)
    assert elapsed < 2.0
