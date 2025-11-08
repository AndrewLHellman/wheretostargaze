import os
import httpx
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

async def get_astronomy_details(latitude, longitude, date, time="20:00:00"):

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

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(endpoint_url, params=params, auth=HTTPBasicAuth(application_id, application_secret))
            response_json = response.json()

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
    except Exception as e:
        print(f"Error fetching astronomy details: {str(e)}")
        return {}


# Test the function - only runs when script is executed directly
if __name__ == "__main__":
    import asyncio
    
    # Test coordinates - Columbia, MO
    test_latitude = 38.8904
    test_longitude = -92.2902
    test_date = "2025-11-08"
    test_time = "20:00:00"  # 8 PM
    
    async def test_astronomy():
        print(f"\nTesting astronomy details for:")
        print(f"Location: {test_latitude}, {test_longitude}")
        print(f"Date: {test_date}")
        print(f"Time: {test_time}\n")
        
        details = await get_astronomy_details(test_latitude, test_longitude, test_date, test_time)
        
        if details:
            print(f"Found {len(details)} visible celestial bodies:\n")
            for name, info in details.items():
                print(f"  {name}")
                print(f"    Altitude: {info['altitude']:.1f}°")
                print(f"    Azimuth: {info['azimuth']:.1f}°")
                print(f"    Constellation: {info['constellation']}")
                print()
        else:
            print("No celestial bodies found or error occurred")
    
    # Run the async test
    asyncio.run(test_astronomy())
