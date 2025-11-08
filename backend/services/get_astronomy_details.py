import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

def get_astronomy_details(latitude, longitude, date, time="12:00:00"):

    endpoint_url = "https://api.astronomyapi.com/api/v2/bodies/positions"

    # Sets up credentials for Astronomy API
    load_dotenv()
    application_id = os.getenv('ASTRONOMY_ID')
    application_secret = os.getenv('ASTRONOMY_SECRET')

    params = {
    "latitude": latitude,
    "longitude": longitude,
    "elevation": 0,
    "from_date": date,
    "to_date": date,
    "time": time
    }

    # Receives table of celestial bodies' positions
    response = requests.get(endpoint_url, params=params, auth=HTTPBasicAuth(application_id, application_secret))
    response_json = response.json()
    # print(response_json)

    celestial_bodies = {}

    # Finds celestial bodies that are currently visible
    # Iterates through each celestial body in response
    for body in response_json['data']['table']['rows']:
        name = body['entry']['name']
        altitude = float(body['cells'][0]['position']['horizontal']['altitude']['degrees'])
        azimuth = float(body['cells'][0]['position']['horizontal']['azimuth']['degrees'])
        constellation = body['cells'][0]['position']['constellation']['name']
        
        # If the celestial body is above the horizon, then it is visible
        if altitude > 0:
            celestial_bodies[name] = {
                'altitude': altitude,
                'azimuth': azimuth,
                'constellation': constellation
            }

    return celestial_bodies

# Example search for all visible celestial bodies on Nov 7, 2025 at noon at Columbia, MO
details = get_astronomy_details(38.963362978884966, -92.32926739885085, "2025-11-07", "12:00:00")

for name, details in details.items():
    altitude = details['altitude']
    azimuth = details['azimuth']
    constellation = details['constellation']
    print(f"{name} is visible at {altitude:.1f}° altitude, {azimuth:.1f}° azimuth")
    print(f"  Currently in constellation: {constellation}")