import os
from typing import Tuple, Optional
import logging
from cache import cache_response

logger = logging.getLogger(__name__)

LIGHT_POLLUTION_DATA = None

def initialize_light_pollution_data():
    global LIGHT_POLLUTION_DATA
    logger.info("Light pollution service initialized (using simplified model)")
    return None

async def get_light_pollution_score(lat: float, lon: float) -> float:
    cities = [
        (38.6270, -90.1994, 1.0),  # St. Louis
        (39.0997, -94.5786, 1.0),  # Kansas City
        (37.0902, -94.5135, 0.8),  # Springfield MO
        (38.9517, -92.3341, 0.7),  # Columbia MO
    ]

    min_pollution = 0.1

    for city_lat, city_lon, city_intensity in cities:
        distance = ((lat - city_lat)**2 + (lon - city_lon)**2)**0.5
        # Distance in degrees, roughly 69 miles per degree
        distance_miles = distance * 69

        if distance_miles < 100:
            pollution_contribution = city_intensity * (1 - (distance_miles / 100))
            min_pollution = max(min_pollution, pollution_contribution)

    return min(max(min_pollution, 0.0), 1.0)

def pollution_score_to_bortle(score: float) -> int:
    """
    Convert pollution score (0-1) to Bortle scale (1-9).
    1 = darkest, 9 = brightest
    """
    if score <= 0.1:
        return 1  # Excellent dark sky
    elif score <= 0.2:
        return 2  # Typical rural sky
    elif score <= 0.3:
        return 3  # Rural sky
    elif score <= 0.4:
        return 4  # Rural/suburban transition
    elif score <= 0.5:
        return 5  # Suburban sky
    elif score <= 0.6:
        return 6  # Bright suburban sky
    elif score <= 0.75:
        return 7  # Suburban/urban transition
    elif score <= 0.9:
        return 8  # City sky
    else:
        return 9  # Inner-city sky

def get_quality_description(score: float) -> str:
    """Get human-readable sky quality description"""
    bortle = pollution_score_to_bortle(score)

    descriptions = {
        1: "Excellent - Milky Way casts shadows",
        2: "Typical rural - Milky Way highly visible",
        3: "Rural - Milky Way visible",
        4: "Rural/Suburban - Milky Way weak",
        5: "Suburban - Milky Way very weak",
        6: "Bright Suburban - Milky Way invisible",
        7: "Suburban/Urban - Strong light sources",
        8: "City - Sky glow visible",
        9: "Inner City - Entire sky glowing"
    }

    return descriptions.get(bortle, "Unknown")
