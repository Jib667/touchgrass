import { useState, useEffect } from 'react';
import '../styles/ItineraryDisplay.css';

/**
 * Component for displaying a generated itinerary
 * @param {Object} props - Component props
 * @param {Object} props.itinerary - Itinerary data from the Gemini API
 * @param {Function} props.onClose - Function to call when the user closes the display (optional)
 * @returns {JSX.Element} - The rendered component
 */
const ItineraryDisplay = ({ itinerary, onClose }) => {
  const [showRaw, setShowRaw] = useState(false);
  const [enhancedItems, setEnhancedItems] = useState([]);
  
  // Process itinerary items to extract location links
  useEffect(() => {
    if (itinerary?.items && itinerary.items.length > 0) {
      // Process each item to extract place names and add links
      const processed = itinerary.items.map(item => {
        // Try to extract a place name from the location
        // We assume place names are often in brackets, quotes, or after a dash
        let placeName = '';
        let linkUrl = '';
        
        // Look for text in brackets like [Central Park]
        const bracketMatch = item.location?.match(/\[(.*?)\]/);
        if (bracketMatch) {
          placeName = bracketMatch[1];
        } 
        // Look for text in quotes like "Central Park"
        else if (item.location?.includes('"')) {
          const quoteMatch = item.location.match(/"([^"]+)"/);
          if (quoteMatch) {
            placeName = quoteMatch[1];
          }
        }
        // Otherwise use the whole location or part after a dash
        else {
          if (item.location?.includes(' - ')) {
            placeName = item.location.split(' - ')[1].trim();
          } else {
            placeName = item.location?.trim() || '';
          }
        }
        
        // Create a Google Maps search URL for the place
        if (placeName) {
          linkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
        }
        
        return {
          time: item.time,
          title: item.location, // Use location as title for display
          description: item.description,
          placeName,
          linkUrl
        };
      });
      
      setEnhancedItems(processed);
    } else {
      setEnhancedItems([]);
    }
  }, [itinerary]);
  
  // Add debug logging to help troubleshoot
  useEffect(() => {
    console.log('ItineraryDisplay received itinerary:', itinerary);
  }, [itinerary]);
  
  // If we don't have itinerary data yet
  if (!itinerary) {
    return (
      <div className="itinerary-display-overlay">
        <div className="itinerary-display">
          {onClose && <button className="close-button" onClick={onClose}>×</button>}
          <h2>Your Adventure Itinerary</h2>
          <div className="itinerary-content">
            <div className="itinerary-loading">
              <div className="loading-spinner"></div>
              <p>Creating your personalized itinerary...</p>
              <p className="loading-hint">This may take a minute as we analyze the area and your preferences</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If we have raw text but no parsed items, or we're viewing raw mode
  if (showRaw || (itinerary && (!itinerary.items || itinerary.items.length === 0))) {
    return (
      <div className="itinerary-display-overlay">
        <div className="itinerary-display">
          {onClose && <button className="close-button" onClick={onClose}>×</button>}
          <h2>Your Adventure Itinerary</h2>
          
          {showRaw && itinerary?.items?.length > 0 && (
            <div className="view-toggle">
              <button onClick={() => setShowRaw(false)}>View Formatted</button>
            </div>
          )}
          
          <div className="itinerary-content raw-content">
            <pre>{itinerary?.raw || 'No itinerary data available.'}</pre>
            
            <div className="itinerary-footer">
              <button className="save-itinerary-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                </svg>
                Save Itinerary
              </button>
              <button className="share-itinerary-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Otherwise, display the formatted itinerary
  return (
    <div className="itinerary-display-overlay">
      <div className="itinerary-display">
        {onClose && <button className="close-button" onClick={onClose}>×</button>}
        <h2>Your Adventure Itinerary</h2>
        
        <div className="itinerary-content">
          <div className="view-toggle">
            <button onClick={() => setShowRaw(true)}>View Raw</button>
          </div>
          
          {enhancedItems.length === 0 ? (
            <div className="itinerary-empty">
              <p>No itinerary items found. Try generating a new itinerary.</p>
            </div>
          ) : (
            enhancedItems.map((item, index) => (
              <div key={index} className="itinerary-item">
                <div className="itinerary-time">{item.time}</div>
                <div className="itinerary-details">
                  <h3>
                    {item.title}
                    {item.linkUrl && (
                      <a 
                        href={item.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="location-link"
                        title={`Open ${item.placeName} in Google Maps`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </a>
                    )}
                  </h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))
          )}
          
          <div className="itinerary-footer">
            <button className="save-itinerary-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
              </svg>
              Save Itinerary
            </button>
            <button className="share-itinerary-button">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay; 