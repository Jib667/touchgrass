import { useState, useEffect, useRef } from 'react';
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
  const modalRef = useRef(null);
  
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
      console.log("Processing itinerary items:", itinerary.items);
      
      // Process each item to extract place names and add links
      const processed = itinerary.items.map((item, index) => {
        // Try to extract a place name from the location
        // We assume place names are often in brackets, quotes, or after a dash
        let placeName = '';
        let linkUrl = '';
        
        // Clean location name (remove any remaining parenthetical content like ratings)
        const cleanLocation = item.location.replace(/\([^)]*\)/g, '').trim();
        
        // Look for text in brackets like [Central Park]
        const bracketMatch = cleanLocation.match(/\[(.*?)\]/);
        if (bracketMatch) {
          placeName = bracketMatch[1];
        } 
        // Look for text in quotes like "Central Park"
        else if (cleanLocation.includes('"')) {
          const quoteMatch = cleanLocation.match(/"([^"]+)"/);
          if (quoteMatch) {
            placeName = quoteMatch[1];
          }
        }
        // Otherwise use the whole location or part after a dash
        else {
          if (cleanLocation.includes(' - ')) {
            placeName = cleanLocation.split(' - ')[1].trim();
          } else {
            placeName = cleanLocation.trim();
          }
        }
        
        // Create a Google Maps search URL for the place
        if (placeName) {
          linkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
        }
        
        return {
          id: index, // Add ID for removal functionality
          time: formatTimeToAMPM(item.time),
          location: cleanLocation, // Use the cleaned location
          title: cleanLocation, // For backward compatibility
          description: item.description,
          placeName,
          linkUrl,
          rating: item.rating, // Pass through rating
          reviewCount: item.reviewCount // Pass through review count
        };
      });
      
      console.log("Processed itinerary items:", processed);
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
  const handleRemoveItem = (index) => {
    setEnhancedItems(prevItems => prevItems.filter((_, i) => i !== index));
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
    
    // Create a single URL that adds all events to Google Calendar
    let calendarUrl = 'https://www.google.com/calendar/render?action=TEMPLATE';
    
    // For each itinerary item, add it as a separate event
    enhancedItems.forEach((item, index) => {
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
      
      // Create parameter for this event
      const eventTitle = encodeURIComponent(`${item.title}`);
      const eventDetails = encodeURIComponent(item.description);
      const eventLocation = encodeURIComponent(item.placeName || item.title);
      
      // Add to URL with unique parameter names
      calendarUrl += `&text${index}=${eventTitle}`;
      calendarUrl += `&details${index}=${eventDetails}`;
      calendarUrl += `&location${index}=${eventLocation}`;
      calendarUrl += `&dates${index}=${startTime.replace(/[-:]/g, '')}/${endTime.replace(/[-:]/g, '')}`;
    });
    
    // Open in a new tab
    window.open(calendarUrl, '_blank');
  };
  
  // Helper function to render star ratings
  const renderStarRating = (rating, reviewCount) => {
    if (!rating) return null;
    
    // Round to nearest half star
    const roundedRating = Math.round(rating * 2) / 2;
    
    return (
      <div className="item-rating">
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => {
            if (star <= roundedRating) {
              // Full star
              return (
                <span key={star} className="star full-star">★</span>
              );
            } else if (star - 0.5 === roundedRating) {
              // Half star
              return (
                <span key={star} className="star half-star">★</span>
              );
            } else {
              // Empty star
              return (
                <span key={star} className="star empty-star">☆</span>
              );
            }
          })}
        </div>
        {reviewCount && <span className="review-count">({reviewCount})</span>}
      </div>
    );
  };
  
  // Helper function to determine icon for itinerary item based on content
  const getItemIcon = (item) => {
    const locationString = item.location?.toLowerCase() || '';
    const descriptionString = item.description?.toLowerCase() || '';
    
    // Extract the last word of the location string
    const locationWords = locationString.split(/\\s+/);
    const lastLocationWord = locationWords[locationWords.length - 1] || '';

    // Prioritize checking the last word of the location, then the full location, then the description
    const contentSources = [lastLocationWord, locationString, descriptionString];
    
    for (const source of contentSources) {
      if (source.includes('park') || source.includes('garden') ||
          source.includes('hike') || source.includes('trail') ||
          source.includes('nature') || source.includes('outdoor')) {
        return <i className="fas fa-tree"></i>;
      }
      if (source.includes('restaurant') || source.includes('café') ||
          source.includes('cafe') || source.includes('dining') ||
          source.includes('lunch') || source.includes('dinner') ||
          source.includes('breakfast') || source.includes('brunch') ||
          source.includes('meal') || source.includes('food') ||
          source.includes('eat')) {
        return <i className="fas fa-utensils"></i>;
      }
      if (source.includes('museum') || source.includes('gallery') ||
          source.includes('exhibition') || source.includes('art') ||
          source.includes('history') || source.includes('school') || source.includes('university') || source.includes('college')) {
        return <i className="fas fa-landmark"></i>;
      }
      if (source.includes('shopping') || source.includes('store') ||
          source.includes('mall') || source.includes('shop')) {
        return <i className="fas fa-shopping-bag"></i>;
      }
      if (source.includes('entertainment') || source.includes('show') ||
          source.includes('theater') || source.includes('theatre') ||
          source.includes('concert') || source.includes('movie')) {
        return <i className="fas fa-film"></i>;
      }
      if (source.includes('fitness') || source.includes('gym') ||
          source.includes('workout') || source.includes('exercise')) {
        return <i className="fas fa-dumbbell"></i>;
      }
    }
    
    // Default icon if no keywords match in any source
    return <i className="fas fa-map-marker-alt"></i>;
  };
  
  // Helper function to enhance description text with links and formatting
  const enhancedDescription = (text) => {
    if (!text) return '';
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let enhancedText = text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    
    // Add paragraph breaks
    enhancedText = enhancedText.replace(/\n\n/g, '<br/><br/>');
    
    // Convert list-like items to actual lists
    if (enhancedText.includes('• ') || enhancedText.includes('* ')) {
      const listItems = enhancedText.split(/[•*]\s/).filter(Boolean);
      if (listItems.length > 1) {
        enhancedText = '<ul>' + listItems.map(item => `<li>${item.trim()}</li>`).join('') + '</ul>';
      }
    }
    
    return enhancedText;
  };
  
  // Update the renderItineraryItems function to include both icons and star ratings
  const renderItineraryItems = () => {
    return (
      <div className="itinerary-items">
        {enhancedItems.map((item, index) => (
          <div className="itinerary-item" key={index}>
            <button 
              className="remove-item-button" 
              onClick={() => handleRemoveItem(index)}
              aria-label="Remove item"
            >
              <i className="fas fa-times"></i>
            </button>
            
            <div className="itinerary-time">
              {item.time}
            </div>
            
            <div className="itinerary-content">
              <h4 className="itinerary-location">
                <span className="item-icon">{getItemIcon(item)}</span> 
                {item.location}
                {item.linkUrl && (
                  <a 
                    href={item.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="location-link"
                    title={`Open ${item.placeName || item.location} in Google Maps`}
                  >
                    <i className="fas fa-map-marker-alt"></i>
                  </a>
                )}
              </h4>
              
              {item.rating && renderStarRating(item.rating, item.reviewCount)}
              
              <div className="itinerary-description" dangerouslySetInnerHTML={{ __html: enhancedDescription(item.description) }} />
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // Effect to handle clicks outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (onClose) {
          onClose();
        }
      }
    };

    // Add event listener when the modal is open (i.e., itinerary is present)
    if (itinerary) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [itinerary, onClose, modalRef]);
  
  // If we don't have itinerary data yet
  if (!itinerary) {
    return (
      <div className="itinerary-display-overlay">
        <div className="itinerary-display" ref={modalRef}>
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
        <div className="itinerary-display" ref={modalRef}>
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
      <div className="itinerary-display" ref={modalRef}>
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
            renderItineraryItems()
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