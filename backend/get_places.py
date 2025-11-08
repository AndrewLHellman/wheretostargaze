import os
import requests
from dotenv import load_dotenv

def search_places(loc_type, latitude, longitude, radius):
    location = f"{latitude},{longitude}"
    load_dotenv()
    api_key = os.getenv('GOOGLE_PLACES_API_KEY')
    endpoint_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    params = {
        'location': location,
        'radius': radius,
        'type': loc_type,
        'key': api_key,
        'photo': 'true'
    }

    response = requests.get(endpoint_url, params=params)
    response_json = response.json()

    for place in response_json['results']:
        print(f'Name: {place["name"]}, Address: {place["vicinity"]}')
        if 'photos' in place:
            # Gets first photo for the place
            photo_ref = place['photos'][0]['photo_reference']

            photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_ref}&key={api_key}"
            print(f'Photo URL: {photo_url}')

    return response_json['results']

# Example search for parks in a 2km radius around Columbia, MO
search_places('park', '38.963362978884966', '-92.32926739885085', 2000) 