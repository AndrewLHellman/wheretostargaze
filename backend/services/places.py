import httpx
from typing import List, Tuple, Optional
import logging
from config import settings
from cache import cache_response

logger = logging.getLogger(__name__)

EXCLUDED_KEYWORDS = [
    'advertising', 'construction', 'storage', 'concrete', 'church',
    'hotel', 'motel', 'gas station', 'store', 'shop', 'restaurant',
    'bar', 'clinic', 'hospital', 'school', 'office'
]

def is_stargazing_friendly(place_name: str, place_type: str) -> bool:
    if place_type in ['campground', 'park']:
        return True

    if place_type == 'point_of_interest':
        name_lower = place_name.lower()

        if any(keyword in name_lower for keyword in EXCLUDED_KEYWORDS):
            return False

        good_keywords = ['farm', 'ranch', 'observatory', 'nature', 'wildlife',
                'conservation', 'preserve', 'overlook', 'viewpoint',
                'recreation', 'trail', 'lake', 'river', 'forest']

        if any(keyword in name_lower for keyword in good_keywords):
            return True

        return False

    return True

def calculate_stargazing_score(
    pollution_score: float,
    cloud_cover: Optional[float],
    tree_density: Optional[float] = None,
    pollution_weight: float = 0.6,
    cloud_weight: float = 0.3,
    tree_weight: float = 0.1
) -> float:

    # Convert pollution to quality (invert: low pollution = high quality)
    pollution_quality = 1.0 - pollution_score

    # Convert cloud cover to quality
    if cloud_cover is not None:
        cloud_quality = 1.0 - (cloud_cover / 100.0)
    else:
        cloud_quality = 0.5  # Neutral if unknown

    # Convert tree density to quality (low density = high quality for stargazing)
    if tree_density is not None:
        tree_quality = 1.0 - tree_density
    else:
        tree_quality = 0.5  # Neutral if unknown (was 0.0)

    # Weighted combination
    combined_score = (
        (pollution_quality * pollution_weight) +
        (cloud_quality * cloud_weight) +
        (tree_quality * tree_weight)
    )

    return combined_score

@cache_response(ttl_seconds=2592000, prefix="places")
async def search_nearby_places(lat: float, lon: float, radius_meters: int = 5000) -> List[dict]:
    if not settings.google_places_api_key or settings.google_places_api_key == "dummy_key_for_testing":
        logger.warning("Google Places API key not configured")
        return []

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    places = []

    place_types = ['park', 'campground']

    for place_type in place_types:
        params = {
            'location': f'{lat},{lon}',
            'radius': radius_meters,
            'type': place_type,
            'key': settings.google_places_api_key
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()

                if data.get('status') == 'OK':
                    for place in data.get('results', [])[:10]:
                        place_name = place.get('name', '')

                        if not is_stargazing_friendly(place_name, place_type):
                            continue

                        places.append({
                            'name': place_name,
                            'lat': place['geometry']['location']['lat'],
                            'lon': place['geometry']['location']['lng'],
                            'place_type': place_type,
                            'rating': place.get('rating'),
                            'address': place.get('vicinity'),
                            'place_id': place.get('place_id')
                        })
        except Exception as e:
            logger.error(f"Error searching for {place_type}: {e}")
            continue

    return places

async def find_best_stargazing_spots(
    grid_points: List[Tuple[float, float]],
    pollution_scores: List[float],
    cloud_covers: Optional[List[Optional[float]]] = None,
    tree_density_scores: Optional[List[float]] = None,
    max_spots: int = 10,
    pollution_weight: float = 0.5,
    cloud_weight: float = 0.25,
    tree_weight: float = 0.25
) -> List[dict]:
    if cloud_covers is None:
        cloud_covers = [None] * len(grid_points)
    if tree_density_scores is None:
        tree_density_scores = [None] * len(grid_points)

    combined_scores = [
        calculate_stargazing_score(
            pollution,
            cloud,
            tree_density,
            pollution_weight,
            cloud_weight,
            tree_weight
        )
        for pollution, cloud, tree_density in zip(pollution_scores, cloud_covers, tree_density_scores)
    ]

    sorted_points = sorted(
        zip(grid_points, pollution_scores, cloud_covers, tree_density_scores, combined_scores),
        key=lambda x: x[4],
        reverse=True
    )

    recommended_spots = []
    seen_places = set()

    priority_types = ['campground', 'park', 'point_of_interest']

    for (lat, lon), pollution, cloud, tree_density, combined_score in sorted_points[:5]:
        places = await search_nearby_places(lat, lon, radius_meters=5000)

        def place_priority(place):
            try:
                return priority_types.index(place['place_type'])
            except ValueError:
                return len(priority_types)

        places_sorted = sorted(places, key=place_priority)

        for place in places_sorted:
            place_id = place.get('place_id')

            if not place['name'] or (place_id and place_id in seen_places):
                continue

            if place_id:
                seen_places.add(place_id)

            place['pollution_score'] = pollution
            place['cloud_cover'] = cloud
            place['tree_density_score'] = tree_density
            place['stargazing_score'] = combined_score
            recommended_spots.append(place)

            if len(recommended_spots) >= max_spots:
                return recommended_spots

    return recommended_spots
