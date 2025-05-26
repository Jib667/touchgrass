import axios from 'axios';

/**
 * List of all place types to include in a comprehensive search
 * These are grouped by category for better organization in prompts
 */
const ALL_PLACE_TYPES = {
  dining: [
    "restaurant", "cafe", "bakery", "bar", "meal_takeaway", 
    "meal_delivery", "food", "ice_cream", "coffee_shop"
  ],
  attractions: [
    "tourist_attraction", "museum", "art_gallery", "aquarium", "zoo", 
    "amusement_park", "theme_park", "library", "movie_theater", "theatre",
    "historical_landmark", "cultural_venue"
  ],
  outdoor: [
    "park", "campground", "national_park", "hiking_area", "beach", "natural_feature",
    "stadium", "sports_complex", "gym"
  ],
  shopping: [
    "shopping_mall", "department_store", "clothing_store", "electronics_store", 
    "store", "convenience_store", "supermarket", "market"
  ],
  other: [
    "point_of_interest", "establishment", "landmark", "university", "school",
    "transit_station", "lodging", "pharmacy", "hospital"
  ]
};

// Flatten all types for searching
const ALL_TYPES_FLAT = Object.values(ALL_PLACE_TYPES).flat();

/**
 * Fetches all places within a region using Google Places API
 * @param {Object} region - Selected region data (circle or polygon)
 * @param {Array} types - Place types to fetch (optional)
 * @returns {Promise<Array>} - Array of place objects
 */
export const fetchPlacesInRegion = async (region, types = []) => {
  console.log("Fetching places in region:", region);
  
  if (!region) {
    throw new Error("No region specified");
  }
  
  try {
    let places = [];
    
    // If no specific types are provided, use all types
    const typesToSearch = types.length > 0 ? types : ALL_TYPES_FLAT;
    
    // For circle regions, use the center point and radius
    if (region.type === 'circle') {
      const { center, radius } = region;
      console.log(`Fetching comprehensive places data for region: ${JSON.stringify(center)}, radius: ${radius}m`);
      
      // Fetch all places in a single call for better compatibility
      const allPlaces = await fetchPlacesInCircle(center, radius);
      places = allPlaces;
      
    } 
    // For polygon regions, use the center point and a radius that encompasses the polygon
    else if (region.type === 'polygon') {
      // Calculate the center point and radius that encompasses the polygon
      const { center, radius } = calculatePolygonBounds(region.path);
      console.log(`Fetching places in polygon with center: ${JSON.stringify(center)}, encompassing radius: ${radius}m`);
      
      // Fetch all places in a single call
      const allPlaces = await fetchPlacesInCircle(center, radius);
      
      // Filter places to only include those within the polygon
      places = allPlaces.filter(place => isPointInPolygon(
        { lat: place.location?.latitude || place.geometry?.location?.lat, 
          lng: place.location?.longitude || place.geometry?.location?.lng }, 
        region.path
      ));
      
      console.log(`Filtered from ${allPlaces.length} total places to ${places.length} places within polygon`);
    }
    
    // Remove duplicate places
    const uniquePlaces = removeDuplicatePlaces(places);
    console.log(`Total unique places found: ${uniquePlaces.length}`);
    
    return uniquePlaces;
  } catch (error) {
    console.error("Error fetching places:", error);
    throw error;
  }
};

/**
 * Fetches places within a circle using the Google Places API
 * @param {Object} center - Center coordinates {lat, lng}
 * @param {number} radius - Circle radius in meters
 * @returns {Promise<Array>} - Array of place objects
 */
async function fetchPlacesInCircle(center, radius) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://places.googleapis.com/v1/places:searchNearby?key=${apiKey}`;
  
  // Adjust radius if it's too large for the API
  const adjustedRadius = Math.min(radius, 50000); // 50km max radius
  
  try {
    // Try fetching with comprehensive request
    const body = {
      locationRestriction: {
        circle: {
          center: { 
            latitude: center.lat, 
            longitude: center.lng 
          },
          radius: adjustedRadius
        }
      },
      maxResultCount: 100,
      rankPreference: "DISTANCE" // Closest places first
    };
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.photos,places.regularOpeningHours"
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Places API error (${response.status}): ${errorText}`);
      
      // If we get a 400 error, try a simpler request without location bias
      if (response.status === 400) {
        console.log("Trying alternative approach with text search...");
        return await fetchPlacesWithTextSearch(center, adjustedRadius);
      }
      
      throw new Error(`Places API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error("Error in fetchPlacesInCircle:", error);
    
    // Fallback to textSearch if nearbySearch fails
    console.log("Falling back to text search...");
    return await fetchPlacesWithTextSearch(center, adjustedRadius);
  }
}

/**
 * Fallback function to fetch places using text search
 * @param {Object} center - Center coordinates {lat, lng}
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} - Array of place objects
 */
async function fetchPlacesWithTextSearch(center, radius) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`;
  
  try {
    const body = {
      textQuery: "popular places",
      locationBias: {
        circle: {
          center: { 
            latitude: center.lat, 
            longitude: center.lng 
          },
          radius: radius
        }
      },
      maxResultCount: 100
    };
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.photos,places.regularOpeningHours"
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Text search API error (${response.status}): ${errorText}`);
      throw new Error(`Text search API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return data.places || [];
  } catch (error) {
    console.error("Error in fetchPlacesWithTextSearch:", error);
    
    // Last resort - return empty array
    console.log("All Place API attempts failed. Returning empty array.");
    return [];
  }
}

/**
 * Calculates the center point and encompassing radius for a polygon
 * @param {Array} path - Array of polygon vertices {lat, lng}
 * @returns {Object} - Center point {lat, lng} and radius in meters
 */
function calculatePolygonBounds(path) {
  // Find the min/max lat/lng coordinates
  let minLat = path[0].lat;
  let maxLat = path[0].lat;
  let minLng = path[0].lng;
  let maxLng = path[0].lng;
  
  path.forEach(point => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });
  
  // Calculate center point
  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2
  };
  
  // Calculate radius (distance from center to furthest vertex)
  let maxDistance = 0;
  path.forEach(point => {
    const distance = calculateDistance(center.lat, center.lng, point.lat, point.lng);
    maxDistance = Math.max(maxDistance, distance);
  });
  
  // Add 10% buffer to ensure we encompass the whole polygon
  const radius = maxDistance * 1.1;
  
  return { center, radius };
}

/**
 * Checks if a point is inside a polygon
 * @param {Object} point - Point coordinates {lat, lng}
 * @param {Array} polygon - Array of polygon vertices {lat, lng}
 * @returns {boolean} - True if point is inside polygon
 */
function isPointInPolygon(point, polygon) {
  if (!point || !point.lat || !point.lng) {
    return false;
  }
  
  // Ray casting algorithm
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Removes duplicate places from an array based on unique IDs or coordinates
 * @param {Array} places - Array of place objects
 * @returns {Array} - Array with duplicates removed
 */
function removeDuplicatePlaces(places) {
  const uniqueIds = new Set();
  const uniquePlaces = [];
  
  places.forEach(place => {
    // Use ID if available, otherwise use coordinates
    const id = place.id || 
      `${place.location?.latitude || place.geometry?.location?.lat},${place.location?.longitude || place.geometry?.location?.lng}`;
    
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      uniquePlaces.push(place);
    }
  });
  
  return uniquePlaces;
}

/**
 * Calculates the distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

/**
 * Helper function to group places by category
 * @param {Array} places - Array of place objects
 * @returns {Object} - Places grouped by category
 */
export const groupPlacesByCategory = (places) => {
  const grouped = {
    dining: [],
    attractions: [],
    outdoor: [],
    shopping: [],
    other: []
  };
  
  places.forEach(place => {
    // Check place types against our category types
    const placeTypes = place.types || [];
    let matched = false;
    
    for (const [category, typeList] of Object.entries(ALL_PLACE_TYPES)) {
      for (const placeType of placeTypes) {
        if (typeList.includes(placeType)) {
          grouped[category].push(place);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
    
    // If no match found, add to 'other'
    if (!matched) {
      grouped.other.push(place);
    }
  });
  
  return grouped;
}; 