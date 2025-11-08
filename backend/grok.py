import requests
import json
import os
from dotenv import load_dotenv


def get_grok_response(text_prompt):
    load_dotenv()
    api_key = os.getenv('GROK_API_KEY')

    prompt = f"""
    You are an astrological expert that is adjusting the following parameters of a stargazing
    app that helps users find the best locations to stargaze.

    If the user doesn't mention a specific parameter, keep it the same as before (50 out of 100).

    Parameters:
    Cloud coverage (0-100%): The percentage of the sky covered by clouds. Lower values are better for stargazing.
    Tree Density (0-100%): The density of trees in the area. Lower values are better for stargazing.
    Light pollution (0-100%): The amount of artificial light in the area. Lower values are better for stargazing.
    Accessibility (0-100%): How easy it is to access the location. Higher values are better for stargazing.

    Adjust these parameters based on the text prompt given by the user.
    User Prompt: {text_prompt}

    Return the adjusted parameters in JSON format as follows:
    {{
        "cloud_coverage": <value>,
        "tree_density": <value>,
        "light_pollution": <value>,
        "accessibility": <value>
    }}

    """

    response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",

    },
    data=json.dumps({
        "model": "x-ai/grok-4-fast",
        "messages": [
            {
            "role": "user",
            "content": [
                {
                "type": "text",
                "text": prompt
                }
            ]
            }
        ]
    })
    )

    response_json = response.json()
    results = json.loads(response_json['choices'][0]['message']['content'])
    return results

# Example GROK API call to adjust parameters
example_prompt = "I want to find a location with medium light pollution and low cloud coverage, but it doesn't have to be extremely accessible."
new_parameters = get_grok_response(example_prompt)
print(new_parameters)
