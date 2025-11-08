import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_request():
    return {
        "latitude": 38.9634,
        "longitude": -92.3293,
        "drive_time_minutes": 30
    }

@pytest.fixture
def sample_radius_request():
    return {
        "latitude": 38.9634,
        "longitude": -92.3293,
        "radius_miles": 15
    }
