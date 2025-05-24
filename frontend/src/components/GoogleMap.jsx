import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 37.7749, // Default to San Francisco
  lng: -122.4194
};

const defaultOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#f2fff5' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#2e7d32' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#ffffff' }, { lightness: 13 }]
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.fill',
      stylers: [{ color: '#f0f8f0' }]
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#82c991' }, { lightness: 14 }, { weight: 1.4 }]
    },
    {
      featureType: 'landscape',
      elementType: 'all',
      stylers: [{ color: '#e8f5e9' }]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#c8e6c9' }, { lightness: 5 }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.fill',
      stylers: [{ color: '#a5d6a7' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#81c784' }, { lightness: 25 }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry.fill',
      stylers: [{ color: '#b9f6ca' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#a5d6a7' }, { lightness: 16 }]
    },
    {
      featureType: 'road.local',
      elementType: 'geometry',
      stylers: [{ color: '#dcedc8' }]
    },
    {
      featureType: 'transit',
      elementType: 'all',
      stylers: [{ color: '#c8e6c9' }]
    },
    {
      featureType: 'water',
      elementType: 'all',
      stylers: [{ color: '#b3e5fc' }]
    }
  ]
};

const MapComponent = () => {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markerRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  // Get user's location on component mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Check if geolocation permission has been granted
  const checkLocationPermission = () => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' })
        .then(permissionStatus => {
          setLocationPermission(permissionStatus.state);
          
          if (permissionStatus.state === 'granted') {
            getUserLocation();
          }
          
          permissionStatus.onchange = () => {
            setLocationPermission(permissionStatus.state);
            
            if (permissionStatus.state === 'granted') {
              getUserLocation();
            }
          };
        })
        .catch(error => {
          console.error("Error checking geolocation permission:", error);
        });
    } else {
      // Fallback for browsers that don't support the Permissions API
      getUserLocation();
    }
  };

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          setCenter(userPos);
          
          // If map is already loaded, pan to user location
          if (map) {
            map.panTo(userPos);
          }
        },
        error => {
          console.error("Error getting user location:", error);
          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermission('denied');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  };

  const onMapLoad = useCallback(map => {
    setMap(map);
    setIsMapLoaded(true);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    setIsMapLoaded(false);
  }, []);

  const centerMapOnUser = () => {
    if (userLocation && map) {
      map.panTo(userLocation);
      map.setZoom(15);
    } else {
      getUserLocation();
    }
  };

  const handleRequestLocation = () => {
    getUserLocation();
  };

  const handleDenyLocation = () => {
    setLocationPermission('denied');
  };

  const renderLocationRequest = () => {
    if (locationPermission === 'prompt') {
      return (
        <div className="location-request">
          <h3>Allow Location Access</h3>
          <p>TouchGrass needs your location to show you nearby natural attractions and help you plan your adventures.</p>
          <div className="location-request-buttons">
            <button className="location-deny" onClick={handleDenyLocation}>Not Now</button>
            <button className="location-allow" onClick={handleRequestLocation}>Allow</button>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom marker icon
  const userMarkerIcon = {
    path: "M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,13.5c-2.49,0 -4.5,-2.01 -4.5,-4.5S9.51,4.5 12,4.5s4.5,2.01 4.5,4.5 -2.01,4.5 -4.5,4.5z",
    fillColor: "#9dffb0",
    fillOpacity: 1,
    strokeWeight: 0,
    rotation: 0,
    scale: 1.5,
    anchor: { x: 12, y: 22 },
  };

  // Render map controls
  const renderMapControls = () => {
    return (
      <div className="map-controls">
        <button 
          className="map-control-button" 
          onClick={centerMapOnUser}
          title="Center on my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </button>
        <button 
          className="map-control-button" 
          onClick={() => map?.setZoom((map?.getZoom() || 10) + 1)}
          title="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
        <button 
          className="map-control-button" 
          onClick={() => map?.setZoom((map?.getZoom() || 10) - 1)}
          title="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>
      </div>
    );
  };

  if (!isLoaded) {
    return <div className="loading">Loading map...</div>;
  }

  return (
    <div className="dashboard-map-container">
      <GoogleMap
        mapContainerClassName="google-map"
        center={center}
        zoom={13}
        options={defaultOptions}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={userMarkerIcon}
            animation={window.google?.maps.Animation.DROP}
            ref={markerRef}
          />
        )}
      </GoogleMap>
      
      {isMapLoaded && renderMapControls()}
      {renderLocationRequest()}
    </div>
  );
};

export default MapComponent; 