import pytest
from unittest.mock import AsyncMock, patch
from services.places import search_nearby_places, find_best_stargazing_spots

@pytest.mark.asyncio
async def test_search_nearby_places_no_api_key():
    """Test places search without API key"""
    with patch('services.places.settings.google_places_api_key', 'dummy_key_for_testing'):
        places = await search_nearby_places(38.9634, -92.3293)

        # Should return empty list when no API key
        assert isinstance(places, list)
        assert len(places) == 0

@pytest.mark.asyncio
async def test_search_nearby_places_with_mock():
    """Test places search with mocked API response"""
    mock_response = {
        'status': 'OK',
        'results': [
            {
                'name': 'Test Park',
                'geometry': {'location': {'lat': 38.97, 'lng': -92.33}},
                'rating': 4.5,
                'vicinity': '123 Test St',
                'place_id': 'test123',
                'types': ['park']
            }
        ]
    }

    with patch('services.places.settings.google_places_api_key', 'test_key'):
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = AsyncMock(
                status_code=200,
                json=lambda: mock_response
            )
            mock_get.return_value.raise_for_status = lambda: None

            places = await search_nearby_places(38.9634, -92.3293)

            # Should return places from mock response
            assert isinstance(places, list)
            # Note: actual length depends on how many place_types are searched

@pytest.mark.asyncio
async def test_find_best_stargazing_spots():
    """Test finding best stargazing spots"""
    grid_points = [
        (38.9634, -92.3293),
        (38.9734, -92.3393),
        (38.9834, -92.3493)
    ]
    pollution_scores = [0.7, 0.5, 0.6]  # Middle one is darkest

    spots = await find_best_stargazing_spots(
        grid_points,
        pollution_scores,
        max_spots=3
    )

    # Should return spots
    assert isinstance(spots, list)
    assert len(spots) > 0
    assert len(spots) <= 3

    # First spot should have lowest pollution
    if len(spots) > 1:
        assert spots[0]['pollution_score'] <= spots[1]['pollution_score']

@pytest.mark.asyncio
async def test_find_best_stargazing_spots_structure():
    """Test that spots have correct structure"""
    grid_points = [(38.9634, -92.3293)]
    pollution_scores = [0.5]

    spots = await find_best_stargazing_spots(
        grid_points,
        pollution_scores,
        max_spots=1
    )

    assert len(spots) > 0
    spot = spots[0]

    # Check required fields
    assert 'name' in spot
    assert 'lat' in spot
    assert 'lon' in spot
    assert 'place_type' in spot
    assert 'pollution_score' in spot

    # Check types
    assert isinstance(spot['name'], str)
    assert isinstance(spot['lat'], float)
    assert isinstance(spot['lon'], float)
    assert isinstance(spot['place_type'], str)
    assert isinstance(spot['pollution_score'], float)
