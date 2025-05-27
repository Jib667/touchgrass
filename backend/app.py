from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import google.generativeai as genai
import requests # For Google Places API calls
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

app = Flask(__name__)
CORS(app)

# Configure Gemini API key
GEMINI_API_KEY = os.getenv('VITE_GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Google Places API Key
PLACES_API_KEY = os.getenv('VITE_GOOGLE_MAPS_API_KEY')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "TouchGrass API is running"})

@app.route('/api/generate-itinerary', methods=['POST'])
def generate_itinerary_proxy():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
    try:
        data = request.get_json()
        if not data or 'prompt' not in data:
            return jsonify({"error": "Missing 'prompt' in request body"}), 400

        prompt = data['prompt']
        
        model = genai.GenerativeModel('gemini-1.5-flash') # Or your preferred model
        response = model.generate_content(prompt)
        
        # Assuming the response object has a 'text' attribute or similar
        # Adjust based on the actual structure of the Gemini API response
        if hasattr(response, 'text'):
            return jsonify({"itinerary_text": response.text})
        elif hasattr(response, 'parts') and len(response.parts) > 0 and hasattr(response.parts[0], 'text'):
             return jsonify({"itinerary_text": response.parts[0].text})
        else:
            # Log the response to see its structure if it's not as expected
            print(f"Unexpected Gemini response structure: {response}")
            return jsonify({"error": "Unexpected response structure from Gemini API"}), 500

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/places/autocomplete', methods=['POST'])
def places_autocomplete_proxy():
    if not PLACES_API_KEY:
        return jsonify({"error": "Google Places API key not configured"}), 500
    try:
        data = request.get_json()
        if not data or 'input' not in data:
            return jsonify({"error": "Missing 'input' in request body"}), 400
        
        input_text = data['input']
        language = data.get('languageCode', 'en') # Default to English
        
        # Construct the Places Autocomplete URL
        # https://developers.google.com/maps/documentation/places/web-service/autocomplete
        api_url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        params = {
            "input": input_text,
            "key": PLACES_API_KEY,
            "language": language
        }
        
        # Include optional parameters if provided by the frontend
        if 'location' in data: # e.g., "lat,lng"
            params['location'] = data['location']
        if 'radius' in data: # in meters
            params['radius'] = data['radius']
        if 'strictbounds' in data:
            params['strictbounds'] = "" # Presence of parameter enables it
        if 'types' in data: # e.g. "geocode" or "establishment"
            params['types'] = data['types']

        response = requests.get(api_url, params=params)
        response.raise_for_status() # Raise an exception for bad status codes
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        print(f"Error calling Google Places Autocomplete API: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected error in places_autocomplete_proxy: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/places/details/<place_id>', methods=['GET'])
def place_details_proxy(place_id):
    if not PLACES_API_KEY:
        return jsonify({"error": "Google Places API key not configured"}), 500
    try:
        fields = request.args.get('fields', 'place_id,name,geometry,formatted_address,type,rating,user_ratings_total,photos,reviews,opening_hours,website,international_phone_number') # Default fields
        
        # Construct the Place Details URL
        # https://developers.google.com/maps/documentation/places/web-service/details
        api_url = f"https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "fields": fields,
            "key": PLACES_API_KEY
        }
        
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        print(f"Error calling Google Place Details API: {e}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected error in place_details_proxy: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/places/nearby', methods=['POST'])
def places_nearby_proxy():
    if not PLACES_API_KEY:
        return jsonify({"error": "Google Places API key not configured"}), 500
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing request body"}), 400

        # Construct the Nearby Search URL
        # https://developers.google.com/maps/documentation/places/web-service/search-nearby
        # Note: The new Places API (v1) `places:searchNearby` uses POST and a different structure.
        # The current `Dashboard.jsx` uses `places:searchNearby`. Let's adapt to that.
        
        api_url = f"https://places.googleapis.com/v1/places:searchNearby"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": PLACES_API_KEY, # New Places API uses this header for key
            "X-Goog-FieldMask": data.get('fields', "places.displayName,places.rating,places.userRatingCount,places.location,places.id") # Default fields from Dashboard.jsx
        }

        # Prepare the body for the new Places API
        # The frontend already sends a body with includedTypes, maxResultCount, locationRestriction
        # We just need to ensure the structure is correct and add the API key handling
        
        # Frontend body:
        # const body = {
        #   includedTypes: [...],
        #   maxResultCount: maxResults,
        #   locationRestriction: {
        #     circle: {
        #       center: { latitude: lat, longitude: lng },
        #       radius: radius
        #     }
        #   }
        # };

        # Ensure locationRestriction.circle.center.latitude and longitude are present
        if not (data.get('locationRestriction') and \
                data['locationRestriction'].get('circle') and \
                data['locationRestriction']['circle'].get('center') and \
                'latitude' in data['locationRestriction']['circle']['center'] and \
                'longitude' in data['locationRestriction']['circle']['center']):
            return jsonify({"error": "Invalid or missing locationRestriction structure"}), 400


        # The frontend already prepares the body correctly for the new API, so we can pass it through.
        # We just need to ensure the API key is handled server-side.
        
        response = requests.post(api_url, json=data, headers=headers)
        response.raise_for_status()
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        print(f"Error calling Google Places Nearby Search API: {e}")
        # Try to get more details from the response if available
        error_details = str(e)
        try:
            error_details = response.json()
        except:
            pass # Keep original error if response is not JSON
        return jsonify({"error": "Google Places API error", "details": error_details}), 500
    except Exception as e:
        print(f"Unexpected error in places_nearby_proxy: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route('/api/places/text-search', methods=['POST'])
def places_text_search_proxy():
    if not PLACES_API_KEY:
        return jsonify({"error": "Google Places API key not configured"}), 500
    try:
        data = request.get_json()
        if not data or 'textQuery' not in data:
            return jsonify({"error": "Missing 'textQuery' in request body"}), 400
        
        # Construct the Places Text Search URL (New API v1)
        # https://developers.google.com/maps/documentation/places/web-service/search-text
        api_url = f"https://places.googleapis.com/v1/places:searchText"

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": PLACES_API_KEY,
            "X-Goog-FieldMask": data.get('fields', "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.photos")
        }
        
        # The frontend will send the body with textQuery, locationBias, etc.
        # We directly pass this to the Google API.
        response = requests.post(api_url, json=data, headers=headers)
        response.raise_for_status()
        return jsonify(response.json())

    except requests.exceptions.RequestException as e:
        print(f"Error calling Google Places Text Search API: {e}")
        error_details = str(e)
        try:
            error_details = response.json()
        except:
            pass
        return jsonify({"error": "Google Places API error", "details": error_details}), 500
    except Exception as e:
        print(f"Unexpected error in places_text_search_proxy: {e}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True) 