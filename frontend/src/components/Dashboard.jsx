import { useState, useEffect, useRef } from 'react';
import { auth, signOutUser, deleteUserAccount } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import MapComponent from './GoogleMap';
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
  const navigate = useNavigate();
  const db = getFirestore();
  const mainContentRef = useRef(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.user-info')) {
        setShowProfileDropdown(false);
      }
      
      if (showSideNav && !event.target.closest('.navbar-menu') && !event.target.closest('.hamburger-menu')) {
        setShowSideNav(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showProfileDropdown, showSideNav]);

  // Handler for when a region is selected
  const handleRegionSelect = (regionData) => {
    console.log("Region selected:", regionData);
    setSelectedRegion(regionData);
  };
  
  // Handler for explore button click
  const handleExplore = () => {
    if (!selectedRegion) return;
    
    // TODO: Implement exploration logic
    console.log("Exploring region:", selectedRegion);
    
    // This is where you'd navigate to a new page or fetch data for the selected region
    alert(`Exploring region centered at ${selectedRegion.center.lat.toFixed(4)}, ${selectedRegion.center.lng.toFixed(4)} with radius ${(selectedRegion.radius/1000).toFixed(2)} km`);
    
    // Reset the selection
    setSelectedRegion(null);
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
          <p>Discover nearby natural destinations to connect with nature and find your next adventure.</p>
          <div className="sidebar-spacer" style={{ flex: 1 }} />
          <p className="map-instructions">Click anywhere on the map to select a region, then drag the resize marker to adjust.</p>
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
    </div>
  );
};

export default Dashboard; 