import { useState, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, signInWithGoogle, hasUserCompletedOnboarding, signInWithEmail } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import EmailSignUp from './components/EmailSignUp';
import EmailSignIn from './components/EmailSignIn';
import Dashboard from './components/Dashboard';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import './App.css'

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const polygonsContainerRef = useRef(null);
  const markersContainerRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();
  
  // Monitor authentication state
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Add a timeout to prevent infinite loading state
    const authTimeoutId = setTimeout(() => {
      if (authLoading) {
        console.log("Auth loading timeout reached");
        setAuthLoading(false);
      }
    }, 3000); // 3 second timeout
    
    // Check if there's a cached user session on page load
    const checkUserSession = async () => {
      setAuthLoading(true);
      
      try {
        // This will trigger the onAuthStateChanged callback if a session exists
        const cachedUser = auth.currentUser;
        console.log("Initial auth check:", cachedUser ? "User found in cache" : "No cached user");
      } catch (error) {
        console.error("Error checking cached session:", error);
        setAuthLoading(false);
      }
    };
    
    checkUserSession();
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser ? "User logged in" : "User logged out");
      setUser(currentUser);
      
      if (currentUser) {
        // User is signed in, close the modal
        setShowModal(false);
        
        // Check if user needs to complete onboarding
        try {
          const hasCompleted = await hasUserCompletedOnboarding(currentUser.uid);
          if (!hasCompleted) {
            // New user - show onboarding questionnaire before dashboard
            console.log("New user detected, showing onboarding");
            setShowOnboarding(true);
          } else {
            // Existing user - go straight to dashboard
            console.log("Returning user, going to dashboard");
            navigate('/dashboard');
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          // On error, go to dashboard anyway
          navigate('/dashboard');
        }
        
        // Log user information for monitoring
        console.log('User signed in:', {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          emailVerified: currentUser.emailVerified,
          provider: currentUser.providerData[0]?.providerId
        });
      } else {
        console.log('User signed out or no user in cache');
        setShowOnboarding(false);
        // Only navigate to landing page if we're not already there
        if (window.location.pathname !== '/') {
          navigate('/');
        }
      }
      
      setAuthLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setAuthLoading(false);
      setAuthError("Authentication error. Please try again later.");
    });
    
    return () => {
      clearTimeout(authTimeoutId);
      unsubscribe();
    };
  }, [navigate]);
  
  useEffect(() => {
    const handleMouseMove = (event) => {
      // Use requestAnimationFrame to throttle updates and improve performance
      requestAnimationFrame(() => {
        setMousePosition({
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight
        });
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  useEffect(() => {
    // Close modal when clicking outside
    const handleOutsideClick = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
        setShowEmailForm(false);
        setShowSignIn(false);
        setAuthError('');
      }
    };
    
    if (showModal) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showModal]);

  // Initialize map elements when component mounts or when user logs out
  useEffect(() => {
    // Only initialize map elements on the landing page (when user is not logged in)
    if (!user && !authLoading) {
      // Map elements are now created in the LandingPage component
      console.log("User signed out, ready to show landing page");
    }
  }, [user, authLoading]);
  
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const result = await signInWithGoogle();
      
      if (!result.success) {
        setAuthError(result.error.message || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };
  
  const handleEmailSignUpClick = () => {
    setShowEmailForm(true);
    setShowSignIn(false);
    setAuthError('');
  };

  const handleSignInClick = () => {
    setShowEmailForm(false);
    setShowSignIn(true);
    setAuthError('');
  };
  
  const handleEmailSignUpSuccess = (newUser) => {
    setUser(newUser);
    setShowEmailForm(false);
    setShowModal(false);
  };

  const handleSignInSuccess = () => {
    setShowSignIn(false);
    setShowModal(false);
  };
  
  const handleEmailFormClose = () => {
    setShowEmailForm(false);
    setAuthError('');
  };

  const handleSignInClose = () => {
    setShowSignIn(false);
    setAuthError('');
  };
  
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    navigate('/dashboard');
  };
  
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading TouchGrass</p>
      </div>
    );
  }
  
  // If we need to show onboarding, show it before dashboard
  if (showOnboarding && user) {
    return (
      <div className="app-container">
        <OnboardingQuestionnaire onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={
        user ? <Dashboard /> : <Navigate to="/" />
      } />
      <Route path="/" element={<LandingPage 
        mousePosition={mousePosition}
        showModal={showModal}
        setShowModal={setShowModal}
        showEmailForm={showEmailForm}
        setShowEmailForm={setShowEmailForm}
        showSignIn={showSignIn}
        setShowSignIn={setShowSignIn}
        authError={authError}
        authLoading={authLoading}
        handleGoogleSignIn={handleGoogleSignIn}
        handleEmailSignUpClick={handleEmailSignUpClick}
        handleSignInClick={handleSignInClick}
        handleEmailSignUpSuccess={handleEmailSignUpSuccess}
        handleSignInSuccess={handleSignInSuccess}
        handleEmailFormClose={handleEmailFormClose}
        handleSignInClose={handleSignInClose}
        polygonsContainerRef={polygonsContainerRef}
        markersContainerRef={markersContainerRef}
        modalRef={modalRef}
      />} />
    </Routes>
  );
}

// Landing page component extracted from the main App component
function LandingPage({
  mousePosition,
  showModal,
  setShowModal,
  showEmailForm,
  setShowEmailForm,
  showSignIn,
  setShowSignIn,
  authError,
  authLoading,
  handleGoogleSignIn,
  handleEmailSignUpClick,
  handleSignInClick,
  handleEmailSignUpSuccess,
  handleSignInSuccess,
  handleEmailFormClose,
  handleSignInClose,
  polygonsContainerRef,
  markersContainerRef,
  modalRef
}) {
  // Initialize map elements when component mounts
  useEffect(() => {
    // Create map polygons
    const createPolygons = () => {
      const polygonsContainer = polygonsContainerRef.current;
      if (!polygonsContainer) return;
      
      // Clear existing polygons
      polygonsContainer.innerHTML = '';
      
      // Create more polygons for a continuous effect
      const numberOfPolygons = 24;
      
      for (let i = 0; i < numberOfPolygons; i++) {
        const polygon = document.createElement('div');
        polygon.classList.add('polygon');
        
        // Random position
        const xPos = Math.random() * 80 + 10; // 10-90% of viewport width
        const yPos = Math.random() * 80 + 10; // 10-90% of viewport height
        
        // Random size between 80px and 250px
        const width = Math.random() * 170 + 80;
        const height = Math.random() * 170 + 80;
        
        // Random shape (using clip-path for polygon)
        const points = [];
        const corners = Math.floor(Math.random() * 3) + 3; // 3-5 corners
        
        for (let j = 0; j < corners; j++) {
          const angle = (j / corners) * Math.PI * 2;
          const radius = 50 + Math.random() * 20; // Random distance from center
          const x = 50 + Math.cos(angle) * radius;
          const y = 50 + Math.sin(angle) * radius;
          points.push(`${x}% ${y}%`);
        }
        
        polygon.style.clipPath = `polygon(${points.join(', ')})`;
        
        // Very long animation duration, spread out across polygons
        // This creates a continuous cycle where some polygons are always visible
        const duration = Math.random() * 20 + 60; // 60-80 seconds
        const opacity = Math.random() * 0.4 + 0.2; // Higher opacity for better visibility
        
        // Set CSS variables
        polygon.style.setProperty('--duration', `${duration}s`);
        polygon.style.setProperty('--opacity', opacity);
        
        // Set the opacity directly as well to ensure it's applied immediately
        polygon.style.opacity = opacity;
        
        // Set position and size
        polygon.style.left = `${xPos}%`;
        polygon.style.top = `${yPos}%`;
        polygon.style.width = `${width}px`;
        polygon.style.height = `${height}px`;
        
        // Stagger animation delays to create continuous flow
        // By spreading the delays evenly, some polygons are always in the visible part of the animation
        polygon.style.animationDelay = `${(i / numberOfPolygons) * duration}s`;
        
        polygonsContainer.appendChild(polygon);
      }
    };
    
    // Create map markers
    const createMarkers = () => {
      const markersContainer = markersContainerRef.current;
      if (!markersContainer) return;
      
      // Clear existing markers
      markersContainer.innerHTML = '';
      
      // Create more markers for a continuous effect
      const numberOfMarkers = 30;
      
      for (let i = 0; i < numberOfMarkers; i++) {
        const marker = document.createElement('div');
        marker.classList.add('marker');
        
        // Random position
        const xPos = Math.random() * 90 + 5; // 5-95% of viewport width
        const yPos = Math.random() * 90 + 5; // 5-95% of viewport height
        
        // Set position
        marker.style.left = `${xPos}%`;
        marker.style.top = `${yPos}%`;
        
        // Stagger animation delays for continuous effect
        // Set each marker to start its animation at a different time
        const pulseLength = 6; // seconds for pulse animation
        marker.style.animationDelay = `${(i / numberOfMarkers) * pulseLength}s`;
        
        markersContainer.appendChild(marker);
      }
    };
    
    createPolygons();
    createMarkers();
    
    // Clean up function not needed as we're clearing on each creation
  }, []);
  
  // We don't need to track mouse movement here as it's already done in the parent App component

  return (
    <div className="app-container">
      <div 
        className="background-gradient" 
        style={{
          background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(157, 255, 176, 0.1), rgba(0, 28, 15, 0.2))`,
        }}
      />
      
      <div className="map-background">
        <div className="map-grid"></div>
        <div className="map-polygons" ref={polygonsContainerRef}></div>
        <div className="map-markers" ref={markersContainerRef}></div>
      </div>
      
      <div className="glass-overlay"></div>
      
      <main className="content">
        <div className="logo-container">
          <h1 className="logo">Touch<span className="capital">G</span>rass</h1>
          <p className="tagline">Explore the world your way</p>
        </div>
        
        <button className="cta-button" onClick={() => setShowModal(true)}>
          Join the Revolution
        </button>
      </main>
      
      {showModal && (
        <div className="modal-overlay">
          <div className="signup-modal" ref={modalRef}>
            <div className="modal-header">
              <h2>{showEmailForm ? 'Create Account' : showSignIn ? 'Sign In' : 'Join TouchGrass'}</h2>
              <button 
                className="close-button" 
                onClick={() => {
                  setShowModal(false);
                  setShowEmailForm(false);
                  setShowSignIn(false);
                  setAuthError('');
                }}
              >
                ×
              </button>
            </div>
            
            {authError && (
              <div className="auth-error">
                {authError}
              </div>
            )}
            
            {showEmailForm ? (
              <EmailSignUp 
                onClose={handleEmailFormClose} 
                onSuccess={handleEmailSignUpSuccess} 
              />
            ) : showSignIn ? (
              <EmailSignIn
                onClose={handleSignInClose}
                onSuccess={handleSignInSuccess}
                onGoogleSignIn={handleGoogleSignIn}
              />
            ) : (
              <div className="modal-body">
                <button 
                  className="signup-button google-button"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  <span className="signup-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512" width="14" height="14">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                    </svg>
                  </span>
                  Continue with Google
                </button>
                <div className="divider">
                  <span>or</span>
                </div>
                <button 
                  className="signup-button email-button"
                  onClick={handleEmailSignUpClick}
                  disabled={authLoading}
                >
                  <span className="signup-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14">
                      <path fill="currentColor" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
                    </svg>
                  </span>
                  Sign up with Email
                </button>
              </div>
            )}
            
            {!showEmailForm && !showSignIn && (
              <div className="modal-footer">
                <p>Already have an account? <a href="#" onClick={(e) => {
                  e.preventDefault();
                  handleSignInClick();
                }}>Sign in</a></p>
              </div>
            )}
            
            {showSignIn && (
              <div className="modal-footer">
                <p>Need an account? <a href="#" onClick={(e) => {
                  e.preventDefault();
                  handleEmailSignUpClick();
                }}>Sign up</a></p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
  );
}

export default App
