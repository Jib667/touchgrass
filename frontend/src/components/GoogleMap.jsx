import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { GoogleMap, useJsApiLoader, Circle, Polygon, Marker } from '@react-google-maps/api';

// Define libraries as a constant outside the component to prevent reloading issues
const libraries = ['places', 'geometry', 'drawing', 'marker'];

// Default to Burke, Virginia
const defaultCenter = {
  lat: 38.7934, // Burke, VA
  lng: -77.2717
};

// Map styles
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

const MapComponent = forwardRef(({ onRegionSelect, drawingMode: externalDrawingMode, onLoadStateChange }, ref) => {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapType, setMapType] = useState('hybrid'); // Start with satellite + labels
  
  // Region selection state
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [circleRadius, setCircleRadius] = useState(0);
  const [resizeMarker, setResizeMarker] = useState(null);
  const [showExploreButton, setShowExploreButton] = useState(false);
  
  // Polygon drawing state
  const [drawingMode, setDrawingMode] = useState(null); // null, 'circle', or 'polygon'
  const [polygonPath, setPolygonPath] = useState([]);
  const [drawingManager, setDrawingManager] = useState(null);
  
  // Instructions state
  const [showInstructions, setShowInstructions] = useState(false);
  
  const animationRef = useRef(null);
  const mapContainerRef = useRef(null);
  const instructionsTimeoutRef = useRef(null);
  
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
  
  // Resize handle marker icon
  const resizeHandleIcon = {
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
    fillColor: "#00e676",
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: "#ffffff",
    rotation: 0,
    scale: 1.2,
    anchor: { x: 12, y: 12 },
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps API Load Error:", loadError);
    }
    if (isLoaded) {
      console.log("Google Maps API Loaded Successfully.");
    }
    if (onLoadStateChange) {
      onLoadStateChange({ isLoaded, loadError });
    }
  }, [isLoaded, loadError, onLoadStateChange]);

  // Update refs when state changes
  useEffect(() => {
    // Get user location when component mounts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userPos);
          setCenter(userPos);
        },
        error => {
          console.log("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }, []);

  // Sync drawing mode with external prop
  useEffect(() => {
    if (externalDrawingMode !== drawingMode) {
      setDrawingMode(externalDrawingMode);
      
      // If switching to polygon mode, activate drawing manager
      if (externalDrawingMode === 'polygon' && drawingManager) {
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
      } 
      // If switching to circle mode or turning off drawing, deactivate drawing manager
      else if (drawingManager) {
        drawingManager.setDrawingMode(null);
      }
      
      // Only clear existing region when switching to a different drawing mode, not when turning off drawing
      if (externalDrawingMode !== null) {
        handleClearRegion();
      }
      
      // Show instructions when drawing mode changes
      if (externalDrawingMode) {
        setShowInstructions(true);
        
        // Clear any existing timeout
        if (instructionsTimeoutRef.current) {
          clearTimeout(instructionsTimeoutRef.current);
        }
        
        // Hide instructions after 5 seconds
        instructionsTimeoutRef.current = setTimeout(() => {
          setShowInstructions(false);
        }, 5000);
      } else {
        setShowInstructions(false);
      }
    }
  }, [externalDrawingMode, drawingManager]);

  // Map initialization
  const onMapLoad = useCallback(map => {
    setMap(map);
    setIsMapLoaded(true);
    
    // Set to hybrid view
    map.setMapTypeId('hybrid');
    
    // Add click listener for circle creation
    map.addListener('click', handleMapClick);
    
    // Initialize drawing manager for polygon drawing
    if (window.google && window.google.maps && window.google.maps.drawing) {
      const drawingMgr = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
          fillColor: '#0d2e13',
          fillOpacity: 0.45,
          strokeColor: '#00e676',
          strokeOpacity: 1,
          strokeWeight: 3,
          clickable: true,
          editable: true,
          zIndex: 1
        }
      });
      
      drawingMgr.setMap(map);
      setDrawingManager(drawingMgr);
      
      // Add listener for polygon complete
      window.google.maps.event.addListener(drawingMgr, 'polygoncomplete', handlePolygonComplete);
    }
  }, []);

  const onUnmount = useCallback(() => {
    if (map) {
      google.maps.event.clearListeners(map, 'click');
    }
    setMap(null);
    setIsMapLoaded(false);
  }, [map]);
  
  // Handle map click to create a circle
  const handleMapClick = (e) => {
    // Only create circle if in circle mode or no specific mode is set
    if (drawingMode === 'polygon') return;
    
    // If already have a region, don't create a new one
    if (selectedRegion) {
      // Clear existing region first
      handleClearRegion();
    }
    
    // Get the clicked position
    const clickLatLng = e.latLng;
    createCircleRegion(clickLatLng);
  };
  
  // Create a circle region
  const createCircleRegion = (clickPosition) => {
    // Create a circle at click position
    const center = { 
      lat: clickPosition.lat(), 
      lng: clickPosition.lng() 
    };
    
    setSelectedRegion({
      type: 'circle',
      center: center
    });
    
    // Calculate appropriate radius for current map view
    let targetRadius = 300; // Default radius in meters
    if (map) {
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        // Calculate the visible width and height of the map in meters
        const latDistance = Math.abs(ne.lat() - sw.lat());
        const lngDistance = Math.abs(ne.lng() - sw.lng());
        
        // Calculate distance in meters
        const latMeters = latDistance * 111000; // 1 degree lat ≈ 111km
        const lngMeters = lngDistance * 111000 * Math.cos(center.lat * Math.PI/180); 
        
        // Calculate diagonal of map in meters
        const diagonalMeters = Math.sqrt(Math.pow(latMeters, 2) + Math.pow(lngMeters, 2));
        
        // Set the target radius to be around 25% of the diagonal
        targetRadius = diagonalMeters * 0.25;
        
        // Ensure radius is reasonable
        const minRadius = 100; // 100 meters minimum radius
        const maxRadius = 2000; // 2km maximum radius
        targetRadius = Math.max(Math.min(targetRadius, maxRadius), minRadius);
      }
    }
    
    // Animate the circle growing
    let startTime = null;
    const animationDuration = 500; // ms
    
    const animateCircle = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Ease-out function for smooth animation
      const easeOut = (t) => 1 - Math.pow(1 - t, 2);
      const currentRadius = easeOut(progress) * targetRadius;
      
      setCircleRadius(currentRadius);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateCircle);
      } else {
        // Animation complete
        // Calculate position for resize handle (east point of circle)
        const resizeHandlePosition = {
          lat: center.lat,
          lng: center.lng + (currentRadius / (111000 * Math.cos(center.lat * Math.PI / 180)))
        };
        setResizeMarker(resizeHandlePosition);
        
        // Show the explore button
        setShowExploreButton(true);
        
        // Notify parent component
        if (onRegionSelect) {
          onRegionSelect({
            type: 'circle',
            center: center,
            radius: currentRadius
          });
        }
      }
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animateCircle);
  };

  // Handler for polygon complete event
  const handlePolygonComplete = (polygon) => {
    // Exit drawing mode
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
    setDrawingMode(null);
    
    // Get polygon path
    const path = polygon.getPath();
    const pathArray = [];
    
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      pathArray.push({
        lat: point.lat(),
        lng: point.lng()
      });
    }
    
    // Store the polygon path
    setPolygonPath(pathArray);
    
    // Set selected region
    setSelectedRegion({
      type: 'polygon',
      path: pathArray
    });
    
    // Show explore button
    setShowExploreButton(true);
    
    // Notify parent component
    if (onRegionSelect) {
      onRegionSelect({
        type: 'polygon',
        path: pathArray
      });
    }
    
    // Remove the polygon from the map as we'll render our own
    polygon.setMap(null);
  };

  // Handler for resize marker drag
  const handleResizeMarkerDrag = (e) => {
    if (!selectedRegion || selectedRegion.type !== 'circle') return;
    
    const newPosition = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setResizeMarker(newPosition);
    
    // Calculate new radius based on distance from center to marker
    const center = selectedRegion.center;
    const dx = (newPosition.lng - center.lng) * 111000 * Math.cos(center.lat * Math.PI / 180);
    const dy = (newPosition.lat - center.lat) * 111000;
    const newRadius = Math.sqrt(dx * dx + dy * dy);
    
    // Set minimum radius
    const minRadius = 50;
    const radius = Math.max(newRadius, minRadius);
    setCircleRadius(radius);
    
    // Update parent component
    if (onRegionSelect) {
      onRegionSelect({
        type: 'circle',
        center: center,
        radius: radius
      });
    }
  };

  // Clear the selected region
  const handleClearRegion = () => {
    setSelectedRegion(null);
    setCircleRadius(0);
    setResizeMarker(null);
    setShowExploreButton(false);
    setPolygonPath([]);
    
    // Notify parent component with null to indicate clearing
    if (onRegionSelect) {
      onRegionSelect(null);
    }
  };
  
  // Start drawing a polygon
  const startPolygonDrawing = () => {
    if (!drawingManager || !map) return;
    
    // Clear any existing regions
    handleClearRegion();
    
    // Set drawing mode
    setDrawingMode('polygon');
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  };
  
  // Start drawing a circle (by clicking)
  const startCircleDrawing = () => {
    if (!map) return;
    
    // Clear any existing regions
    handleClearRegion();
    
    // Set drawing mode
    setDrawingMode('circle');
    
    // If using drawing manager, disable it
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
  };

  // Center map on user's location
  const centerMapOnUser = () => {
    if (userLocation && map) {
      map.panTo(userLocation);
      map.setZoom(15);
    }
  };

  // Toggle map type
  const toggleMapType = () => {
    if (map) {
      const nextType = mapType === 'roadmap' ? 'hybrid' : 
                      mapType === 'hybrid' ? 'satellite' : 'roadmap';
      map.setMapTypeId(nextType);
      setMapType(nextType);
    }
  };

  // Get button class based on map type
  const getButtonClass = () => {
    return mapType === 'roadmap' ? 'map-control-button' : 'map-control-button light';
  };

  // Render map controls
  const renderMapControls = () => {
    return (
      <div className="map-controls">
        <button 
          className={getButtonClass()}
          onClick={centerMapOnUser}
          title="Center on my location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
          </svg>
        </button>
        <button 
          className={getButtonClass()}
          onClick={toggleMapType}
          title="Change map type"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.58 0-6.5-2.92-6.5-6.5S8.42 5.5 12 5.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5z"/>
            <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        </button>
        <button 
          className={getButtonClass()}
          onClick={() => map?.setZoom((map?.getZoom() || 10) + 1)}
          title="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
        <button 
          className={getButtonClass()}
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

  // Circle styling
  const circleOptions = {
    fillColor: '#0d2e13',
    fillOpacity: 0.45,
    strokeColor: '#00e676',
    strokeOpacity: 1,
    strokeWeight: 3,
    clickable: false,
    editable: false,
    zIndex: 2,
  };
  
  // Polygon styling
  const polygonOptions = {
    fillColor: '#0d2e13',
    fillOpacity: 0.45,
    strokeColor: '#00e676',
    strokeOpacity: 1,
    strokeWeight: 3,
    clickable: false,
    editable: false,
    zIndex: 2,
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (instructionsTimeoutRef.current) {
        clearTimeout(instructionsTimeoutRef.current);
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (map) {
        google.maps.event.clearListeners(map, 'click');
      }
    };
  }, [map]);

  // Add useImperativeHandle to expose methods to parent component
  useImperativeHandle(ref, () => ({
    // Add a method to get the Google Map instance
    getMap: () => map,
    
    // Add a method to pan to a location
    panTo: (location) => {
      if (map) {
        map.panTo(location);
      }
    },
    
    // Add a method to set zoom level
    setZoom: (zoomLevel) => {
      if (map) {
        map.setZoom(zoomLevel);
      }
    },
    
    // Add method to confirm region
    confirmRegion: () => {
      if (selectedRegion) {
        // Notify parent component
        if (onRegionSelect) {
          onRegionSelect(selectedRegion);
        }
        // Exit drawing mode
        setDrawingMode(null);
      }
    }
  }), [map, selectedRegion, onRegionSelect]);

  if (!isLoaded) {
    return <div className="loading">Loading map...</div>;
  }

  if (loadError) {
    return (
      <div className="dashboard-error">
        Error loading Google Maps: {loadError.message}
      </div>
    );
  }

  return (
    <div className="dashboard-map-container" ref={mapContainerRef}>
      <GoogleMap
        mapContainerClassName="google-map"
        center={center}
        zoom={13}
        options={{
          ...defaultOptions,
          mapTypeId: mapType,
        }}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={userMarkerIcon}
            title="Your location"
          />
        )}
        
        {/* Render circle if region is selected */}
        {selectedRegion && selectedRegion.type === 'circle' && (
          <Circle
            center={selectedRegion.center}
            radius={circleRadius}
            options={circleOptions}
          />
        )}
        
        {/* Render polygon if one is drawn */}
        {selectedRegion && selectedRegion.type === 'polygon' && polygonPath.length > 0 && (
          <Polygon
            paths={polygonPath}
            options={polygonOptions}
          />
        )}
        
        {/* Render resize marker for circle */}
        {resizeMarker && selectedRegion && selectedRegion.type === 'circle' && (
          <Marker
            position={resizeMarker}
            icon={resizeHandleIcon}
            draggable={true}
            onDrag={handleResizeMarkerDrag}
            title="Drag to resize"
          />
        )}
      </GoogleMap>
      
      {isMapLoaded && renderMapControls()}
      
      {/* Confirmation instruction for selected region */}
      {selectedRegion && (drawingMode || polygonPath.length > 0) && (
        <div className="drawing-instructions confirm-instructions">
          <p>Press Enter to confirm selection</p>
        </div>
      )}
      
      {/* Explore button */}
      {showExploreButton && (
        <div className="explore-button-container">
          <button className="explore-button" onClick={() => onRegionSelect && onRegionSelect(selectedRegion)}>
            Explore
          </button>
        </div>
      )}
      
      {/* Clear region button */}
      {selectedRegion && (
        <div className="clear-region-button-container">
          <button className="clear-region-button" onClick={handleClearRegion}>
            Clear
          </button>
        </div>
      )}
      
      {/* Drawing instructions with temporary display */}
      {showInstructions && drawingMode === 'polygon' && (
        <div className="drawing-instructions">
          <p>Click on the map to add points. Complete the shape by clicking the first point again.</p>
        </div>
      )}
      
      {/* Drawing instructions for circle mode */}
      {showInstructions && drawingMode === 'circle' && (
        <div className="drawing-instructions">
          <p>Click on the map to create a circle, then drag the handle to adjust the radius.</p>
        </div>
      )}
    </div>
  );
});

// Make sure to export the component with a proper display name
MapComponent.displayName = 'MapComponent';

export default MapComponent; 