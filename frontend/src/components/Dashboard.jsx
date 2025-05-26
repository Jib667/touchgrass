import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, signOutUser, deleteUserAccount } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import MapComponent from './GoogleMap';
import ExplorePopup from './ExplorePopup';
import ErrorBoundary from './ErrorBoundary';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSideNav, setShowSideNav] = useState(false);
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'profile'
  const [userPreferences, setUserPreferences] = useState(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [drawingMode, setDrawingMode] = useState(null); // null, 'circle', or 'polygon'
  const [showExplorePopup, setShowExplorePopup] = useState(false);
  const [mapScriptLoaded, setMapScriptLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [confirmedRegion, setConfirmedRegion] = useState(null);
  const [showConfirmHint, setShowConfirmHint] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesApiError, setPlacesApiError] = useState(false);
  const navigate = useNavigate();
  const db = getFirestore();
  const mainContentRef = useRef(null);
  const mapRef = useRef(null);

  // New state for autocomplete
  const [autocompleteValue, setAutocompleteValue] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [autocompleteError, setAutocompleteError] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    // Load recent searches from localStorage on initial render
    const savedSearches = localStorage.getItem('recentSearches');
    return savedSearches ? JSON.parse(savedSearches) : [];
  });
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const searchInputRef = useRef(null);

  const handleMapLoadStateChange = useCallback(({ isLoaded, loadError }) => {
    setMapScriptLoaded(isLoaded);
    setMapLoadError(loadError);
    if (isLoaded && !loadError) {
      // init();
    }
  }, []);

  useEffect(() => {
    if (mapLoadError) {
      console.error("Dashboard: Map Load Error reported from MapComponent:", mapLoadError);
    }
  }, [mapLoadError]);

  useEffect(() => {
    console.log("Dashboard mounted, checking user status");
    
    // Set initial user from auth immediately
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("No current user available on initial check");
      setLoading(false);
      // Redirect to login if no user
      navigate('/');
      return;
    }
    
    // Set user and immediately stop loading
    setUser(currentUser);
    setLoading(false);
    
    // Fetch user preferences when currentView is 'profile'
    if (currentView === 'profile') {
      fetchUserPreferences(currentUser.uid);
    }
    
  }, [navigate, currentView]);

  // Fetch user preferences from Firestore
  const fetchUserPreferences = async (userId) => {
    setPreferencesLoading(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.preferences) {
          setUserPreferences(userData.preferences);
        } else {
          setUserPreferences(null);
        }
      } else {
        setUserPreferences(null);
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      setUserPreferences(null);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };
  
  const toggleSideNav = () => {
    setShowSideNav(!showSideNav);
  };
  
  const handleSignOut = async () => {
    try {
      setLoading(true);
      const result = await signOutUser();
      if (result.success) {
        navigate('/'); // Navigate to landing page
      } else {
        console.error("Failed to sign out", result.error);
        setLoadingError("Failed to sign out. Please try again.");
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      setLoadingError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const openConfirmModal = () => {
    setShowConfirmModal(true);
    setShowProfileDropdown(false);
  };
  
  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };
  
  const handleRemoveAccount = async () => {
    try {
      setLoading(true);
      const result = await deleteUserAccount();
      
      if (result.success) {
        setShowConfirmModal(false);
        setShowSuccessModal(true);
        // Don't navigate immediately, let the user see the success message
      } else {
        if (result.error.code === 'auth/requires-recent-login') {
          alert(result.error.message);
          // Sign the user out so they can sign in again
          await signOutUser();
          navigate('/');
        } else {
          setLoadingError("Failed to delete your account: " + result.error.message);
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error removing account:", error);
      setLoadingError("Failed to remove your account. Please try again.");
      setLoading(false);
    }
  };
  
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/');
  };
  
  const handleViewProfile = () => {
    setCurrentView('profile');
    setShowProfileDropdown(false);
    setShowSideNav(false);
    
    // Fetch user preferences when switching to profile view
    if (user) {
      fetchUserPreferences(user.uid);
    }
    
    // Reset scroll position when switching to profile view
    setTimeout(() => {
      if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
      }
    }, 50);
  };
  
  const handleViewDashboard = () => {
    setCurrentView('main');
    setShowSideNav(false);
  };

  // Update the useEffect to handle clicks outside the search bar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.user-info')) {
        setShowProfileDropdown(false);
      }
      
      if (showSideNav && !event.target.closest('.navbar-menu') && !event.target.closest('.hamburger-menu')) {
        setShowSideNav(false);
      }

      // Hide search suggestions and recent searches when clicking outside
      if (!event.target.closest('.search-input-wrapper')) {
        setAutocompleteSuggestions([]);
        setShowRecentSearches(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileDropdown, showSideNav]);

  // Update the MapComponent's onRegionSelect handler to clear popular places
  const handleRegionSelect = (regionData) => {
    console.log("Region selected:", regionData);
    
    // Clear previous places when selecting a new region
    setPopularPlaces([]);
    
    if (regionData) {
      setSelectedRegion(regionData);
      // Show confirmation hint for any selected region (circle or polygon)
      setShowConfirmHint(true);
    } else {
      setSelectedRegion(null);
      setShowConfirmHint(false);
    }
  };
  
  // Handler for explore button click
  const handleExplore = () => {
    if (!selectedRegion) return;
    
    // Show the explore popup instead of an alert
    setShowExplorePopup(true);
  };

  // Handler for closing the explore popup
  const handleCloseExplorePopup = () => {
    setShowExplorePopup(false);
  };

  // Handler for submitting the explore form
  const handleExploreSubmit = (formData) => {
    console.log("Explore form submitted:", formData);
    
    // TODO: Process the form data and generate an itinerary
    // This will be implemented in a future phase
    
    // For now, just show an alert with the data
    alert(`Your TouchGrass adventure is being created!\nSelected time: ${formData.timeRange.start} - ${formData.timeRange.end}\nActivities: ${formData.activities.join(', ')}\n${formData.customActivity ? `Custom: ${formData.customActivity}` : ''}`);
    
    // Close the popup
    setShowExplorePopup(false);
    
    // Reset the selection
    setSelectedRegion(null);
    setDrawingMode(null);
  };

  // Add this effect to search for popular places when region is confirmed
  useEffect(() => {
    if (!confirmedRegion || !mapScriptLoaded) {
      console.log("Cannot search for places yet. Missing requirements:", {
        confirmedRegion: !!confirmedRegion,
        mapScriptLoaded: !!mapScriptLoaded
      });
      return;
    }
    setLoadingPlaces(true);
    setPlacesApiError(false);

    const fetchPopularPlacesREST = async ({ lat, lng, radius }) => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const url = `https://places.googleapis.com/v1/places:searchNearby?key=${apiKey}`;
      const body = {
        includedTypes: ["tourist_attraction", "park"],
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        }
      };
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.displayName,places.rating,places.userRatingCount"
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Places API error response:', errorText);
          throw new Error("Places API error: " + errorText);
        }
        const data = await response.json();
        return data.places || [];
      } catch (error) {
        throw error;
      }
    };

    const getRegionCenterAndRadius = (region) => {
      if (region.type === 'circle') {
        return {
          lat: region.center.lat,
          lng: region.center.lng,
          radius: region.radius
        };
      } else if (region.type === 'polygon') {
        const bounds = new window.google.maps.LatLngBounds();
        region.path.forEach(point => bounds.extend(point));
        const center = bounds.getCenter();
        const ne = bounds.getNorthEast();
        const radius = window.google.maps.geometry.spherical.computeDistanceBetween(center, ne);
        return {
          lat: center.lat(),
          lng: center.lng(),
          radius: radius
        };
      }
      return null;
    };

    const fetchPopularPlaces = async () => {
      try {
        const regionInfo = getRegionCenterAndRadius(confirmedRegion);
        if (!regionInfo) throw new Error("Invalid region info");
        const places = await fetchPopularPlacesREST(regionInfo);
        setPopularPlaces(places);
        setLoadingPlaces(false);
      } catch (error) {
        console.error("Error fetching popular places (REST):", error);
        setPlacesApiError(true);
        setLoadingPlaces(false);
      }
    };

    fetchPopularPlaces();
  }, [confirmedRegion, mapScriptLoaded]);

  // Handle clear region
  const handleClearRegion = () => {
    setSelectedRegion(null);
    setConfirmedRegion(null);
    setDrawingMode(null);
    setPopularPlaces([]);
    setPlacesApiError(false);
    setShowConfirmHint(false);
  };

  // Set drawing mode
  const handleSetDrawingMode = (mode) => {
    setDrawingMode(mode);
    
    // Don't clear selection if simply turning off drawing mode
    if (mode === null) return;
    
    // Only clear these when changing drawing mode
    setSelectedRegion(null);
    setConfirmedRegion(null);
    setSelectedPlace(null);
    setPopularPlaces([]);
    setPlacesApiError(false);
  };

  // Add this new effect for handling Enter key
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && selectedRegion) {
        console.log("Enter pressed - confirming region:", selectedRegion);
        
        // Use the map's confirmRegion method if available
        if (mapRef.current && mapRef.current.confirmRegion) {
          mapRef.current.confirmRegion();
        }
        
        setConfirmedRegion(selectedRegion);
        setDrawingMode(null); // Exit drawing mode
        
        // Remove the confirmation message
        setShowConfirmHint(false);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [selectedRegion]);

  const handleGoToPlace = () => {
    if (selectedPlace && mapRef.current) {
      mapRef.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      mapRef.current.setZoom(14);
      setSelectedPlace(null);
      setAutocompleteValue('');
    }
  };

  // Update the rendering of popular places to handle REST API results
  const renderPopularPlace = (place) => {
    const name = place.displayName?.text || place.name;
    const rating = place.rating;
    const ratingsTotal = place.userRatingCount || place.user_ratings_total || 0;
    return (
      <li key={place.id || name} className="popular-place-item">
        <div className="popular-place-name">{name}</div>
        {rating && (
          <div className="popular-place-rating">
            ★ {typeof rating === 'number' ? rating.toFixed(1) : rating} ({ratingsTotal})
          </div>
        )}
      </li>
    );
  };

  // New function to add a recent search
  const addRecentSearch = (search) => {
    // Don't add empty searches
    if (!search.trim()) return;
    
    // Add to the beginning and remove duplicates
    const newSearches = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    
    // Update state
    setRecentSearches(newSearches);
    
    // Save to localStorage
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));
  };

  // Function to handle click on a recent search
  const handleRecentSearchClick = (search) => {
    setAutocompleteValue(search);
    setShowRecentSearches(false);
    fetchAutocompleteSuggestions(search);
  };

  // New function to clear search
  const clearSearch = () => {
    setAutocompleteValue("");
    setAutocompleteSuggestions([]);
  };

  // Update the fetchAutocompleteSuggestions function
  const fetchAutocompleteSuggestions = async (input) => {
    if (!input || !input.trim()) {
      setAutocompleteSuggestions([]);
      return;
    }
    
    setAutocompleteLoading(true);
    setAutocompleteError(null);
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const url = `https://places.googleapis.com/v1/places:autocomplete?key=${apiKey}`;
    const body = {
      input,
      languageCode: 'en'
    };
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text"
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        setAutocompleteError(errorText);
        setAutocompleteSuggestions([]);
        setAutocompleteLoading(false);
        return;
      }
      
      const data = await response.json();
      setAutocompleteSuggestions(data.suggestions || []);
      setAutocompleteLoading(false);
    } catch (error) {
      setAutocompleteError(error.message);
      setAutocompleteSuggestions([]);
      setAutocompleteLoading(false);
    }
  };

  // Modify debounced effect for autocomplete
  useEffect(() => {
    // Only fetch if there's input text
    if (autocompleteValue.trim()) {
      const handler = setTimeout(() => {
        fetchAutocompleteSuggestions(autocompleteValue);
      }, 300);
      return () => clearTimeout(handler);
    } else {
      setAutocompleteSuggestions([]);
    }
  }, [autocompleteValue]);

  const renderSearchAndPopular = () => {
    return (
      <div className="destination-search-container">
        <div className="search-input-wrapper">
          <input
            ref={searchInputRef}
            value={autocompleteValue}
            onChange={e => setAutocompleteValue(e.target.value)}
            onFocus={() => {
              if (recentSearches.length > 0 && !autocompleteValue.trim()) {
                setShowRecentSearches(true);
              }
            }}
            placeholder="Search for a destination..."
            className="destination-search-input"
          />
          {autocompleteValue && (
            <button 
              className="clear-search-btn" 
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          {/* Show recent searches if available and no search results */}
          {showRecentSearches && recentSearches.length > 0 && !autocompleteSuggestions.length && (
            <ul className="recent-searches">
              <li className="recent-searches-header">Recent Searches</li>
              {recentSearches.slice(0, 5).map((search, index) => (
                <li 
                  key={`recent-${index}`} 
                  onClick={() => handleRecentSearchClick(search)}
                  className="recent-search-item"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                  </svg>
                  {search}
                </li>
              ))}
            </ul>
          )}
          {/* Show error message */}
          {autocompleteError && <div className="search-error">{autocompleteError}</div>}
          {/* Show search suggestions */}
          {autocompleteSuggestions.length > 0 && (
            <ul className="destination-suggestions">
              {autocompleteSuggestions.map((suggestion) => {
                const pred = suggestion.placePrediction;
                if (!pred) return null;
                return (
                  <li
                    key={pred.placeId}
                    onClick={async () => {
                      const suggestionText = pred.structuredFormat?.mainText?.text || pred.text?.text || '';
                      
                      // Add to recent searches
                      addRecentSearch(suggestionText);
                      
                      // Clear search and suggestions immediately
                      setAutocompleteSuggestions([]);
                      setAutocompleteValue("");
                      setAutocompleteLoading(true);
                      
                      try {
                        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                        const url = `https://places.googleapis.com/v1/places/${pred.placeId}?key=${apiKey}`;
                        const response = await fetch(url, {
                          method: "GET",
                          headers: {
                            "Content-Type": "application/json",
                            "X-Goog-FieldMask": "location"
                          }
                        });
                        if (response.ok) {
                          const data = await response.json();
                          if (data.location && mapRef.current) {
                            const { latitude, longitude } = data.location;
                            mapRef.current.panTo({ lat: latitude, lng: longitude });
                            mapRef.current.setZoom(15);
                          }
                        }
                      } catch (err) {
                        setAutocompleteError("Could not pan to place location.");
                      } finally {
                        setAutocompleteLoading(false);
                      }
                    }}
                  >
                    <div>
                      <strong>{pred.structuredFormat?.mainText?.text || pred.text?.text}</strong>
                      {pred.structuredFormat?.secondaryText?.text && (
                        <div style={{ fontSize: '0.9em', color: '#b0ffb0' }}>
                          {pred.structuredFormat.secondaryText.text}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        
        <div className="popular-destinations-container">
          <h4>Popular Places</h4>
          {loadingPlaces ? (
            <div className="popular-destinations-message">
              Finding popular destinations...
            </div>
          ) : placesApiError ? (
            <div className="popular-destinations-error">
              <p>Unable to load popular places. This may be due to:</p>
              <ul>
                <li>API usage limits</li>
                <li>Places API not enabled in your Google Cloud Console</li>
              </ul>
              <p>Please check your API configuration and ensure the Places API is enabled.</p>
              <button 
                className="retry-places-button"
                onClick={() => {
                  setPlacesApiError(false);
                  setLoadingPlaces(true);
                  // Re-trigger the useEffect by "re-confirming" the region
                  const currentRegion = confirmedRegion;
                  setConfirmedRegion(null);
                  setTimeout(() => setConfirmedRegion(currentRegion), 100);
                }}
              >
                Retry
              </button>
            </div>
          ) : popularPlaces.length > 0 ? (
            <ul className="popular-places-list">
              {popularPlaces.map(place => renderPopularPlace(place))}
            </ul>
          ) : (
            <div className="popular-destinations-message">
              {/* Empty container with no message */}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard</div>
      </div>
    );
  }

  // Helper function to get readable preference labels
  const getPreferenceLabel = (key) => {
    const labels = {
      travelStyle: "Travel Style",
      interests: "Interests",
      pace: "Travel Pace",
      accommodation: "Accommodation"
    };
    return labels[key] || key;
  };

  // Helper function to format preference values for display
  const formatPreferenceValue = (key, value) => {
    if (!value) return "Not specified";
    
    // Travel Style values
    const travelStyleValues = {
      planner: "Detailed Plan",
      spontaneous: "Spontaneous",
      guided: "Guided Tours",
      like_local: "Like a Local"
    };
    
    // Interests values
    const interestsValues = {
      culture: "Culture & History",
      nature: "Nature & Outdoors",
      food: "Food & Dining",
      adventure: "Adventure & Activities"
    };
    
    // Pace values
    const paceValues = {
      relaxed: "Relaxed & Easy-going",
      balanced: "Balanced Mix",
      busy: "Action-packed & Busy",
      flexible: "Depends on Destination"
    };
    
    // Accommodation values
    const accommodationValues = {
      luxury: "Luxury Hotels",
      boutique: "Boutique/Unique Places",
      budget: "Budget-friendly Options",
      homestay: "Local Homestays/Airbnb"
    };
    
    // Determine which set of values to use based on the key
    let displayValue;
    if (key === 'travelStyle') {
      displayValue = travelStyleValues[value];
    } else if (key === 'interests') {
      displayValue = interestsValues[value];
    } else if (key === 'pace') {
      displayValue = paceValues[value];
    } else if (key === 'accommodation') {
      displayValue = accommodationValues[value];
    }
    
    return displayValue || value;
  };

  const renderHeader = () => (
    <header className="dashboard-header">
      <div className="dashboard-logo-container">
        <div className="hamburger-menu" onClick={toggleSideNav}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="dashboard-logo">Touch<span className="capital">G</span>rass</div>
      </div>
      
      {/* Sidebar navigation */}
      {showSideNav && (
        <div className="navbar-menu">
          <ul>
            <li 
              className={currentView === 'main' ? 'active' : ''} 
              onClick={handleViewDashboard}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              Dashboard
            </li>
            <li 
              className={currentView === 'profile' ? 'active' : ''} 
              onClick={handleViewProfile}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              Profile
            </li>
            <li onClick={handleSignOut}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              Sign out
            </li>
          </ul>
        </div>
      )}
      
      <div className="user-info" onClick={toggleProfileDropdown}>
        {user?.photoURL ? (
          <img 
            src={user.photoURL} 
            alt="Profile" 
            className="user-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="user-avatar-placeholder">
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
        )}
        <span className="user-name">{user?.displayName || user?.email || 'User'}</span>
        
        <div className="dropdown-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
        
        {/* Profile dropdown menu */}
        {showProfileDropdown && (
          <div className="profile-dropdown">
            <ul>
              <li onClick={handleViewProfile}>Profile</li>
              <li onClick={openConfirmModal}>Remove account</li>
              <li onClick={handleSignOut}>Sign out</li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );

  const renderMainView = () => (
    <main className="dashboard-content">
      <div className="dashboard-map-container">
        <ErrorBoundary showReset={true}>
          <MapComponent
            onRegionSelect={handleRegionSelect}
            drawingMode={drawingMode}
            ref={mapRef}
            onLoadStateChange={handleMapLoadStateChange}
            showConfirmHint={showConfirmHint}
          />
        </ErrorBoundary>
        
        {selectedRegion && (
          <div className="explore-button-container">
            <button className="explore-button" onClick={handleExplore}>
              Explore
            </button>
          </div>
        )}
        
        <div className="dashboard-sidebar-overlay">
          <h2>Explore</h2>
          {renderSearchAndPopular()}
          
          <div className="drawing-tools-panel">
            <div className="drawing-tool-container" onClick={() => handleSetDrawingMode('circle')}>
              <button className={`drawing-tool-button ${drawingMode === 'circle' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                  <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.4"/>
                </svg>
                <span>Circle</span>
              </button>
            </div>
            <div className="drawing-tool-container" onClick={() => handleSetDrawingMode('polygon')}>
              <button className={`drawing-tool-button ${drawingMode === 'polygon' ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M12 2L4 12l8 10 8-10z" fillOpacity="0.4"/>
                  <path d="M12 2L4 12l8 10 8-10L12 2zm0 2.83L18.17 12 12 19.17 5.83 12 12 4.83z"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="4.5" r="1.5" fill="currentColor"/>
                  <circle cx="19.5" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="19.5" r="1.5" fill="currentColor"/>
                  <circle cx="4.5" cy="12" r="1.5" fill="currentColor"/>
                </svg>
                <span>Custom</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  const renderProfileView = () => (
    <main className="dashboard-content profile-view">
      <div className="profile-header">
        <button className="back-button" onClick={() => setCurrentView('main')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Dashboard
        </button>
        <h1>Your Profile</h1>
      </div>
      
      <div className="profile-content">
        <div className="profile-section">
          <h2>User Information</h2>
          <div className="profile-details">
            <div className="profile-detail">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{user?.displayName || 'Not provided'}</span>
            </div>
            <div className="profile-detail">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user?.email}</span>
            </div>
          </div>
        </div>
        
        <div className="profile-section">
          <h2>Your Preferences</h2>
          {preferencesLoading ? (
            <div className="preferences-loading">
              <p>Loading your preferences...</p>
            </div>
          ) : userPreferences && Object.keys(userPreferences).length > 0 ? (
            <div className="preferences-list">
              {Object.entries(userPreferences).map(([key, value]) => (
                <div className="preference-item" key={key}>
                  <span className="preference-label">{getPreferenceLabel(key)}:</span>
                  <span className="preference-value">{formatPreferenceValue(key, value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-preferences">
              <p>No preferences found. Complete the onboarding questionnaire to set your preferences.</p>
            </div>
          )}
        </div>
        
        <div className="profile-section">
          <h2>Friends</h2>
          <div className="friends-list">
            <div className="empty-friends">
              <p>Connect with friends to plan trips together.</p>
              <button className="add-friend-button" disabled>Add Friends (Coming Soon)</button>
            </div>
          </div>
        </div>
        
        <div className="profile-section">
          <h2>Groups</h2>
          <div className="groups-list">
            <div className="empty-groups">
              <p>Create or join groups for group adventures.</p>
              <button className="create-group-button" disabled>Create Group (Coming Soon)</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
  
  const renderConfirmModal = () => (
    <div className="confirm-modal-overlay" onClick={closeConfirmModal}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h2>Delete Account</h2>
        </div>
        <div className="confirm-modal-content">
          <p>Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.</p>
          <div className="confirm-modal-actions">
            <button className="cancel-action" onClick={closeConfirmModal}>
              Cancel
            </button>
            <button className="confirm-action" onClick={handleRemoveAccount}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessModal = () => (
    <div className="success-modal-overlay">
      <div className="success-modal">
        <div className="success-modal-header">
          <h2>Success</h2>
        </div>
        <div className="success-modal-content">
          <p>Your account has been successfully deleted.</p>
          <div className="success-modal-actions">
            <button className="success-action" onClick={handleSuccessModalClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Header with logo and user info */}
      {renderHeader()}
      
      {loadingError && (
        <div className="dashboard-error">
          {loadingError}
        </div>
      )}
      
      <div className="dashboard-main" ref={mainContentRef}>
        {/* Conditional rendering based on current view */}
        {currentView === 'main' ? renderMainView() : renderProfileView()}
      </div>
      
      {/* Confirm modal for account deletion */}
      {showConfirmModal && renderConfirmModal()}
      
      {/* Success modal after account deletion */}
      {showSuccessModal && renderSuccessModal()}
      
      {/* Explore popup */}
      {showExplorePopup && selectedRegion && (
        <ExplorePopup 
          region={selectedRegion}
          onClose={handleCloseExplorePopup}
          onSubmit={handleExploreSubmit}
        />
      )}
    </div>
  );
};

export default Dashboard; 