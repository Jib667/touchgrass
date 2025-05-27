import { fetchPlacesInRegion, groupPlacesByCategory } from './PlacesService';
import axios from 'axios';

/**
 * Generates an itinerary based on user input and places in the selected region
 * @param {Object} formData - User input data
 * @param {Object} userPreferences - User profile preferences (ignored, using only form data)
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
    const prompt = createGeminiPrompt(formData, groupedPlaces);
    
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
 * @returns {string} - Prompt for Gemini API
 */
const createGeminiPrompt = (formData, groupedPlaces) => {
  const { timeRange, tripType, surpriseType, activities, customActivity, allActivityCategories } = formData;
  
  // Format start and end times for better readability
  const startTime = timeRange.start;
  const endTime = timeRange.end;
  
  // Start building the prompt
  let prompt = `You are a local travel guide with deep knowledge about interesting places. Create a detailed itinerary for someone exploring an area with the following available places. IT IS CRITICAL THAT YOU ONLY USE PLACES FROM THESE LISTS:\n\n`;
  
  // Count total places
  const totalPlaces = Object.values(groupedPlaces).reduce((acc, places) => acc + places.length, 0);
  prompt += `TOTAL AVAILABLE PLACES: ${totalPlaces}\n\n`;
  
  // Add places data organized by category with ALL places
  prompt += `AVAILABLE PLACES BY CATEGORY (YOU MUST ONLY SELECT FROM THESE):\n`;
  
  // Add dining options
  prompt += `DINING OPTIONS (${groupedPlaces.dining.length}):\n`;
  groupedPlaces.dining.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const reviewCount = place.userRatingCount ? `(${place.userRatingCount} reviews)` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${reviewCount} ${address}\n`;
  });
  
  // Add attractions
  prompt += `\nATTRACTIONS (${groupedPlaces.attractions.length}):\n`;
  groupedPlaces.attractions.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const reviewCount = place.userRatingCount ? `(${place.userRatingCount} reviews)` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${reviewCount} ${address}\n`;
  });
  
  // Add outdoor places
  prompt += `\nOUTDOOR & RECREATION (${groupedPlaces.outdoor.length}):\n`;
  groupedPlaces.outdoor.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const reviewCount = place.userRatingCount ? `(${place.userRatingCount} reviews)` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${reviewCount} ${address}\n`;
  });
  
  // Add shopping places
  prompt += `\nSHOPPING (${groupedPlaces.shopping.length}):\n`;
  groupedPlaces.shopping.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const reviewCount = place.userRatingCount ? `(${place.userRatingCount} reviews)` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${reviewCount} ${address}\n`;
  });
  
  // Add other places
  prompt += `\nOTHER PLACES (${groupedPlaces.other.length}):\n`;
  groupedPlaces.other.forEach((place, index) => {
    const name = place.displayName?.text || place.name || 'Unnamed Place';
    const rating = place.rating ? `Rating: ${place.rating}/5` : '';
    const reviewCount = place.userRatingCount ? `(${place.userRatingCount} reviews)` : '';
    const address = place.formattedAddress || '';
    
    prompt += `${index + 1}. ${name} - ${rating} ${reviewCount} ${address}\n`;
  });
  
  // Add user preferences
  prompt += `\nIMPORTANT - THESE ARE THE ONLY USER PREFERENCES TO CONSIDER:\n`;
  prompt += `- Time available: ${startTime} to ${endTime}\n`;
  
  // Specific instructions based on trip type
  if (tripType === 'surprise') {
    prompt += `- Trip type: Surprise (${surpriseType === 'niche' ? 'Off the beaten path' : 'Popular attractions'})\n`;
    
    if (surpriseType === 'popular') {
      prompt += `\nPOPULAR ATTRACTIONS INSTRUCTIONS:
- CRUCIAL: Include the most famous and iconic attractions in the area (e.g., if the White House is in the region, it MUST be included)
- Prioritize places with the highest ratings and most reviews
- Focus on well-known tourist attractions that are "must-see" locations
- Include popular restaurants or dining options that tourists frequently visit
- Select places that are considered iconic or emblematic of the area\n`;
    } else {
      prompt += `\nOFF THE BEATEN PATH INSTRUCTIONS:
- Focus on hidden gems and lesser-known attractions
- Prioritize locally-owned establishments with good (but maybe not the highest) ratings
- Look for places described as "local favorites" or unique mom-and-pop establishments 
- Avoid the most touristy attractions unless they're truly special
- Include quirky, unusual, or niche experiences that most tourists might miss\n`;
    }
  } else {
    prompt += `- Trip type: Custom\n`;
    
    if (activities && activities.length > 0) {
      prompt += `- Selected activities: ${activities.join(', ')}\n`;
      
      prompt += `\nCUSTOM TRIP INSTRUCTIONS:
- CRITICAL: Heavily prioritize the specific activity categories the user selected
- Make sure EVERY selected activity category is represented in the itinerary
- Choose the highest-rated places that match these categories
- Balance the itinerary to focus on the user's explicitly chosen interests\n`;
    }
    
    if (customActivity) {
      prompt += `- User's custom request: "${customActivity}"\n`;
      prompt += `- IMPORTANT: Incorporate the user's custom request into the itinerary as a priority\n`;
    }
  }
  
  // Add activity categories for context
  if (allActivityCategories) {
    prompt += `\nACTIVITY CATEGORIES THE USER COULD SELECT FROM:\n`;
    
    allActivityCategories.forEach(category => {
      prompt += `- ${category.name}: ${category.options.join(', ')}\n`;
    });
  }
  
  // Add specific instructions for the itinerary format
  prompt += `\nCREATE AN ITINERARY that:
1. Fits within the time range ${startTime} to ${endTime}
2. ONLY includes places from the provided lists above - do not invent or suggest places not on these lists
3. Incorporates ONLY the user's form preferences (not any inferred preferences)
4. Provides a logical flow with appropriate travel time between locations
5. Includes specific suggestions for activities at each location
6. For each item, include the exact name of the place as listed above
7. Include the place ratings and review counts where available
8. Format each itinerary item with a time (in AM/PM format), location name, and detailed description
9. Include meal suggestions at appropriate times
10. DO NOT include any "End of Itinerary" or similar ending section
11. Prioritize the best places according to the trip type selected (popular, off-beaten-path, or custom)

FORMAT THE ITINERARY LIKE THIS:
### [Time in AM/PM] - [Place Name] 
[Detailed description with specific recommendations and include the rating in the description]

### [Time in AM/PM] - [Place Name]
[Detailed description with specific recommendations and include the rating in the description]

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
    const matches = Array.from(text.matchAll(itemsRegex));
    
    // Parse each match into a structured item
    const items = matches.map(match => {
      let time = match[1].trim();
      let location = match[2].trim();
      const description = match[3].trim();
      
      let rating = null;
      let reviewCount = null;
      
      // --- More robust rating and review count extraction ---
      const combinedText = `${location} ${description}`; // Combine location and description for easier searching
      
      // Regex for rating (e.g., "4.5/5", "4.5 stars", "Rated 4.5")
      const ratingRegex = /(\d\.\d|\d)(?:\s*\/\s*5|\s*stars?)/i;
      const ratingMatch = combinedText.match(ratingRegex);
      if (ratingMatch && ratingMatch[1]) {
        rating = parseFloat(ratingMatch[1]);
      }
      
      // Regex for review count (e.g., "(123 reviews)", "123 ratings", "based on 123 reviews")
      const reviewRegex = /(\d+)\s*(?:reviews?|ratings?)/i;
      const reviewMatch = combinedText.match(reviewRegex);
      if (reviewMatch && reviewMatch[1]) {
        reviewCount = parseInt(reviewMatch[1], 10);
      }
      
      // Attempt to remove rating/review text from location if it was found there to avoid display duplication
      if (rating && location.match(ratingRegex)) {
        location = location.replace(ratingRegex, '').replace(/\(\s*\)/g, '').trim(); // Remove pattern and empty parens
      }
      if (reviewCount && location.match(reviewRegex)) {
         location = location.replace(reviewRegex, '').replace(/\(\s*\)/g, '').trim();
      }
      location = location.replace(/Rating:\s*/i, '').replace(/Reviews:\s*/i, '').trim();
      // --- End of new extraction logic ---

      time = formatTime(time);
      
      return {
        time,
        location,
        description,
        rating,
        reviewCount
      };
    });
    
    // Sort items by time
    items.sort((a, b) => {
      const timeA = a.time;
      const timeB = b.time;
      
      // Extract hours and minutes from time strings
      const parseTimeString = (timeStr) => {
        const match = timeStr.match(/(\d+)(?::(\d+))?\s*([AP]M)/i);
        if (!match) return 0;
        
        let hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3].toUpperCase();
        
        // Convert to 24-hour format for comparison
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      return parseTimeString(timeA) - parseTimeString(timeB);
    });
    
    return items;
  } catch (error) {
    console.error('Error parsing itinerary items:', error);
    return [];
  }
};

/**
 * Formats a time string to consistent AM/PM format
 * @param {string} timeString - Time string to format
 * @returns {string} - Formatted time string
 */
const formatTime = (timeString) => {
  if (!timeString) return '';
  
  // Check if it's already in a reasonable AM/PM format
  if (timeString.includes('AM') || timeString.includes('PM')) {
    // Ensure proper spacing between time and AM/PM
    return timeString.replace(/(\d+)(?::(\d+))?\s*([AP]M)/i, '$1:$2 $3')
      .replace(':  ', ':00 '); // Handle cases where minutes are missing
  }
  
  // Try to parse 24-hour format (e.g., "14:30")
  const match24Hour = timeString.match(/(\d+)[:\.](\d+)/);
  if (match24Hour) {
    const hours = parseInt(match24Hour[1], 10);
    const minutes = parseInt(match24Hour[2], 10);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  // If all else fails, return the original
  return timeString;
}; 