import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import ItineraryDisplay from './ItineraryDisplay';
import ErrorBoundary from './ErrorBoundary';
import '../styles/SavedTrips.css';

const SavedTrips = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [selectedItinerary, setSelectedItinerary] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groupedItineraries, setGroupedItineraries] = useState({});
  const [expandedDates, setExpandedDates] = useState({});
  const navigate = useNavigate();
  const db = getFirestore();

  useEffect(() => {
    // Set initial user from auth immediately
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log("No current user available on initial check");
      setLoading(false);
      // Redirect to login if no user
      navigate('/');
      return;
    }
    
    // Set user and fetch saved itineraries
    setUser(currentUser);
    fetchSavedItineraries(currentUser.uid);
  }, [navigate]);

  // Fetch saved itineraries from Firestore
  const fetchSavedItineraries = async (userId) => {
    try {
      setLoading(true);
      const userDocRef = doc(db, "users", userId);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.saved_itineraries && Array.isArray(userData.saved_itineraries)) {
          // Sort itineraries by date (newest first)
          const sortedItineraries = [...userData.saved_itineraries].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          setSavedItineraries(sortedItineraries);
          
          // Group itineraries by date
          const grouped = groupItinerariesByDate(sortedItineraries);
          setGroupedItineraries(grouped);
          
          // Set all date groups to collapsed by default, except for "Today"
          const initialExpandedState = {};
          const today = new Date().toLocaleDateString();
          
          Object.keys(grouped).forEach(date => {
            // Check if this date is today
            if (date === today) {
              initialExpandedState[date] = true; // Expanded
            } else {
              initialExpandedState[date] = false; // Collapsed
            }
          });
          setExpandedDates(initialExpandedState);
        } else {
          setSavedItineraries([]);
          setGroupedItineraries({});
        }
      } else {
        setSavedItineraries([]);
        setGroupedItineraries({});
      }
    } catch (error) {
      console.error("Error fetching saved itineraries:", error);
      setLoadingError("Failed to load your saved trips. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Group itineraries by date
  const groupItinerariesByDate = (itineraries) => {
    const grouped = {};
    
    itineraries.forEach(itinerary => {
      const date = new Date(itinerary.createdAt).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(itinerary);
    });
    
    return grouped;
  };

  // Toggle the expanded state of a date group
  const toggleDateExpanded = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // View a specific itinerary
  const handleViewItinerary = (itinerary) => {
    // Convert the saved itinerary format to the format expected by ItineraryDisplay
    // and add fromSavedTrips flag to indicate this is from saved trips
    const displayItinerary = {
      raw: itinerary.raw,
      items: itinerary.items.map(item => ({
        time: item.time,
        location: item.location,
        description: item.description
      })),
      fromSavedTrips: true // Flag to indicate this is from saved trips
    };
    
    setSelectedItinerary(displayItinerary);
  };

  // Close itinerary view
  const handleCloseItinerary = () => {
    setSelectedItinerary(null);
  };

  // Delete itinerary confirmation
  const confirmDeleteItinerary = (itineraryId) => {
    setDeleteConfirmId(itineraryId);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Delete itinerary
  const deleteItinerary = async (itineraryId) => {
    if (!user || !itineraryId) return;
    
    try {
      setIsDeleting(true);
      
      // Get the current user document
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (!docSnap.exists()) {
        throw new Error("User document not found");
      }
      
      // Filter out the itinerary to delete
      const userData = docSnap.data();
      const updatedItineraries = userData.saved_itineraries.filter(
        itinerary => itinerary.id !== itineraryId
      );
      
      // Update the user document
      await updateDoc(userDocRef, {
        saved_itineraries: updatedItineraries
      });
      
      // Update local state
      setSavedItineraries(prevItineraries => 
        prevItineraries.filter(itinerary => itinerary.id !== itineraryId)
      );
      
      // Update grouped itineraries
      const newGrouped = groupItinerariesByDate(
        savedItineraries.filter(itinerary => itinerary.id !== itineraryId)
      );
      setGroupedItineraries(newGrouped);
      
      // Clear delete confirmation
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      alert("Failed to delete itinerary. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format date for header display (without time)
  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    // Check if the date is today or yesterday
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      // Otherwise, format the date
      const options = { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      };
      return date.toLocaleDateString(undefined, options);
    }
  };

  // Get the first location from an itinerary to use as a title
  const getItineraryTitle = (itinerary) => {
    if (itinerary.items && itinerary.items.length > 0) {
      const firstItem = itinerary.items[0];
      // Return the location of the first item or a default title
      return firstItem.location || "Adventure Itinerary";
    }
    return "Adventure Itinerary";
  };

  // Get a summary of the itinerary (e.g., "5 activities in Seattle")
  const getItinerarySummary = (itinerary) => {
    if (itinerary.items && itinerary.items.length > 0) {
      const itemCount = itinerary.items.length;
      const locationSet = new Set();
      
      // Extract unique location names
      itinerary.items.forEach(item => {
        const location = item.location;
        if (location) {
          // Try to extract the main location name (e.g., "Museum - Seattle" -> "Seattle")
          const parts = location.split(' - ');
          if (parts.length > 1) {
            locationSet.add(parts[parts.length - 1].trim());
          } else {
            locationSet.add(location.trim());
          }
        }
      });
      
      const locations = Array.from(locationSet);
      
      if (locations.length > 0) {
        return `${itemCount} ${itemCount === 1 ? 'activity' : 'activities'} in ${locations[0]}`;
      } else {
        return `${itemCount} ${itemCount === 1 ? 'activity' : 'activities'}`;
      }
    }
    return "No activities";
  };

  // Get time from date for display
  const getTimeFromDate = (dateString) => {
    const options = {
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  // Add a handleViewDashboard function
  const handleViewDashboard = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="saved-trips-container">
        <div className="loading">Loading your saved trips...</div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="saved-trips-container">
        <div className="saved-trips-error">
          <h2>Error</h2>
          <p>{loadingError}</p>
          <button 
            className="retry-button"
            onClick={() => fetchSavedItineraries(user.uid)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-trips-container">
      <div className="saved-trips-header">
        <button className="back-button" onClick={handleViewDashboard}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Dashboard
        </button>
        <h1>Saved Trips</h1>
        <p className="saved-trips-description">
          View and manage your saved adventure itineraries
        </p>
      </div>

      <div className="saved-trips-content">
        {Object.keys(groupedItineraries).length === 0 ? (
          <div className="no-saved-trips">
            <h2>No saved trips yet</h2>
            <p>When you save an itinerary, it will appear here.</p>
            <button 
              className="create-trip-button"
              onClick={() => navigate('/')}
            >
              Create an Itinerary
            </button>
          </div>
        ) : (
          <div className="saved-trips-list-by-date">
            {Object.entries(groupedItineraries).map(([date, itineraries]) => (
              <div key={date} className="date-group">
                <div 
                  className="date-header" 
                  onClick={() => toggleDateExpanded(date)}
                >
                  <h3>{formatDateHeader(new Date(itineraries[0].createdAt))}</h3>
                  <span className={`expand-arrow ${expandedDates[date] ? 'expanded' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                    </svg>
                  </span>
                </div>
                
                {expandedDates[date] && (
                  <div className="date-itineraries">
                    {itineraries.map((itinerary) => (
                      <div key={itinerary.id} className="itinerary-card">
                        <div className="itinerary-card-content">
                          <h3 className="itinerary-title">{getItineraryTitle(itinerary)}</h3>
                          <p className="itinerary-summary">{getItinerarySummary(itinerary)}</p>
                          <p className="itinerary-date">Saved at {getTimeFromDate(itinerary.createdAt)}</p>
                        </div>
                        <div className="itinerary-card-actions">
                          {deleteConfirmId === itinerary.id ? (
                            <div className="delete-confirmation">
                              <span>Delete this itinerary?</span>
                              <button 
                                className="confirm-delete-button"
                                onClick={() => deleteItinerary(itinerary.id)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? 'Deleting...' : 'Yes'}
                              </button>
                              <button 
                                className="cancel-delete-button"
                                onClick={cancelDelete}
                                disabled={isDeleting}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                className="delete-itinerary-button"
                                onClick={() => confirmDeleteItinerary(itinerary.id)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                                  <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                                Delete
                              </button>
                              <button 
                                className="view-itinerary-button"
                                onClick={() => handleViewItinerary(itinerary)}
                              >
                                View Details
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Display the selected itinerary */}
      {selectedItinerary && (
        <ErrorBoundary>
          <ItineraryDisplay 
            itinerary={selectedItinerary}
            onClose={handleCloseItinerary}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default SavedTrips; 