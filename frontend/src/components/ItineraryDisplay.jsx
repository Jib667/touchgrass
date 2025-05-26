import { useState, useEffect } from 'react';
import { getFirestore, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
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
  const [savingItinerary, setSavingItinerary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Format time to 12-hour AM/PM format
  const formatTimeToAMPM = (timeString) => {
    if (!timeString) return '';
    
    // Check if already in AM/PM format
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Parse time from 24-hour format
    let [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
    
    // Handle potential parsing issues
    if (isNaN(hours)) return timeString;
    if (isNaN(minutes)) minutes = 0;
    
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    
    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Process itinerary items to extract location links and format times
  useEffect(() => {
    if (itinerary?.items && itinerary.items.length > 0) {
      // Process each item to extract place names and add links
      const processed = itinerary.items.map((item, index) => {
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
          id: index, // Add ID for removal functionality
          time: formatTimeToAMPM(item.time),
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
  
  // Remove itinerary item
  const removeItem = (itemId) => {
    setEnhancedItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };
  
  // Save itinerary to user's profile
  const saveItinerary = async () => {
    try {
      setSavingItinerary(true);
      setSaveError(null);
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error("You must be logged in to save an itinerary");
      }
      
      const db = getFirestore();
      const userRef = doc(db, "users", userId);
      
      // Check if user document exists and has saved_itineraries array
      const userDoc = await getDoc(userRef);
      
      // Create a metadata object with the itinerary data
      const itineraryToSave = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        raw: itinerary.raw,
        items: enhancedItems.map(item => ({
          time: item.time,
          location: item.title,
          description: item.description
        }))
      };
      
      await updateDoc(userRef, {
        saved_itineraries: arrayUnion(itineraryToSave)
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving itinerary:", error);
      setSaveError(error.message);
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSavingItinerary(false);
    }
  };
  
  // Share itinerary
  const shareItinerary = async () => {
    try {
      // Format itinerary text for sharing
      const title = "My Adventure Itinerary";
      const text = enhancedItems.map(item => 
        `${item.time} - ${item.title}\n${item.description}`
      ).join('\n\n');
      
      // Check if Web Share API is available
      if (navigator.share) {
        await navigator.share({
          title,
          text
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(`${title}\n\n${text}`);
        alert("Itinerary copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing itinerary:", error);
      alert("Failed to share itinerary. Try copying the text manually.");
    }
  };
  
  // Add events to Google Calendar
  const addToGoogleCalendar = () => {
    // Get tomorrow's date as the default date for the itinerary
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    // For each itinerary item, create a Google Calendar event link
    enhancedItems.forEach(item => {
      // Parse the time
      const timeParts = item.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return;
      
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const period = timeParts[3].toUpperCase();
      
      // Convert to 24-hour format for Google Calendar
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      
      // Format start and end times (assume 1 hour events)
      const startTime = `${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      const endTime = `${dateStr}T${(hours + 1).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      
      // Create Google Calendar URL
      const eventTitle = encodeURIComponent(item.title);
      const eventDetails = encodeURIComponent(item.description);
      const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDetails}&dates=${startTime.replace(/[-:]/g, '')}/${endTime.replace(/[-:]/g, '')}`;
      
      // Open in a new tab
      window.open(calendarUrl, '_blank');
    });
  };
  
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
              <button 
                className="save-itinerary-button"
                onClick={saveItinerary}
                disabled={savingItinerary}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
                </svg>
                {savingItinerary ? 'Saving...' : 'Save Itinerary'}
              </button>
              <button className="share-itinerary-button" onClick={shareItinerary}>
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
          
          {saveSuccess && (
            <div className="save-success-message">
              Itinerary saved successfully!
            </div>
          )}
          
          {saveError && (
            <div className="save-error-message">
              {saveError}
            </div>
          )}
          
          {enhancedItems.length === 0 ? (
            <div className="itinerary-empty">
              <p>No itinerary items found. Try generating a new itinerary.</p>
            </div>
          ) : (
            enhancedItems.map((item) => (
              <div key={item.id} className="itinerary-item">
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
                  <button 
                    className="remove-item-button" 
                    onClick={() => removeItem(item.id)}
                    title="Remove this item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
          
          <div className="itinerary-footer">
            <button 
              className="save-itinerary-button"
              onClick={saveItinerary}
              disabled={savingItinerary}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
              </svg>
              {savingItinerary ? 'Saving...' : 'Save Itinerary'}
            </button>
            
            <button className="share-itinerary-button" onClick={shareItinerary}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
              </svg>
              Share
            </button>
            
            <button className="add-to-calendar-button" onClick={addToGoogleCalendar}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM5 7V5h14v2H5zm2 4h10v2H7zm0 4h7v2H7z"/>
              </svg>
              Add to Google Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay; 