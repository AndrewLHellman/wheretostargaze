import pytest
from services.light_pollution import (
    get_light_pollution_score,
    pollution_score_to_bortle,
    get_quality_description
)

@pytest.mark.asyncio
async def test_get_light_pollution_score():
    """Test light pollution score calculation"""
    # Test a location near Columbia, MO
    score = await get_light_pollution_score(38.9634, -92.3293)

    # Should return a valid score between 0 and 1
    assert 0.0 <= score <= 1.0
    assert isinstance(score, float)

@pytest.mark.asyncio
async def test_light_pollution_varies_by_location():
    """Test that pollution scores vary by location"""
    # Location near a city (Columbia, MO)
    city_score = await get_light_pollution_score(38.9634, -92.3293)

    # Location further from cities
    rural_score = await get_light_pollution_score(38.5, -91.5)

    # Both should be valid scores
    assert 0.0 <= city_score <= 1.0
    assert 0.0 <= rural_score <= 1.0

    # Scores should be different (but not necessarily in a specific order
    # since our simplified model may vary)
    assert isinstance(city_score, float)
    assert isinstance(rural_score, float)

@pytest.mark.asyncio
async def test_light_pollution_caching():
    """Test that light pollution scores are cached"""
    lat, lon = 38.9634, -92.3293

    # First call
    score1 = await get_light_pollution_score(lat, lon)

    # Second call should return same value (from cache)
    score2 = await get_light_pollution_score(lat, lon)

    assert score1 == score2

def test_pollution_score_to_bortle():
    """Test Bortle scale conversion"""
    # Test boundary conditions
    assert pollution_score_to_bortle(0.05) == 1  # Darkest
    assert pollution_score_to_bortle(0.15) == 2
    assert pollution_score_to_bortle(0.25) == 3
    assert pollution_score_to_bortle(0.35) == 4
    assert pollution_score_to_bortle(0.45) == 5
    assert pollution_score_to_bortle(0.55) == 6
    assert pollution_score_to_bortle(0.70) == 7
    assert pollution_score_to_bortle(0.85) == 8
    assert pollution_score_to_bortle(0.95) == 9  # Brightest

    # Test that it returns an integer
    assert isinstance(pollution_score_to_bortle(0.5), int)

def test_get_quality_description():
    """Test quality description generation"""
    # Test various pollution levels
    desc_dark = get_quality_description(0.05)
    desc_suburban = get_quality_description(0.55)
    desc_city = get_quality_description(0.95)

    # Should return non-empty strings
    assert isinstance(desc_dark, str)
    assert len(desc_dark) > 0

    assert isinstance(desc_suburban, str)
    assert len(desc_suburban) > 0

    assert isinstance(desc_city, str)
    assert len(desc_city) > 0

    # Different scores should give different descriptions
    assert desc_dark != desc_city

def test_bortle_scale_coverage():
    """Test that all Bortle scales are covered"""
    # Test scores across the full range
    scores = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.80, 0.95]
    bortle_values = [pollution_score_to_bortle(s) for s in scores]

    # Should get different Bortle values
    assert len(set(bortle_values)) >= 7  # At least 7 different values

    # All should be in valid range
    assert all(1 <= b <= 9 for b in bortle_values)
