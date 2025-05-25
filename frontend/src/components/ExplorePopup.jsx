import { useState, useRef, useEffect } from 'react';
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
  
  // Get display values for time inputs
  const getTimeDisplayValues = () => {
    const startDisplay = to12HourFormat(startTime.hour);
    const endDisplay = to12HourFormat(endTime.hour);
    
    return {
      startHour: startDisplay.hour,
      startAmPm: startDisplay.ampm,
      endHour: endDisplay.hour,
      endAmPm: endDisplay.ampm
    };
  };
  
  const displayValues = getTimeDisplayValues();
  
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
  }, []);
  
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
    } else {
      onEndTimeChange.hour(hour24);
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
    } else {
      onEndTimeChange.hour(hour24);
    }
  };
  
  // Handle direct time input
  const handleDirectTimeInput = (e, timeType) => {
    const timeString = e.target.value;
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
      } else {
        onEndTimeChange.hour(hour24);
        onEndTimeChange.minute(minute);
      }
    }
  };

  return (
    <div className="time-selector">
      <div className="time-group">
        <span className="time-label">Start Time:</span>
        <input 
          type="text" 
          className="time-direct-input"
          placeholder="e.g. 10:30 AM"
          defaultValue={`${displayValues.startHour}:${startTime.minute} ${displayValues.startAmPm}`}
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
            onScroll={() => handleScrollSelect(startMinRef, minutes, startTime.minute, onStartTimeChange.minute)}
          >
            {minutes.map(minute => (
              <div 
                key={`start-min-${minute}`} 
                className={`time-item ${minute === startTime.minute ? 'selected' : ''}`}
                onClick={() => onStartTimeChange.minute(minute)}
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
          defaultValue={`${displayValues.endHour}:${endTime.minute} ${displayValues.endAmPm}`}
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
            onScroll={() => handleScrollSelect(endMinRef, minutes, endTime.minute, onEndTimeChange.minute)}
          >
            {minutes.map(minute => (
              <div 
                key={`end-min-${minute}`} 
                className={`time-item ${minute === endTime.minute ? 'selected' : ''}`}
                onClick={() => onEndTimeChange.minute(minute)}
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

const ExplorePopup = ({ region, onClose, onSubmit }) => {
  // State for time selection
  const [startTime, setStartTime] = useState({
    hour: '10', // Default to 10:00 AM
    minute: '00'
  });
  
  const [endTime, setEndTime] = useState({
    hour: '12', // Default to 12:00 PM
    minute: '00'
  });
  
  // State for trip type
  const [tripType, setTripType] = useState('custom'); // 'custom' or 'surprise'
  const [surpriseType, setSurpriseType] = useState('mainstream'); // 'niche' or 'mainstream'
  
  // State for activity selection
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [customActivity, setCustomActivity] = useState('');
  
  // Ref for the popup content
  const popupRef = useRef(null);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  // Handlers for time changes
  const handleStartHourChange = (hour) => {
    setStartTime(prev => ({ ...prev, hour }));
  };
  
  const handleStartMinuteChange = (minute) => {
    setStartTime(prev => ({ ...prev, minute }));
  };
  
  const handleEndHourChange = (hour) => {
    setEndTime(prev => ({ ...prev, hour }));
  };
  
  const handleEndMinuteChange = (minute) => {
    setEndTime(prev => ({ ...prev, minute }));
  };
  
  // Handler for trip type change
  const handleTripTypeChange = (type) => {
    setTripType(type);
  };
  
  // Handler for surprise type change
  const handleSurpriseTypeChange = (type) => {
    setSurpriseType(type);
  };
  
  // Handler for toggling activities
  const handleActivityToggle = (activity) => {
    setSelectedActivities(prev => 
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };
  
  // Handler for custom activity change
  const handleCustomActivityChange = (text) => {
    setCustomActivity(text);
  };
  
  // Handler for form submission
  const handleSubmit = () => {
    const formData = {
      region,
      timeRange: {
        start: `${startTime.hour}:${startTime.minute}`,
        end: `${endTime.hour}:${endTime.minute}`
      },
      tripType,
      surpriseType: tripType === 'surprise' ? surpriseType : null,
      activities: selectedActivities,
      customActivity: customActivity.trim() || null
    };
    
    onSubmit(formData);
  };
  
  return (
    <div className="explore-popup-overlay">
      <div className="explore-popup" ref={popupRef}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <h2>Plan Your Adventure</h2>
        {region.type === 'circle' && (
          <p className="region-info">
            Area: {(Math.PI * Math.pow(region.radius / 1000, 2)).toFixed(2)} sq km
          </p>
        )}
        
        <div className="popup-section">
          <h3>1. Select Time Duration</h3>
          <TimeSelector
            startTime={startTime}
            endTime={endTime}
            onStartTimeChange={{
              hour: handleStartHourChange,
              minute: handleStartMinuteChange
            }}
            onEndTimeChange={{
              hour: handleEndHourChange,
              minute: handleEndMinuteChange
            }}
          />
        </div>
        
        <div className="popup-section">
          <h3>2. Choose Trip Type</h3>
          <TripTypeSelector 
            tripType={tripType} 
            onTripTypeChange={handleTripTypeChange}
            surpriseType={surpriseType}
            onSurpriseTypeChange={handleSurpriseTypeChange}
          />
        </div>
        
        {tripType === 'custom' && (
          <div className="popup-section">
            <h3>3. What Do You Want To Do?</h3>
            <p className="section-hint">Select all that apply</p>
            <ActivitySelector 
              selectedActivities={selectedActivities}
              onActivityToggle={handleActivityToggle}
              customActivity={customActivity}
              onCustomActivityChange={handleCustomActivityChange}
              tripPreference={tripType}
              onTripPreferenceChange={handleTripTypeChange}
            />
          </div>
        )}
        
        <div className="popup-section submission-section">
          <button className="submit-button" onClick={handleSubmit}>
            Create My TouchGrass
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExplorePopup; 