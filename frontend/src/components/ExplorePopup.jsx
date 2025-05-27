import { useState, useRef, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { generateItinerary } from '../services/ItineraryService';
import ItineraryDisplay from './ItineraryDisplay';
import '../styles/ExplorePopup.css';

// Activity options categories
const ACTIVITY_CATEGORIES = [
  {
    name: "Outdoor Recreation",
    options: [
      "Hiking", "Walking", "Jogging", "Running", "Cycling", "Mountain biking", 
      "Rock climbing", "Kayaking", "Canoeing", "Paddleboarding", "Swimming", 
      "Fishing", "Bird watching", "Wildlife viewing", "Photography", "Picnicking",
      "Camping", "Stargazing", "Geocaching", "Foraging", "Gardening"
    ]
  },
  {
    name: "Exercise & Fitness",
    options: [
      "Yoga", "Outdoor workout", "Tai Chi", "Pilates", "Meditation", "Stretching", 
      "HIIT training", "CrossFit", "Boot camp", "Sports training", "Martial arts", 
      "Parkour", "Dancing"
    ]
  },
  {
    name: "Social Activities",
    options: [
      "Picnic with friends", "BBQ gathering", "Coffee with a friend", "Group hike", 
      "Beach day", "Outdoor games", "Sports with friends", "Frisbee", "Volleyball", 
      "Soccer", "Basketball", "Tennis", "Ultimate frisbee", "Group biking", 
      "Group fitness class", "Outdoor party", "Dinner party", "Potluck", "Bonfire"
    ]
  },
  {
    name: "Relaxation",
    options: [
      "Reading in the park", "Hammocking", "Meditation in nature", "Forest bathing", 
      "Sunbathing", "Cloud watching", "Journaling outdoors", "Painting outdoors", 
      "Drawing outdoors", "Nature sketching", "Outdoor nap", "Quiet contemplation"
    ]
  },
  {
    name: "Cultural & Educational",
    options: [
      "Visit a museum", "Art gallery tour", "Historic site exploration", "Botanical garden visit", 
      "Zoo visit", "Aquarium visit", "Cultural festival", "Outdoor concert", "Outdoor theater", 
      "Outdoor movie", "Farmers market", "Street fair", "Guided nature tour", 
      "Outdoor workshop", "Outdoor class", "Outdoor lecture"
    ]
  },
  {
    name: "Food & Dining",
    options: [
      "Restaurant dining", "Outdoor cafe", "Food truck visit", "Farmers market shopping", 
      "Cooking class", "Wine tasting", "Beer tasting", "Coffee shop visit", "Dessert shop visit", 
      "Farm-to-table experience", "Ethnic cuisine exploration", "Food festival"
    ]
  },
  {
    name: "Family Activities",
    options: [
      "Playground visit", "Amusement park", "Water park", "Mini golf", "Go-karting", 
      "Laser tag", "Bowling", "Family picnic", "Family hike", "Family bike ride", 
      "Children's museum", "Petting zoo", "Berry picking", "Apple picking", 
      "Pumpkin patch", "Family camping", "Family beach day"
    ]
  }
];

// Debounce utility function (can be moved to a utils file)
function _debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

const TimeSelector = ({ startTime, endTime, onStartTimeChange, onEndTimeChange, timeType }) => {
  const hours12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampm = ['AM', 'PM'];
  
  const hourRef = useRef(null);
  const minRef = useRef(null);
  const amPmRef = useRef(null);
  
  const [displayHour, setDisplayHour] = useState('12');
  const [displayAmPm, setDisplayAmPm] = useState('AM');
  const [inputValue, setInputValue] = useState('');

  // Keep track of which column is being scrolled
  const [scrollingColumn, setScrollingColumn] = useState(null);
  
  const currentFullTime = timeType === 'start' ? startTime : endTime;
  const onChangeCallbacks = timeType === 'start' ? onStartTimeChange : onEndTimeChange;

  // Convert 24-hour format to 12-hour format
  const to12HourFormat = useCallback((hour24) => {
    const hourNum = parseInt(hour24, 10);
    if (hourNum === 0) return { hour: '12', ampm: 'AM' };
    if (hourNum === 12) return { hour: '12', ampm: 'PM' };
    if (hourNum > 12) return { hour: (hourNum - 12).toString(), ampm: 'PM' };
    return { hour: hourNum.toString(), ampm: 'AM' };
  }, []);
  
  // Convert 12-hour format to 24-hour format
  const to24HourFormat = useCallback((hour12, ampm_val) => {
    const hourNum = parseInt(hour12, 10);
    if (ampm_val === 'AM' && hourNum === 12) return '00';
    if (ampm_val === 'AM') return hourNum.toString().padStart(2, '0');
    if (ampm_val === 'PM' && hourNum === 12) return '12';
    return (hourNum + 12).toString().padStart(2, '0');
  }, []);
  
  // Update display value when the time changes
  useEffect(() => {
    if (currentFullTime && currentFullTime.hour !== undefined && currentFullTime.minute !== undefined) {
      const display = to12HourFormat(currentFullTime.hour);
      setDisplayHour(display.hour);
      setDisplayAmPm(display.ampm);
      setInputValue(`${display.hour}:${currentFullTime.minute} ${display.ampm}`);
    }
  }, [currentFullTime, to12HourFormat]);

  // Function to calculate which item is in the center of the visible area
  const determineSelectedItem = useCallback((ref, values) => {
    if (!ref.current) return null;
    
    const container = ref.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;
    
    const items = container.querySelectorAll('li');
    let closestItem = null;
    let minDistance = Infinity;
    
    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(containerCenter - itemCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestItem = { index, value: values[index % values.length] };
      }
    });
    
    return closestItem;
  }, []);

  // Automatically position scrollable elements initially
  useEffect(() => {
    const centerItem = (ref, value, values) => {
      if (!ref.current) return;
      
      const index = values.indexOf(value);
      if (index === -1) return;
      
      const itemHeight = 40;
      const containerHeight = 120;
      // Calculate scroll position to center the item
      // Add 40px padding from the top of the list
      const scrollPosition = index * itemHeight + 40 - (containerHeight - itemHeight) / 2;
      
      ref.current.scrollTop = scrollPosition;
    };
    
    // Only position if we're not currently scrolling
    if (!scrollingColumn) {
      // Position hour column
      centerItem(hourRef, displayHour, hours12);
      // Position minute column
      if (currentFullTime && currentFullTime.minute) {
        centerItem(minRef, currentFullTime.minute, minutes);
      }
      // Position AM/PM column
      centerItem(amPmRef, displayAmPm, ampm);
    }
  }, [displayHour, displayAmPm, currentFullTime, hours12, minutes, ampm, scrollingColumn]);

  // Handle scroll events with debouncing
  const handleScroll = useCallback(_debounce((columnType, ref, values) => {
    // Small delay to ensure scrolling has completely stopped
    setTimeout(() => {
      const selectedItem = determineSelectedItem(ref, values);
      
      if (selectedItem) {
        console.log(`Selected ${columnType}: ${selectedItem.value}`);
        
        if (columnType === 'hour') {
          const newHour24 = to24HourFormat(selectedItem.value, displayAmPm);
          console.log(`Converting ${selectedItem.value} ${displayAmPm} to 24h: ${newHour24}`);
          onChangeCallbacks.hour(newHour24);
        } else if (columnType === 'minute') {
          console.log(`Setting minute to: ${selectedItem.value}`);
          onChangeCallbacks.minute(selectedItem.value);
        } else if (columnType === 'ampm') {
          const newHour24 = to24HourFormat(displayHour, selectedItem.value);
          console.log(`Changing period to ${selectedItem.value}, new 24h hour: ${newHour24}`);
          onChangeCallbacks.hour(newHour24);
        }
      }
      
      // Clear scrolling state after selection is made
      setScrollingColumn(null);
      
      // After selecting a value, snap to it
      if (selectedItem && ref.current) {
        const itemHeight = 40;
        const containerHeight = 120;
        const scrollPosition = Math.max(
          0, 
          (selectedItem.index * itemHeight) + 40 - (containerHeight - itemHeight) / 2
        );
        
        // Smooth scroll to exactly center the selected item
        ref.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }, 50); // Small delay to ensure DOM is settled
  }, 150), [determineSelectedItem, displayHour, displayAmPm, onChangeCallbacks, to24HourFormat]);

  // Function to handle direct time input via text field
  const handleDirectTimeInput = useCallback((e) => {
    const timeString = inputValue;
    const timePattern = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i;
    if (timePattern.test(timeString)) {
      const matches = timeString.match(timePattern);
      let inputH = matches[1];
      const inputM = matches[2];
      const inputAP = matches[3].toUpperCase();
      if (parseInt(inputH,10) > 0 && parseInt(inputH,10) <= 12 && parseInt(inputM,10) >=0 && parseInt(inputM,10) <=59) {
        const hour24 = to24HourFormat(inputH, inputAP);
        onChangeCallbacks.hour(hour24);
        onChangeCallbacks.minute(inputM);
      } else {
        if (currentFullTime) {
          const display = to12HourFormat(currentFullTime.hour);
          setInputValue(`${display.hour}:${currentFullTime.minute} ${display.ampm}`);
        }
      }
    } else {
      if (currentFullTime) {
        const display = to12HourFormat(currentFullTime.hour);
        setInputValue(`${display.hour}:${currentFullTime.minute} ${display.ampm}`);
      }
    }
  }, [inputValue, onChangeCallbacks, currentFullTime, to12HourFormat, to24HourFormat]);

  return (
    <div className="time-input-custom-selector">
      <input 
        type="text" 
        className="time-display-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleDirectTimeInput}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        placeholder="hh:mm AM/PM"
      />
      <div className="time-selector-container">
        <div 
          className="time-selector-column hour-column" 
          ref={hourRef}
          onScroll={() => {
            if (scrollingColumn !== 'hour') {
              setScrollingColumn('hour');
            }
            handleScroll('hour', hourRef, hours12);
          }}
        >
          <ul>
            {hours12.map(h => (
              <li 
                key={`${timeType}-h-${h}`} 
                className={h === displayHour ? 'selected-time-item' : ''}
              >
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div 
          className="time-selector-column minute-column" 
          ref={minRef}
          onScroll={() => {
            if (scrollingColumn !== 'minute') {
              setScrollingColumn('minute');
            }
            handleScroll('minute', minRef, minutes);
          }}
        >
          <ul>
            {minutes.map(m => (
              <li 
                key={`${timeType}-m-${m}`} 
                className={(currentFullTime && m === currentFullTime.minute) ? 'selected-time-item' : ''}
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
        <div 
          className="time-selector-column ampm-column" 
          ref={amPmRef}
          onScroll={() => {
            if (scrollingColumn !== 'ampm') {
              setScrollingColumn('ampm');
            }
            handleScroll('ampm', amPmRef, ampm);
          }}
        >
          <ul>
            {ampm.map(ap => (
              <li 
                key={`${timeType}-ap-${ap}`} 
                className={ap === displayAmPm ? 'selected-time-item' : ''}
              >
                {ap}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const TripTypeSelector = ({ tripType, onTripTypeChange, surpriseType, onSurpriseTypeChange }) => {
  return (
    <div className="trip-type-selector">
      <div className="trip-type-options">
        <div 
          className={`trip-type-option ${tripType === 'custom' ? 'selected' : ''}`}
          onClick={() => onTripTypeChange('custom')}
        >
          <div className="trip-type-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
          <div className="trip-type-details">
            <h4>Custom Trip</h4>
            <p>Choose activities and locations based on your preferences</p>
          </div>
        </div>
        
        <div 
          className={`trip-type-option ${tripType === 'surprise' ? 'selected' : ''}`}
          onClick={() => onTripTypeChange('surprise')}
        >
          <div className="trip-type-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M16 6.5l3 5.5-3 5.5H8l-3-5.5L8 6.5h8M16 4H8c-.77 0-1.47.39-1.88 1.08l-3 5.5c-.41.69-.41 1.65 0 2.34l3 5.5c.41.69 1.11 1.08 1.88 1.08h8c.77 0 1.47-.39 1.88-1.08l3-5.5c.41-.69.41-1.65 0-2.34l-3-5.5C17.47 4.39 16.77 4 16 4z"/>
              <path d="M12 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM13.5 12V7h-3v1h2v4h1z"/>
            </svg>
          </div>
          <div className="trip-type-details">
            <h4>Surprise Me</h4>
            <p>Get a randomly generated itinerary tailored to this area</p>
          </div>
        </div>
      </div>
      
      {tripType === 'surprise' && (
        <div className="trip-type-options surprise-options">
          <div 
            className={`trip-type-option ${surpriseType === 'popular' ? 'selected' : ''}`}
            onClick={() => onSurpriseTypeChange('popular')}
          >
            <div className="trip-type-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
              </svg>
            </div>
            <div className="trip-type-details">
              <h4>Popular Attractions</h4>
              <p>Classic destinations and must-see places</p>
            </div>
          </div>
          
          <div 
            className={`trip-type-option ${surpriseType === 'niche' ? 'selected' : ''}`}
            onClick={() => onSurpriseTypeChange('niche')}
          >
            <div className="trip-type-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
              </svg>
            </div>
            <div className="trip-type-details">
              <h4>Off the Beaten Path</h4>
              <p>Unique, hidden gems and local favorites</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivitySelector = ({ 
  selectedActivities, 
  onActivityToggle, 
  customActivity, 
  onCustomActivityChange,
  tripPreference,
  onTripPreferenceChange
}) => {
  const [expandedCategories, setExpandedCategories] = useState([]);
  
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };
  
  if (tripPreference === 'surprise') {
    return null; // Don't show activity selector for surprise mode
  }
  
  return (
    <div className="activity-selector">
      <div className="activities-grid-container">
        <div className="activities-grid">
          {ACTIVITY_CATEGORIES.map(category => (
            <div key={category.name} className="activity-category">
              <div 
                className="category-header" 
                onClick={() => toggleCategory(category.name)}
              >
                <h4>{category.name}</h4>
                <span className={`toggle-icon ${expandedCategories.includes(category.name) ? 'expanded' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d={expandedCategories.includes(category.name) 
                      ? "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" 
                      : "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"}
                    />
                  </svg>
                </span>
              </div>
              
              {expandedCategories.includes(category.name) && (
                <div className="activity-options">
                  {category.options.map(activity => (
                    <div 
                      key={activity} 
                      className={`activity-option ${selectedActivities.includes(activity) ? 'selected' : ''}`}
                      onClick={() => onActivityToggle(activity)}
                    >
                      {activity}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="custom-activity">
        <h4>What would you like to do?</h4>
        <textarea
          value={customActivity}
          onChange={e => onCustomActivityChange(e.target.value)}
          placeholder="Describe your ideal adventure in this area..."
          rows={3}
        ></textarea>
      </div>
    </div>
  );
};

const ExplorePopup = ({ region, onClose }) => {
  // Form state
  const [timeRange, setTimeRange] = useState({
    start: { hour: '07', minute: '00' }, // 7:00 AM in 24h format
    end: { hour: '21', minute: '00' },   // 9:00 PM in 24h format
  });
  const [tripType, setTripType] = useState('surprise'); // 'surprise' or 'custom'
  const [surpriseType, setSurpriseType] = useState('popular'); // 'popular' or 'niche'
  const [activities, setActivities] = useState([]);
  const [customActivity, setCustomActivity] = useState('');
  const [userPreferences, setUserPreferences] = useState(null);
  const [timeSelectorKey, setTimeSelectorKey] = useState(0); // New state for key
  
  // Itinerary generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryData, setItineraryData] = useState(null);
  const [showItinerary, setShowItinerary] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  
  // Show form by default
  const [showForm, setShowForm] = useState(true);
  
  // Reset form to default values when opened (when region changes or component mounts)
  useEffect(() => {
    console.log("[ExplorePopup] useEffect for form reset triggered. Region:", region);
    // Default time values
    setTimeRange({
      start: { hour: '07', minute: '00' }, // 7:00 AM in 24h format
      end: { hour: '21', minute: '00' },   // 9:00 PM in 24h format
    });
    
    // Reset other form values if needed
    setTripType('surprise');
    setSurpriseType('popular');
    setActivities([]);
    setCustomActivity('');
    
    // Reset state related to itinerary generation
    setShowForm(true);
    setIsGenerating(false);
    setShowItinerary(false);
    setItineraryData(null);
    setGenerationError(null);
    setTimeSelectorKey(prevKey => {
      console.log("[ExplorePopup] Updating timeSelectorKey from", prevKey, "to", prevKey + 1);
      return prevKey + 1;
    });
  }, [region]);
  
  // Fetch user preferences when component mounts
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        
        const db = getFirestore();
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists() && docSnap.data().preferences) {
          setUserPreferences(docSnap.data().preferences);
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
      }
    };
    
    fetchUserPreferences();
  }, []);
  
  const handleTimeChange = (timeType, part, value) => {
    console.log(`Time changed: ${timeType} ${part} to ${value}`);
    setTimeRange(prev => {
      const newTimeRange = {
        ...prev,
        [timeType]: {
          ...prev[timeType],
          [part]: value
        }
      };
      console.log('Updated time range:', JSON.stringify(newTimeRange));
      return newTimeRange;
    });
  };
  
  const handleTripTypeChange = (type) => {
    setTripType(type);
  };
  
  const handleSurpriseTypeChange = (type) => {
    setSurpriseType(type);
  };
  
  const handleActivityToggle = (activity) => {
    setActivities(prev => 
      prev.includes(activity)
        ? prev.filter(item => item !== activity)
        : [...prev, activity]
    );
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Don't allow multiple submissions
    if (isGenerating) {
      return;
    }
    
    // Validate time range
    if (!timeRange.start || !timeRange.end) {
      console.error("Time range is missing start or end time");
      setGenerationError("Please select a start and end time.");
      return;
    }
    
    // Prepare form data
    const formData = {
      region,
      timeRange,
      tripType,
      surpriseType,
      activities,
      customActivity,
      allActivityCategories: ACTIVITY_CATEGORIES // Send all activity categories to the backend
    };
    
    try {
      // Start generating the itinerary
      setIsGenerating(true);
      setShowForm(false); // Hide form to show loading/itinerary
      setGenerationError(null);
      
      // Generate the itinerary using the ItineraryService
      console.log("Calling generateItinerary with formData:", formData);
      const result = await generateItinerary(formData, userPreferences);
      
      // Log the result for debugging
      console.log("Received itinerary result:", result);
      
      // Set the itinerary data and show the itinerary display
      setItineraryData(result);
      setShowItinerary(true);
      console.log("Updated itineraryData state:", result);
      
    } catch (error) {
      console.error("Error generating itinerary:", error);
      setGenerationError("Failed to generate your itinerary. Please try again.");
      
      // Create a simple error itinerary
      setItineraryData({
        raw: "Sorry, we couldn't generate your itinerary at this time. This might be due to API limitations or network issues. Please try again later.",
        items: []
      });
      setShowItinerary(true);
      
    } finally {
      setIsGenerating(false); // Stop loading, itinerary (or error) will be shown
    }
  };
  
  const handleCloseItinerary = () => {
    setShowItinerary(false);
    setItineraryData(null);
    setShowForm(true); // Show form again if user closes itinerary
    // Call the main onClose to close the entire popup IF needed.
    // This depends on whether we want to go back to the form or close everything.
    // For now, let's assume closing itinerary means closing the popup.
    onClose(); 
  };

  return (
    <>
      {/* Show form when showForm is true, not generating, and not showing itinerary */}
      {showForm && !isGenerating && !showItinerary && (
        <div className="explore-popup-overlay" onClick={onClose}>
          <div className="explore-popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={onClose}>×</button>
          
            <h2>Create Your Adventure</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="form-section">
                <h3>When do you want to explore?</h3>
                <div className="time-range">
                  <div className="time-input">
                    <label>Start Time</label>
                    <TimeSelector
                      key={`start-${timeSelectorKey}`}
                      startTime={timeRange.start}
                      endTime={timeRange.end}
                      onStartTimeChange={{
                        hour: (h) => handleTimeChange('start', 'hour', h),
                        minute: (m) => handleTimeChange('start', 'minute', m),
                      }}
                      onEndTimeChange={{}}
                      timeType="start"
                    />
                  </div>
                  <div className="time-input">
                    <label>End Time</label>
                    <TimeSelector
                      key={`end-${timeSelectorKey}`}
                      startTime={timeRange.start}
                      endTime={timeRange.end}
                      onStartTimeChange={{}}
                      onEndTimeChange={{
                        hour: (h) => handleTimeChange('end', 'hour', h),
                        minute: (m) => handleTimeChange('end', 'minute', m),
                      }}
                      timeType="end"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>What type of adventure do you want?</h3>
                <TripTypeSelector 
                  tripType={tripType}
                  onTripTypeChange={handleTripTypeChange}
                  surpriseType={surpriseType}
                  onSurpriseTypeChange={handleSurpriseTypeChange}
                />
              </div>
              
              {tripType === 'custom' && (
                <ActivitySelector 
                  selectedActivities={activities} 
                  onActivityToggle={handleActivityToggle}
                  customActivity={customActivity}
                  onCustomActivityChange={setCustomActivity}
                  tripPreference={tripType}
                  onTripPreferenceChange={handleTripTypeChange}
                />
              )}
              
              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="generate-button" disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Itinerary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Show loading overlay when generating itinerary */}
      {isGenerating && (
        <div className="adventure-loading-overlay">
          <div className="adventure-loading-container">
            <div className="adventure-loading-spinner"></div>
            <h3 className="adventure-loading-text">Building your adventure</h3>
            <p className="adventure-loading-subtext">
              Exploring the area and finding the perfect spots for you...
            </p>
          </div>
        </div>
      )}
      
      {/* Show itinerary display when data is available and not generating */}
      {!isGenerating && showItinerary && itineraryData && (
        <ItineraryDisplay 
          itinerary={itineraryData} 
          onClose={handleCloseItinerary} 
        />
      )}
    </>
  );
};

export default ExplorePopup; 