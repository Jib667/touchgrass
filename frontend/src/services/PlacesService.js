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
      console.log(`Fetching places data for circle: ${JSON.stringify(center)}, radius: ${radius}m`);
      
      // Fetch places
      const allPlaces = await fetchPlacesInCircle(center, radius);
      
      // Filter places to ensure they are strictly within the circle radius
      places = allPlaces.filter(place => {
        const placeLat = place.location?.latitude || place.geometry?.location?.lat;
        const placeLng = place.location?.longitude || place.geometry?.location?.lng;
        
        if (!placeLat || !placeLng) return false;
        
        // Calculate distance from center to place
        const distance = calculateDistance(
          center.lat, 
          center.lng, 
          placeLat, 
          placeLng
        );
        
        // Only include places within the radius
        return distance <= radius;
      });
      
      console.log(`Filtered from ${allPlaces.length} total places to ${places.length} places strictly within circle radius`);
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
    console.log("Fetching places with comprehensive approach");
    
    // Array to collect all places
    let allPlaces = [];
    
    // Make multiple searches with different filters to get more diverse results
    const searchTypes = [
      // Popular attractions
      ["tourist_attraction", "museum", "amusement_park", "aquarium", "art_gallery", "zoo"],
      // Historical and cultural
      ["historical_landmark", "library"],
      // Nature and outdoors
      ["park", "campground", "beach"],
      // Food and dining
      ["restaurant", "cafe", "bakery", "bar"],
      // Shopping
      ["shopping_mall", "department_store", "store"]
    ];
    
    // Execute multiple searches to get comprehensive results
    const searchPromises = searchTypes.map(async (types) => {
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
        includedTypes: types,
        maxResultCount: 20, // Set to max allowed value (20)
        rankPreference: "POPULARITY" // Get the most popular places first
      };
      
      try {
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
          console.error(`Places API error for type ${types.join(',')} (${response.status}): ${errorText}`);
          return [];
        }
        
        const data = await response.json();
        return data.places || [];
      } catch (error) {
        console.error(`Error fetching places for types ${types.join(',')}:`, error);
        return [];
      }
    });
    
    // Also make a general search without type filtering to get additional places
    const generalSearchPromise = (async () => {
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
        maxResultCount: 20, // Set to max allowed value (20)
        rankPreference: "POPULARITY"
      };
      
      try {
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
          console.error(`General Places API error (${response.status}): ${errorText}`);
          return [];
        }
        
        const data = await response.json();
        return data.places || [];
      } catch (error) {
        console.error("Error in general places search:", error);
        return [];
      }
    })();
    
    // Combine general search with type-specific searches
    const allSearchPromises = [...searchPromises, generalSearchPromise];
    
    // Wait for all searches to complete
    const placesArrays = await Promise.all(allSearchPromises);
    
    // Flatten and merge all place arrays
    placesArrays.forEach(places => {
      if (places && places.length) {
        allPlaces = [...allPlaces, ...places];
      }
    });
    
    console.log(`Fetched a total of ${allPlaces.length} places (before deduplication)`);
    
    // If we didn't get any places, try the text search as fallback
    if (allPlaces.length === 0) {
      console.log("No places found with nearby search, trying text search fallback...");
      return await fetchPlacesWithTextSearch(center, adjustedRadius);
    }
    
    return allPlaces;
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
    console.log("Attempting multiple text searches as fallback...");
    
    // Different search queries to try
    const searchQueries = [
      "popular places",
      "attractions",
      "things to do",
      "tourist spots", 
      "restaurants",
      "museums",
      "parks",
      "historical sites",
      "entertainment"
    ];
    
    // Make a request for each search query
    const searchPromises = searchQueries.map(async (query) => {
      const body = {
        textQuery: query,
        locationBias: {
          circle: {
            center: { 
              latitude: center.lat, 
              longitude: center.lng 
            },
            radius: radius
          }
        },
        maxResultCount: 20 // Set to max allowed value (20)
      };
      
      try {
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
          console.error(`Text search API error for '${query}' (${response.status}): ${errorText}`);
          return [];
        }
        
        const data = await response.json();
        return data.places || [];
      } catch (error) {
        console.error(`Error in text search for '${query}':`, error);
        return [];
      }
    });
    
    // Wait for all searches to complete
    const placesArrays = await Promise.all(searchPromises);
    
    // Combine all results
    let allPlaces = [];
    placesArrays.forEach(places => {
      if (places && places.length) {
        allPlaces = [...allPlaces, ...places];
      }
    });
    
    console.log(`Text search fallback found ${allPlaces.length} places (before deduplication)`);
    
    return allPlaces;
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
 * Removes duplicate places from an array based on unique IDs, coordinates, and name similarity
 * @param {Array} places - Array of place objects
 * @returns {Array} - Array with duplicates removed
 */
function removeDuplicatePlaces(places) {
  console.log(`Removing duplicates from ${places.length} places`);
  
  // First pass: remove exact ID duplicates
  const uniqueIds = new Set();
  const idFilteredPlaces = [];
  
  places.forEach(place => {
    // Use ID if available, otherwise use coordinates
    const id = place.id || 
      `${place.location?.latitude || place.geometry?.location?.lat},${place.location?.longitude || place.geometry?.location?.lng}`;
    
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      idFilteredPlaces.push(place);
    }
  });
  
  console.log(`After removing ID duplicates: ${idFilteredPlaces.length} places`);
  
  // Second pass: remove near-duplicate locations
  const locationFilteredPlaces = [];
  const processedLocations = new Set();
  
  idFilteredPlaces.forEach(place => {
    const lat = place.location?.latitude || place.geometry?.location?.lat;
    const lng = place.location?.longitude || place.geometry?.location?.lng;
    
    // Skip places without proper location data
    if (!lat || !lng) {
      locationFilteredPlaces.push(place);
      return;
    }
    
    // Round to 5 decimal places (about 1 meter precision)
    const roundedLocation = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    
    if (!processedLocations.has(roundedLocation)) {
      processedLocations.add(roundedLocation);
      locationFilteredPlaces.push(place);
    }
  });
  
  console.log(`After removing location duplicates: ${locationFilteredPlaces.length} places`);
  
  // Third pass: Check for name similarity
  const nameFilteredPlaces = [];
  const processedNames = new Map(); // Map to store normalized names and their corresponding place objects
  
  locationFilteredPlaces.forEach(place => {
    const displayName = place.displayName?.text || '';
    
    // Skip places without a name
    if (!displayName) {
      nameFilteredPlaces.push(place);
      return;
    }
    
    // Normalize the name (lowercase, remove special chars, trim)
    const normalizedName = displayName.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .trim();
    
    // Minimum length to consider for similarity
    if (normalizedName.length < 4) {
      nameFilteredPlaces.push(place);
      return;
    }
    
    // Check for existing similar names
    let isDuplicate = false;
    
    for (const [existingName, existingPlace] of processedNames.entries()) {
      // Check for high similarity (one name contains the other)
      if (existingName.includes(normalizedName) || normalizedName.includes(existingName)) {
        // If they are similar names, keep the one with more information
        isDuplicate = true;
        
        // Check which place has better data (ratings, reviews, etc.)
        const existingScore = calculateInfoScore(existingPlace);
        const currentScore = calculateInfoScore(place);
        
        // If current place has better data, replace the existing one
        if (currentScore > existingScore) {
          processedNames.delete(existingName);
          processedNames.set(normalizedName, place);
          
          // Find and remove the existing place from our filtered list
          const index = nameFilteredPlaces.indexOf(existingPlace);
          if (index > -1) {
            nameFilteredPlaces.splice(index, 1);
          }
          
          nameFilteredPlaces.push(place);
        }
        
        break;
      }
    }
    
    // If not a duplicate, add it
    if (!isDuplicate) {
      processedNames.set(normalizedName, place);
      nameFilteredPlaces.push(place);
    }
  });
  
  console.log(`After removing name duplicates: ${nameFilteredPlaces.length} places`);
  
  return nameFilteredPlaces;
}

/**
 * Calculate an information score for a place to determine which duplicate to keep
 * Higher score means more information is available
 * @param {Object} place - Place object
 * @returns {number} - Information score
 */
function calculateInfoScore(place) {
  let score = 0;
  
  // Rating and review count are valuable
  if (place.rating) score += 2;
  if (place.userRatingCount) score += Math.min(place.userRatingCount / 100, 5); // Cap at 5 points for 500+ reviews
  
  // Having an address is valuable
  if (place.formattedAddress) score += 1;
  
  // Having photos is valuable
  if (place.photos && place.photos.length) score += place.photos.length;
  
  // Having opening hours is valuable
  if (place.regularOpeningHours) score += 1;
  
  // Types provide context
  if (place.types && place.types.length) score += Math.min(place.types.length, 3);
  
  return score;
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