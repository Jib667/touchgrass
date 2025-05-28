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

  // Handler for region select
  const handleRegionSelect = (regionData) => {
    console.log("[Dashboard] handleRegionSelect called. New regionData:", JSON.stringify(regionData));
    console.log("[Dashboard] Current selectedRegion BEFORE update:", JSON.stringify(selectedRegion));
    
    // Don't clear popular places if we already have them
    if (!popularPlaces.length) {
      setPopularPlaces([]);
    }
    
    if (regionData) {
      setSelectedRegion(regionData);
      
      // Also set confirmed region when a region is selected
      setConfirmedRegion(regionData);
    } else {
      setSelectedRegion(null);
      setConfirmedRegion(null);
    }
  };
  
  // Handler for explore button click
  const handleExplore = () => {
    if (!selectedRegion) return;
    setShowExplorePopup(true);
  };

  // Handler for closing the explore popup
  const handleCloseExplorePopup = () => {
    setShowExplorePopup(false);
    // Reset the selection when the popup is closed from here
    setSelectedRegion(null);
    setConfirmedRegion(null); // Also clear confirmed region
    setDrawingMode(null);
    setPopularPlaces([]); // Clear popular places
    setPlacesApiError(false); // Reset API error state
  };

  // Add this effect to search for popular places when region is confirmed
  useEffect(() => {
    console.log("[Dashboard] useEffect for popular places triggered. ConfirmedRegion:", JSON.stringify(confirmedRegion), "MapScriptLoaded:", mapScriptLoaded);
    if (!confirmedRegion || !mapScriptLoaded) {
      console.log("[Dashboard] Cannot search for popular places yet. Missing requirements.");
      if (popularPlaces.length > 0) {
        setPopularPlaces([]);
      }
      return;
    }
    
    setLoadingPlaces(true);
    setPlacesApiError(false);

    const fetchPopularPlacesREST = async ({ lat, lng, radius }) => {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const proxyUrl = `${backendUrl}/api/places/nearby`;
      const maxResultsToFetch = 20; 
      console.log(`[Dashboard] Fetching up to ${maxResultsToFetch} popular place candidates. Radius: ${radius}m`);
      const body = {
        includedTypes: [
          "tourist_attraction", "museum", "art_gallery", "amusement_park", "zoo", "aquarium",
          "movie_theater", "performing_arts_theater", "restaurant", "cafe", "bakery", "bar",
          "park", "campground", "hiking_area", "shopping_mall", "store", "department_store",
          "book_store", "historical_landmark"
        ],
        maxResultCount: maxResultsToFetch,
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radius }
        }
      };
      try {
        console.log("[Dashboard] Fetching popular places with body:", JSON.stringify(body));
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Dashboard] Backend Places API error response:', errorData.error || errorData.details || errorData);
          throw new Error("Backend Places API error: " + (errorData.error || JSON.stringify(errorData.details)));
        }
        const data = await response.json();
        console.log("[Dashboard] Received places data from backend:", data.places ? data.places.length : 0, "places");
        return data.places || [];
      } catch (error) {
        console.error("[Dashboard] Error in fetchPopularPlacesREST:", error);
        throw error;
      }
    };

    const getRegionCenterAndRadius = (region) => {
      if (!region) return null;
      if (region.type === 'circle') {
        return { lat: region.center.lat, lng: region.center.lng, radius: region.radius };
      } else if (region.type === 'polygon' && window.google && window.google.maps && window.google.maps.geometry) {
        const bounds = new window.google.maps.LatLngBounds();
        region.path.forEach(point => bounds.extend(new window.google.maps.LatLng(point.lat, point.lng)));
        const center = bounds.getCenter();
        const ne = bounds.getNorthEast();
        const radius = window.google.maps.geometry.spherical.computeDistanceBetween(center, ne);
        return { lat: center.lat(), lng: center.lng(), radius: radius };
      }
      console.warn("[Dashboard] Could not calculate center/radius for region:", region);
      return null;
    };

    let isMounted = true;
    
    const fetchAndProcessPopularPlaces = async () => {
      try {
        const regionInfo = getRegionCenterAndRadius(confirmedRegion);
        if (!regionInfo) {
          console.error("[Dashboard] Invalid region info, cannot fetch popular places.");
          if (isMounted) {
            setPopularPlaces([]);
            setLoadingPlaces(false);
            setPlacesApiError(true);
          }
          return;
        }
        
        console.log("[Dashboard] Fetching popular places for regionInfo:", JSON.stringify(regionInfo));
        let candidatePlaces = await fetchPopularPlacesREST(regionInfo);
        console.log(`[Dashboard] Fetched ${candidatePlaces.length} candidate places initially.`);

        // Refined Filtering Logic
        const minRating = 3.5; // Minimum average rating
        const minReviewCount = 25; // Default minimum review count (can be adjusted after research)

        console.log(`[Dashboard] Applying filters: minRating=${minRating}, minReviewCount=${minReviewCount}`);

        const qualityFilteredPlaces = candidatePlaces.filter(place => {
          const rating = place.rating || 0;
          const reviewCount = place.userRatingCount || place.user_ratings_total || 0;
          const passesFilters = rating >= minRating && reviewCount >= minReviewCount;
          // if (!passesFilters) {
          //   console.log(`[Dashboard] Place filtered out: ${place.displayName?.text || place.name}, Rating: ${rating}, Reviews: ${reviewCount}`);
          // }
          return passesFilters;
        });
        console.log(`[Dashboard] ${qualityFilteredPlaces.length} places remaining after filtering by min rating & min reviews.`);

        // Sort by userRatingCount (number of reviews) in descending order.
        qualityFilteredPlaces.sort((a, b) => 
          (b.userRatingCount || b.user_ratings_total || 0) - (a.userRatingCount || a.user_ratings_total || 0)
        );
        console.log("[Dashboard] Sorted quality-filtered places by review count.");
        
        // Select the top 15 from the filtered and sorted list.
        const topPlaces = qualityFilteredPlaces.slice(0, 15);
        console.log(`[Dashboard] Selected top ${topPlaces.length} places after all filtering and sorting.`);
        
        if (isMounted) {
          setPopularPlaces(topPlaces);
          setLoadingPlaces(false);
          if (topPlaces.length === 0 && candidatePlaces.length > 0) {
            console.warn("[Dashboard] No places selected after all filtering, though candidates were initially present. This might be due to strict filters.");
          }
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching or processing popular places:", error);
        if (isMounted) {
          setPopularPlaces([]);
          setPlacesApiError(true);
          setLoadingPlaces(false);
        }
      }
    };

    fetchAndProcessPopularPlaces();
    
    return () => {
      isMounted = false;
      console.log("[Dashboard] useEffect for popular places cleanup. ConfirmedRegion:", JSON.stringify(confirmedRegion));
    };
  }, [confirmedRegion, mapScriptLoaded]);

  // Handle clear region
  const handleClearRegion = () => {
    setSelectedRegion(null);
    setConfirmedRegion(null);
    setDrawingMode(null);
    setPopularPlaces([]);
    setPlacesApiError(false);
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

  // Add this new effect for handling key presses (only Escape now)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Handle Escape key to exit drawing mode
      if (e.key === 'Escape') {
        if (drawingMode !== null) {
          console.log("Escape pressed - exiting drawing mode");
          setDrawingMode(null);
          handleClearRegion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress); // Add keydown for Escape key
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [drawingMode]);

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
    
    // Handle click on a place
    const handlePlaceClick = () => {
      // Check if the place has location data
      if (place.location) {
        const { latitude, longitude } = place.location;
        if (mapRef.current) {
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(15);
        }
      }
    };
    
    return (
      <li 
        key={place.id || name} 
        className="popular-place-item"
        onClick={handlePlaceClick}
        style={{ cursor: place.location ? 'pointer' : 'default' }}
        title={place.location ? `Center map on ${name}` : undefined}
      >
        <div className="popular-place-name">
          {name}
          {place.location && (
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '0.85rem', 
              opacity: 0.6,
              paddingLeft: '5px'
            }}>
              →
            </span>
          )}
        </div>
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
    console.log("[Dashboard] Fetching autocomplete for:", input);
    if (!input || !input.trim()) {
      console.log("[Dashboard] Input is empty, clearing suggestions.");
      setAutocompleteSuggestions([]);
      return;
    }
    
    setAutocompleteLoading(true);
    setAutocompleteError(null);
    
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const proxyUrl = `${backendUrl}/api/places/autocomplete`;
    console.log("[Dashboard] Autocomplete Proxy URL:", proxyUrl);

    const body = {
      input,
      languageCode: 'en'
    };
    
    try {
      console.log("[Dashboard] Sending autocomplete request with body:", body);
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body)
      });
      
      console.log("[Dashboard] Autocomplete response status:", response.status);
      const responseDataText = await response.text(); // Read as text first to avoid JSON parse error on empty/invalid response
      console.log("[Dashboard] Autocomplete response data text:", responseDataText);

      if (!response.ok) {
        let errorData = { error: `Request failed with status ${response.status}` };
        try {
          errorData = JSON.parse(responseDataText); // Try to parse as JSON if possible
        } catch (e) {
          console.warn("[Dashboard] Could not parse error response as JSON.");
        }
        console.error("[Dashboard] Autocomplete API error response:", errorData);
        setAutocompleteError(errorData.error || JSON.stringify(errorData.details) || responseDataText);
        setAutocompleteSuggestions([]);
        setAutocompleteLoading(false);
        return;
      }
      
      const data = JSON.parse(responseDataText); // Now parse the success response
      console.log("[Dashboard] Autocomplete success data:", data);
      setAutocompleteSuggestions(data.predictions || data.suggestions || []);
      setAutocompleteLoading(false);
    } catch (error) {
      console.error("[Dashboard] Catch block error during autocomplete fetch:", error);
      setAutocompleteError(error.message || 'Failed to fetch suggestions.');
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
                const pred = suggestion; // Changed from suggestion.placePrediction
                if (!pred) return null;
                // Ensure structuredFormat exists, and its mainText and secondaryText also exist before trying to access them
                const mainText = pred.structured_formatting?.main_text?.text || pred.description;
                const secondaryText = pred.structured_formatting?.secondary_text?.text || '';
                const placeId = pred.place_id;

                if (!placeId) {
                  console.warn("[Dashboard] Suggestion missing place_id:", pred);
                  return null; // Skip rendering if no place_id
                }

                return (
                  <li
                    key={placeId} // Use place_id directly from pred
                    onClick={async () => {
                      const suggestionText = mainText;
                      console.log("[Dashboard] Suggestion clicked:", suggestionText, "Place ID:", placeId);
                      
                      // Add to recent searches
                      addRecentSearch(suggestionText);
                      
                      // Clear search and suggestions immediately
                      setAutocompleteSuggestions([]);
                      setAutocompleteValue("");
                      setAutocompleteLoading(true);
                      
                      try {
                        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                        const proxyUrl = `${backendUrl}/api/places/details/${placeId}`;
                        console.log("[Dashboard] Fetching place details from URL:", proxyUrl);
                        
                        const response = await fetch(proxyUrl, {
                          method: "GET",
                          headers: {
                            "Content-Type": "application/json",
                          }
                        });
                        console.log("[Dashboard] Place details response status:", response.status);
                        if (response.ok) {
                          const data = await response.json();
                          console.log("[Dashboard] Place details data:", data);
                          if (data.result && data.result.geometry && data.result.geometry.location && mapRef.current) {
                            const { lat, lng } = data.result.geometry.location;
                            mapRef.current.panTo({ lat: lat, lng: lng });
                            mapRef.current.setZoom(15);
                          } else if (data.result && data.result.location && mapRef.current) {
                            const { latitude, longitude } = data.result.location;
                             mapRef.current.panTo({ lat: latitude, lng: longitude });
                            mapRef.current.setZoom(15);
                          }
                        } else {
                          const errorText = await response.text();
                          console.error("[Dashboard] Place details API error:", response.status, errorText);
                          setAutocompleteError(`Could not get place details (status: ${response.status}).`);
                        }
                      } catch (err) {
                        console.error("[Dashboard] Catch block error fetching place details:", err);
                        setAutocompleteError("Could not pan to place location via backend.");
                      } finally {
                        setAutocompleteLoading(false);
                      }
                    }}
                  >
                    <div>
                      <strong>{mainText}</strong>
                      {secondaryText && (
                        <div style={{ fontSize: '0.9em', color: '#b0ffb0' }}>
                          {secondaryText}
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
          <h4>Popular Places {popularPlaces.length > 0 ? `(${popularPlaces.length})` : ''}</h4>
          {loadingPlaces ? (
            <div className="popular-destinations-message">
              Finding popular destinations...
            </div>
          ) : placesApiError ? (
            <div className="popular-destinations-error" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <div className="popular-destinations-message" style={{ height: '100%' }}>
              {confirmedRegion ? "No popular places found in this area." : "Select a region on the map to see popular places."}
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
          />
        </ErrorBoundary>
        
        {selectedRegion && !showExplorePopup && (
          <div className="map-action-buttons-container">
            <button 
              className="explore-button map-primary-action-button" 
              onClick={handleExplore}
            >
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
        />
      )}
    </div>
  );
};

export default Dashboard; 