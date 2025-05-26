import { useState, useRef, useEffect } from 'react';
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

const TimeSelector = ({ startTime, endTime, onStartTimeChange, onEndTimeChange }) => {
  const hours12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const ampm = ['AM', 'PM'];
  
  const startHourRef = useRef(null);
  const startMinRef = useRef(null);
  const startAmPmRef = useRef(null);
  const endHourRef = useRef(null);
  const endMinRef = useRef(null);
  const endAmPmRef = useRef(null);
  
  // State to track the display values for input fields
  const [displayValues, setDisplayValues] = useState({
    startHour: '12',
    startAmPm: 'AM',
    endHour: '12',
    endAmPm: 'PM'
  });
  
  // State to track the input field values separately
  const [startInputValue, setStartInputValue] = useState('');
  const [endInputValue, setEndInputValue] = useState('');
  
  // Convert 24-hour format to 12-hour format
  const to12HourFormat = (hour24) => {
    const hourNum = parseInt(hour24, 10);
    if (hourNum === 0) return { hour: '12', ampm: 'AM' };
    if (hourNum === 12) return { hour: '12', ampm: 'PM' };
    if (hourNum > 12) return { hour: (hourNum - 12).toString(), ampm: 'PM' };
    return { hour: hourNum.toString(), ampm: 'AM' };
  };
  
  // Convert 12-hour format to 24-hour format
  const to24HourFormat = (hour12, ampm) => {
    const hourNum = parseInt(hour12, 10);
    if (ampm === 'AM' && hourNum === 12) return '00';
    if (ampm === 'AM') return hourNum.toString().padStart(2, '0');
    if (ampm === 'PM' && hourNum === 12) return '12';
    return (hourNum + 12).toString().padStart(2, '0');
  };
  
  // Update display values when props change
  useEffect(() => {
    const startDisplay = to12HourFormat(startTime.hour);
    const endDisplay = to12HourFormat(endTime.hour);
    
    const newDisplayValues = {
      startHour: startDisplay.hour,
      startAmPm: startDisplay.ampm,
      endHour: endDisplay.hour,
      endAmPm: endDisplay.ampm
    };
    
    setDisplayValues(newDisplayValues);
  
    // Update input values when time changes from scroll or click
    setStartInputValue(`${newDisplayValues.startHour}:${startTime.minute} ${newDisplayValues.startAmPm}`);
    setEndInputValue(`${newDisplayValues.endHour}:${endTime.minute} ${newDisplayValues.endAmPm}`);
  }, [startTime, endTime]);
  
  // Set initial scroll position for the time selectors
  useEffect(() => {
    if (startHourRef.current) {
      const index = hours12.indexOf(displayValues.startHour);
      const centerOffset = Math.max(0, index - 2) * 40; // 40px is item height
      startHourRef.current.scrollTop = centerOffset;
    }
    
    if (startMinRef.current) {
      const index = minutes.indexOf(startTime.minute);
      const centerOffset = Math.max(0, index - 2) * 40;
      startMinRef.current.scrollTop = centerOffset;
    }
    
    if (startAmPmRef.current) {
      const index = ampm.indexOf(displayValues.startAmPm);
      const centerOffset = Math.max(0, index - 1) * 40;
      startAmPmRef.current.scrollTop = centerOffset;
    }
    
    if (endHourRef.current) {
      const index = hours12.indexOf(displayValues.endHour);
      const centerOffset = Math.max(0, index - 2) * 40;
      endHourRef.current.scrollTop = centerOffset;
    }
    
    if (endMinRef.current) {
      const index = minutes.indexOf(endTime.minute);
      const centerOffset = Math.max(0, index - 2) * 40;
      endMinRef.current.scrollTop = centerOffset;
    }
    
    if (endAmPmRef.current) {
      const index = ampm.indexOf(displayValues.endAmPm);
      const centerOffset = Math.max(0, index - 1) * 40;
      endAmPmRef.current.scrollTop = centerOffset;
    }
  }, [displayValues, startTime.minute, endTime.minute]);
  
  const handleScrollSelect = (ref, values, currentValue, onChange) => {
    if (!ref.current) return;
    
    const scrollTop = ref.current.scrollTop;
    const itemHeight = 40; // Height of each time item
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newValue = values[Math.min(selectedIndex, values.length - 1)];
    
    if (newValue !== currentValue) {
      onChange(newValue);
    }
  };
  
  // Handle hour change in 12-hour format
  const handleHour12Change = (hour12, timeType) => {
    const currentAmPm = timeType === 'start' 
      ? displayValues.startAmPm 
      : displayValues.endAmPm;
    
    const hour24 = to24HourFormat(hour12, currentAmPm);
    
    if (timeType === 'start') {
      onStartTimeChange.hour(hour24);
      setDisplayValues(prev => ({ ...prev, startHour: hour12 }));
      setStartInputValue(`${hour12}:${startTime.minute} ${currentAmPm}`);
    } else {
      onEndTimeChange.hour(hour24);
      setDisplayValues(prev => ({ ...prev, endHour: hour12 }));
      setEndInputValue(`${hour12}:${endTime.minute} ${currentAmPm}`);
    }
  };
  
  // Handle AM/PM change
  const handleAmPmChange = (newAmPm, timeType) => {
    const currentHour12 = timeType === 'start' 
      ? displayValues.startHour 
      : displayValues.endHour;
    
    const hour24 = to24HourFormat(currentHour12, newAmPm);
    
    if (timeType === 'start') {
      onStartTimeChange.hour(hour24);
      setDisplayValues(prev => ({ ...prev, startAmPm: newAmPm }));
      setStartInputValue(`${currentHour12}:${startTime.minute} ${newAmPm}`);
    } else {
      onEndTimeChange.hour(hour24);
      setDisplayValues(prev => ({ ...prev, endAmPm: newAmPm }));
      setEndInputValue(`${currentHour12}:${endTime.minute} ${newAmPm}`);
    }
  };
  
  // Handle direct time input
  const handleDirectTimeInput = (e, timeType) => {
    const timeString = timeType === 'start' ? startInputValue : endInputValue;
    const timePattern = /^(\d{1,2}):(\d{2})\s?(AM|PM)$/i;
    
    if (timePattern.test(timeString)) {
      const matches = timeString.match(timePattern);
      const hour12 = matches[1];
      const minute = matches[2];
      const ampm = matches[3].toUpperCase();
      
      const hour24 = to24HourFormat(hour12, ampm);
      
      if (timeType === 'start') {
        onStartTimeChange.hour(hour24);
        onStartTimeChange.minute(minute);
        setDisplayValues(prev => ({ ...prev, startHour: hour12, startAmPm: ampm }));
      } else {
        onEndTimeChange.hour(hour24);
        onEndTimeChange.minute(minute);
        setDisplayValues(prev => ({ ...prev, endHour: hour12, endAmPm: ampm }));
      }
    } else {
      // If invalid, reset to the current value from state
      if (timeType === 'start') {
        setStartInputValue(`${displayValues.startHour}:${startTime.minute} ${displayValues.startAmPm}`);
      } else {
        setEndInputValue(`${displayValues.endHour}:${endTime.minute} ${displayValues.endAmPm}`);
      }
    }
  };

  // Wrapper for start minute changes to also update input field
  const handleStartMinuteChange = (minute) => {
    onStartTimeChange.minute(minute);
    setStartInputValue(`${displayValues.startHour}:${minute} ${displayValues.startAmPm}`);
  };
  
  // Wrapper for end minute changes to also update input field
  const handleEndMinuteChange = (minute) => {
    onEndTimeChange.minute(minute);
    setEndInputValue(`${displayValues.endHour}:${minute} ${displayValues.endAmPm}`);
  };

  return (
    <div className="time-selector">
      <div className="time-group">
        <span className="time-label">Start Time:</span>
        <input 
          type="text" 
          className="time-direct-input"
          placeholder="e.g. 10:30 AM"
          value={startInputValue}
          onChange={(e) => {
            setStartInputValue(e.target.value);
          }}
          onBlur={(e) => handleDirectTimeInput(e, 'start')}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
        <div className="time-scroll-container">
          <div 
            className="time-scroll hour-scroll" 
            ref={startHourRef}
            onScroll={() => handleScrollSelect(startHourRef, hours12, displayValues.startHour, (hour) => handleHour12Change(hour, 'start'))}
          >
            {hours12.map(hour => (
              <div 
                key={`start-hour-${hour}`} 
                className={`time-item ${hour === displayValues.startHour ? 'selected' : ''}`}
                onClick={() => handleHour12Change(hour, 'start')}
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="time-separator">:</div>
          <div 
            className="time-scroll minute-scroll" 
            ref={startMinRef}
            onScroll={() => handleScrollSelect(startMinRef, minutes, startTime.minute, handleStartMinuteChange)}
          >
            {minutes.map(minute => (
              <div 
                key={`start-min-${minute}`} 
                className={`time-item ${minute === startTime.minute ? 'selected' : ''}`}
                onClick={() => handleStartMinuteChange(minute)}
              >
                {minute}
              </div>
            ))}
          </div>
          <div 
            className="time-scroll ampm-scroll" 
            ref={startAmPmRef}
            onScroll={() => handleScrollSelect(startAmPmRef, ampm, displayValues.startAmPm, (newAmPm) => handleAmPmChange(newAmPm, 'start'))}
          >
            {ampm.map(period => (
              <div 
                key={`start-ampm-${period}`} 
                className={`time-item ${period === displayValues.startAmPm ? 'selected' : ''}`}
                onClick={() => handleAmPmChange(period, 'start')}
              >
                {period}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="time-group">
        <span className="time-label">End Time:</span>
        <input 
          type="text" 
          className="time-direct-input"
          placeholder="e.g. 2:30 PM"
          value={endInputValue}
          onChange={(e) => {
            setEndInputValue(e.target.value);
          }}
          onBlur={(e) => handleDirectTimeInput(e, 'end')}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
        <div className="time-scroll-container">
          <div 
            className="time-scroll hour-scroll" 
            ref={endHourRef}
            onScroll={() => handleScrollSelect(endHourRef, hours12, displayValues.endHour, (hour) => handleHour12Change(hour, 'end'))}
          >
            {hours12.map(hour => (
              <div 
                key={`end-hour-${hour}`} 
                className={`time-item ${hour === displayValues.endHour ? 'selected' : ''}`}
                onClick={() => handleHour12Change(hour, 'end')}
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="time-separator">:</div>
          <div 
            className="time-scroll minute-scroll" 
            ref={endMinRef}
            onScroll={() => handleScrollSelect(endMinRef, minutes, endTime.minute, handleEndMinuteChange)}
          >
            {minutes.map(minute => (
              <div 
                key={`end-min-${minute}`} 
                className={`time-item ${minute === endTime.minute ? 'selected' : ''}`}
                onClick={() => handleEndMinuteChange(minute)}
              >
                {minute}
              </div>
            ))}
          </div>
          <div 
            className="time-scroll ampm-scroll" 
            ref={endAmPmRef}
            onScroll={() => handleScrollSelect(endAmPmRef, ampm, displayValues.endAmPm, (newAmPm) => handleAmPmChange(newAmPm, 'end'))}
          >
            {ampm.map(period => (
              <div 
                key={`end-ampm-${period}`} 
                className={`time-item ${period === displayValues.endAmPm ? 'selected' : ''}`}
                onClick={() => handleAmPmChange(period, 'end')}
              >
                {period}
              </div>
            ))}
          </div>
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
        <div className="surprise-options">
          <h4>Surprise Style:</h4>
          <div className="surprise-type-options">
            <div 
              className={`surprise-type-option ${surpriseType === 'niche' ? 'selected' : ''}`}
              onClick={() => onSurpriseTypeChange('niche')}
            >
              <div className="surprise-type-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
                </svg>
              </div>
              <span>Go Niche</span>
              <p>Unique, off-the-beaten-path experiences</p>
            </div>
            
            <div 
              className={`surprise-type-option ${surpriseType === 'mainstream' ? 'selected' : ''}`}
              onClick={() => onSurpriseTypeChange('mainstream')}
            >
              <div className="surprise-type-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
                </svg>
              </div>
              <span>Go Mainstream</span>
              <p>Popular attractions and classic activities</p>
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
  const [timeRange, setTimeRange] = useState({ start: '09:00', end: '17:00' });
  const [tripType, setTripType] = useState('surprise'); // 'surprise' or 'custom'
  const [surpriseType, setSurpriseType] = useState('popular'); // 'popular' or 'niche'
  const [activities, setActivities] = useState([]);
  const [customActivity, setCustomActivity] = useState('');
  const [userPreferences, setUserPreferences] = useState(null);
  
  // Itinerary generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryData, setItineraryData] = useState(null);
  const [showItinerary, setShowItinerary] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  
  // Show form by default
  const [showForm, setShowForm] = useState(true);
  
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
  
  const handleTimeChange = (field, value) => {
    setTimeRange(prev => ({ ...prev, [field]: value }));
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
                    <label htmlFor="start-time">Start Time</label>
                    <input
                      type="time"
                      id="start-time"
                      value={timeRange.start}
                      onChange={(e) => handleTimeChange('start', e.target.value)}
                      required
                    />
                  </div>
                  <div className="time-input">
                    <label htmlFor="end-time">End Time</label>
                    <input
                      type="time"
                      id="end-time"
                      value={timeRange.end}
                      onChange={(e) => handleTimeChange('end', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3>What type of adventure do you want?</h3>
                <div className="trip-type-options">
                  <div 
                    className={`trip-type-option ${tripType === 'custom' ? 'selected' : ''}`}
                    onClick={() => handleTripTypeChange('custom')}
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
                    onClick={() => handleTripTypeChange('surprise')}
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
                  <div className="surprise-type-selector">
                    <label>I prefer:</label>
                    <div className="surprise-options">
                      <div className="surprise-option">
                        <input
                          type="radio"
                          id="popular"
                          name="surprise-type"
                          checked={surpriseType === 'popular'}
                          onChange={() => handleSurpriseTypeChange('popular')}
                        />
                        <label htmlFor="popular">Popular attractions</label>
                      </div>
                      <div className="surprise-option">
                        <input
                          type="radio"
                          id="niche"
                          name="surprise-type"
                          checked={surpriseType === 'niche'}
                          onChange={() => handleSurpriseTypeChange('niche')}
                        />
                        <label htmlFor="niche">Off the beaten path</label>
                      </div>
                    </div>
                  </div>
                )}
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