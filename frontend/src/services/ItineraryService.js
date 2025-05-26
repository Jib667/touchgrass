import { fetchPlacesInRegion, groupPlacesByCategory } from './PlacesService';
import axios from 'axios';

/**
 * Generates an itinerary based on user input and places in the selected region
 * @param {Object} formData - User input data
 * @param {Object} userPreferences - User profile preferences 
 * @returns {Object} Parsed itinerary
 */
export const generateItinerary = async (formData, userPreferences) => {
  try {
    // 1. Fetch all places in the region
    console.log("Fetching all places in region");
    const places = await fetchPlacesInRegion(formData.region);
    console.log(`Found ${places.length} places in the region`);
    
    if (places.length === 0) {
      return {
        raw: "I couldn't find any interesting places in the selected area. Please try selecting a different area or expanding your current selection.",
        items: []
      };
    }
    
    // 2. Group places by category for better organization in the prompt
    const groupedPlaces = groupPlacesByCategory(places);
    console.log("Grouped places by category:", Object.keys(groupedPlaces).map(key => `${key}: ${groupedPlaces[key].length}`));
    
    // 3. Create prompt for Gemini with ALL places
    const prompt = createGeminiPrompt(formData, groupedPlaces, userPreferences);
    
    // 4. Call Gemini API
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    console.log('Calling Gemini API to generate itinerary...');
    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }
    );
    
    // 5. Parse and format the response
    console.log('Received response from Gemini API');
    const parsedItinerary = parseGeminiResponse(response.data);
    
    return parsedItinerary;
  } catch (error) {
    console.error('Error generating itinerary:', error);
    throw error;
  }
};

/**
 * Creates a prompt for Gemini API based on user preferences and places
 * @param {Object} formData - User input from the form
 * @param {Object} groupedPlaces - Places grouped by category
 * @param {Object} userPreferences - User profile preferences
 * @returns {string} - Prompt for Gemini API
 */
const createGeminiPrompt = (formData, groupedPlaces, userPreferences) => {
  const { timeRange, tripType, surpriseType, activities, customActivity, allActivityCategories } = formData;
  
  // Format start and end times for better readability
  const startTime = timeRange.start;
  const endTime = timeRange.end;
  
  // Start building the prompt
  let prompt = `You are a local travel guide with deep knowledge about interesting places. Create a detailed itinerary for someone exploring an area with the following available places:\n\n`;
  
  // Add places data organized by category
  prompt += `AVAILABLE PLACES BY CATEGORY:\n`;
  
  // Add dining options
  prompt += `DINING OPTIONS (${groupedPlaces.dining.length}):\n`;
  groupedPlaces.dining.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${address}\n`;
  });
  
  // Add attractions
  prompt += `\nATTRACTIONS (${groupedPlaces.attractions.length}):\n`;
  groupedPlaces.attractions.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${address}\n`;
  });
  
  // Add outdoor places
  prompt += `\nOUTDOOR & RECREATION (${groupedPlaces.outdoor.length}):\n`;
  groupedPlaces.outdoor.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${address}\n`;
  });
  
  // Add shopping places
  prompt += `\nSHOPPING (${groupedPlaces.shopping.length}):\n`;
  groupedPlaces.shopping.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${address}\n`;
  });
  
  // Add other places
  prompt += `\nOTHER PLACES (${groupedPlaces.other.length}):\n`;
  groupedPlaces.other.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${address}\n`;
  });
  
  // Add user preferences
  prompt += `\nUSER PREFERENCES:\n`;
  prompt += `- Time available: ${startTime} to ${endTime}\n`;
  
  if (tripType === 'surprise') {
    prompt += `- Trip type: Surprise (${surpriseType === 'niche' ? 'off the beaten path' : 'popular attractions'})\n`;
  } else {
    prompt += `- Trip type: Custom\n`;
    
    if (activities && activities.length > 0) {
      prompt += `- Selected activities: ${activities.join(', ')}\n`;
    }
    
    if (customActivity) {
      prompt += `- User's custom request: "${customActivity}"\n`;
    }
  }
  
  // Add profile preferences if available
  if (userPreferences) {
    prompt += `- Travel style: ${userPreferences.travelStyle || 'Not specified'}\n`;
    prompt += `- Interests: ${userPreferences.interests || 'Not specified'}\n`;
    prompt += `- Pace: ${userPreferences.pace || 'Not specified'}\n`;
  }
  
  // Add activity categories for context
  if (allActivityCategories) {
    prompt += `\nACTIVITY CATEGORIES:\n`;
    
    allActivityCategories.forEach(category => {
      prompt += `- ${category.name}: ${category.options.join(', ')}\n`;
    });
  }
  
  // Add specific instructions for the itinerary format
  prompt += `\nCREATE AN ITINERARY that:
1. Fits within the time range ${startTime} to ${endTime}
2. Includes only places from the provided lists above
3. Incorporates the user's preferences and selected activities
4. Provides a logical flow with appropriate travel time between locations
5. Includes specific suggestions for activities at each location
6. For each item, include the exact name of the place as listed above
7. Format each itinerary item with a time, location name, and detailed description
8. Include meal suggestions at appropriate times

FORMAT THE ITINERARY LIKE THIS:
## Your Adventure: [Catchy Title]

### [Time] - [Place Name]
[Detailed description with specific recommendations]

### [Time] - [Place Name]
[Detailed description with specific recommendations]

...and so on.
`;

  return prompt;
};

/**
 * Parses the response from Gemini API to extract itinerary data
 * @param {Object} response - Response from Gemini API
 * @returns {Object} - Parsed itinerary data
 */
const parseGeminiResponse = (response) => {
  try {
    // Debug the complete response structure
    console.log('Full Gemini API response:', JSON.stringify(response, null, 2));
    
    // Get the generated text from the response
    let generatedText = '';
    
    if (response.candidates && response.candidates.length > 0) {
      const firstCandidate = response.candidates[0];
      if (firstCandidate.content && firstCandidate.content.parts && firstCandidate.content.parts.length > 0) {
        generatedText = firstCandidate.content.parts[0].text;
      }
    }
    
    if (!generatedText) {
      console.error('No generated text found in API response');
      return {
        raw: 'Sorry, we could not generate an itinerary at this time. Please try again later.',
        items: []
      };
    }
    
    console.log('Raw Gemini response text:', generatedText);
    
    // Parse the raw text into itinerary items
    const itineraryItems = parseItineraryItems(generatedText);
    
    return {
      raw: generatedText,
      items: itineraryItems
    };
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    
    return {
      raw: 'An error occurred while generating your itinerary. Please try again.',
      items: []
    };
  }
};

/**
 * Parses the raw text from Gemini into structured itinerary items
 * @param {string} text - Raw text from Gemini
 * @returns {Array} - Array of itinerary items
 */
const parseItineraryItems = (text) => {
  try {
    // Extract title (if present)
    let title = '';
    const titleMatch = text.match(/^#+\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].replace(/Your Adventure:\s*/i, '').trim();
    }
    
    // Find all itinerary items
    // Look for patterns like "### 10:00 AM - Museum Visit" or "### [10:00 AM] - Museum Visit"
    const itemsRegex = /###\s*(?:\[)?(\d{1,2}[:\.]\d{2}(?:\s*[AP]M)?|\d{1,2}\s*[AP]M)(?:\])?\s*-\s*([^\n]+)(?:\n)([\s\S]*?)(?=(?:###|\n\s*$|$))/gi;
    const matches = [...text.matchAll(itemsRegex)];
    
    const items = matches.map(match => {
      const time = match[1].trim();
      const location = match[2].trim();
      const description = match[3].trim();
      
      return {
        time,
        location,
        description
      };
    });
    
    console.log(`Parsed ${items.length} itinerary items`);
    
    // If no items were parsed, look for alternative formats
    if (items.length === 0) {
      // Try looking for "Time - Activity" format
      const altRegex = /(\d{1,2}[:\.]\d{2}(?:\s*[AP]M)?|\d{1,2}\s*[AP]M)\s*-\s*([^\n]+)(?:\n)([\s\S]*?)(?=(?:\d{1,2}[:\.]\d{2}|\d{1,2}\s*[AP]M|\n\s*$|$))/gi;
      const altMatches = [...text.matchAll(altRegex)];
      
      const altItems = altMatches.map(match => {
        const time = match[1].trim();
        const location = match[2].trim();
        const description = match[3].trim();
        
        return {
          time,
          location,
          description
        };
      });
      
      if (altItems.length > 0) {
        console.log(`Found ${altItems.length} items in alternative format`);
        return altItems;
      }
      
      // If still no items, check for bold or strong text as location names
      const boldRegex = /(\d{1,2}[:\.]\d{2}(?:\s*[AP]M)?|\d{1,2}\s*[AP]M)(?:\s*[-–]\s*)?(?:\*\*|\*|__)([^*_\n]+)(?:\*\*|\*|__)(?:\n|:\s*)([\s\S]*?)(?=(?:\d{1,2}[:\.]\d{2}|\d{1,2}\s*[AP]M|\n\s*$|$))/gi;
      const boldMatches = [...text.matchAll(boldRegex)];
      
      const boldItems = boldMatches.map(match => {
        const time = match[1].trim();
        const location = match[2].trim();
        const description = match[3].trim();
        
        return {
          time,
          location,
          description
        };
      });
      
      if (boldItems.length > 0) {
        console.log(`Found ${boldItems.length} items with bold location names`);
        return boldItems;
      }
    }
    
    return items;
  } catch (error) {
    console.error('Error parsing itinerary items:', error);
    return [];
  }
}; 