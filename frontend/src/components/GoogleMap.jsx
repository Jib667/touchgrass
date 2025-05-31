import { useState, useEffect, forwardRef, useCallback, useRef, useImperativeHandle } from 'react';
import { GoogleMap, useJsApiLoader, Circle, Polygon, Marker } from '@react-google-maps/api';

// Define libraries as a constant outside the component to prevent reloading issues
const libraries = ['places', 'geometry', 'drawing', 'marker']; // Will be used by GoogleMapRenderer

// Default to Burke, Virginia
const defaultCenter = { // Will be used by GoogleMapRenderer
  lat: 38.7934, 
  lng: -77.2717
};

// Map styles
const defaultOptions = { // Will be used by GoogleMapRenderer
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
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState(null);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [keyFetchAttempted, setKeyFetchAttempted] = useState(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/maps-key`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch API key');
        }
        const data = await response.json();
        if (data.apiKey) {
          setGoogleMapsApiKey(data.apiKey);
          setApiKeyError(null);
        } else {
          throw new Error('API key not found in response');
        }
      } catch (error) {
        console.error("Error fetching Google Maps API key:", error);
        setApiKeyError(error.message);
        if (onLoadStateChange) {
          onLoadStateChange({ isLoaded: false, loadError: new Error(`Failed to fetch API key: ${error.message}`) });
        }
      } finally {
        setKeyFetchAttempted(true);
      }
    };
    fetchApiKey();
  }, [onLoadStateChange]);

  if (!keyFetchAttempted) {
    return <div className="loading">Initializing map configuration...</div>;
  }

  if (apiKeyError) {
    return <div className="dashboard-error">Error obtaining API key: {apiKeyError}</div>;
  }

  if (!googleMapsApiKey) {
    return <div className="dashboard-error">Google Maps API Key not available after fetch.</div>;
  }

  // Render GoogleMapRenderer once the API key is successfully fetched
  return (
    <GoogleMapRenderer
      googleMapsApiKey={googleMapsApiKey}
      onRegionSelect={onRegionSelect}
      drawingMode={externalDrawingMode}
      onLoadStateChange={onLoadStateChange}
      ref={ref}
    />
  );
});

MapComponent.displayName = 'MapComponent';
export default MapComponent;

// GoogleMapRenderer component will be defined below this comment in a subsequent step.
// All the map logic, including useJsApiLoader, states for map instance, drawing, etc.,
// will go into GoogleMapRenderer.

const GoogleMapRenderer = forwardRef(({ googleMapsApiKey, onRegionSelect, drawingMode: externalDrawingMode, onLoadStateChange }, ref) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: libraries, // This `libraries` constant is defined at the top of the file
  });

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(defaultCenter); // `defaultCenter` is at the top
  const [userLocation, setUserLocation] = useState(null);
  const [isMapInstanceLoaded, setIsMapInstanceLoaded] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [resizeMarker, setResizeMarker] = useState(null);
  const [polygonPath, setPolygonPath] = useState([]);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [drawingModeInternal, setDrawingModeInternal] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Add a new state for forcing re-renders
  const [renderKey, setRenderKey] = useState(Date.now());
  
  const animationRef = useRef(null);
  const mapContainerRef = useRef(null);
  const instructionsTimeoutRef = useRef(null);
  const externalDrawingModeRef = useRef(externalDrawingMode);
  const currentDrawingRef = useRef(currentDrawing);
  
  // Add back the marker icons and options inside the component
  const userMarkerIcon = {
    path: "M12,2C8.14,2 5,5.14 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.86 -3.14,-7 -7,-7zM12,13.5c-2.49,0 -4.5,-2.01 -4.5,-4.5S9.51,4.5 12,4.5s4.5,2.01 4.5,4.5 -2.01,4.5 -4.5,4.5z",
    fillColor: "#9dffb0",
    fillOpacity: 1,
    strokeWeight: 0,
    rotation: 0,
    scale: 1.5,
    anchor: { x: 12, y: 22 },
  };
  
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

  const circleOptions = {
    fillColor: '#0d2e13', 
    fillOpacity: 0.6,
    strokeColor: '#00e676',
    strokeOpacity: 1, 
    strokeWeight: 3, 
    clickable: false, 
    editable: false, 
    zIndex: 2,
  };
  
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

  // Add a ref to track the last Google Maps Circle overlay
  const lastCircleOverlayRef = useRef(null);

  // Define the cleanup function here, before it's used
  const cleanupAllCircles = useCallback(() => {
    // Explicitly clear both currentDrawing and selectedRegion
    setCurrentDrawing(null);
    setSelectedRegion(null);
    setResizeMarker(null);
    setShowConfirmButton(false);
    
    // Force a re-render by adding a unique key
    setRenderKey(Date.now());
  }, []);

  // Now define handleClearRegion which uses cleanupAllCircles
  const handleClearRegion = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Remove the last overlay if it exists
    if (lastCircleOverlayRef.current) {
      lastCircleOverlayRef.current.setMap(null);
      lastCircleOverlayRef.current = null;
    }
    
    // Store current drawing mode before clearing
    const currentMode = externalDrawingModeRef.current;
    
    // Reset drawing manager
    if (drawingManager && window.google && window.google.maps) {
      // Clear any active overlays
      if (drawingManager.getOverlay && typeof drawingManager.getOverlay === 'function') {
        const overlay = drawingManager.getOverlay();
        if (overlay) overlay.setMap(null);
      }
    }
    
    // Use the cleanup function to clear all circles
    cleanupAllCircles();
    
    // Also notify parent to clear any regions there
    if (onRegionSelect) onRegionSelect(null);
    
    // Reset drawing mode after a short delay to ensure clean state
    setTimeout(() => {
      if (drawingManager && window.google && window.google.maps) {
        // If we're in drawing mode, keep the same mode active
        if (currentMode === 'polygon') {
          drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
        } else if (currentMode === 'circle') {
          drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.CIRCLE);
        } else {
          drawingManager.setDrawingMode(null);
        }
      }
    }, 50);
  }, [onRegionSelect, drawingManager, cleanupAllCircles]);

  useEffect(() => {
    if (loadError) {
      console.error("Google Maps API Load Error (GoogleMapRenderer):", loadError);
    }
    if (isLoaded) {
      console.log("Google Maps API Loaded Successfully (GoogleMapRenderer).");
    }
    if (onLoadStateChange) {
      onLoadStateChange({ isLoaded, loadError });
    }
  }, [isLoaded, loadError, onLoadStateChange]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(userPos);
          setCenter(userPos);
        },
        error => { console.log("Geolocation error:", error); setCenter(defaultCenter); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCenter(defaultCenter);
    }
  }, []);

  useEffect(() => {
    setDrawingModeInternal(externalDrawingMode);
    
    // Cancel any animations
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Clear all existing drawings
    setCurrentDrawing(null);
    setSelectedRegion(null);
    setResizeMarker(null);
    setPolygonPath([]);
    setShowConfirmButton(false);
    
    // Set drawing mode via drawing manager
    if (drawingManager && window.google && window.google.maps) {
      // First clear any existing overlays
      if (drawingManager.getOverlay && typeof drawingManager.getOverlay === 'function') {
        const overlay = drawingManager.getOverlay();
        if (overlay) overlay.setMap(null);
      }
      
      if (externalDrawingMode === 'polygon') {
        // Switch to polygon drawing mode
        drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
      } 
      else if (externalDrawingMode === 'circle') {
        // Switch to circle drawing mode
        drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.CIRCLE);
      } 
      else {
        // Turn off drawing mode
        drawingManager.setDrawingMode(null);
      }
      }
      
    // Show instructions if in drawing mode
      if (externalDrawingMode) {
        setShowInstructions(true);
      if (instructionsTimeoutRef.current) clearTimeout(instructionsTimeoutRef.current);
      instructionsTimeoutRef.current = setTimeout(() => setShowInstructions(false), 5000);
    } else {
      setShowInstructions(false);
    }
    
    // Store current mode in ref for other functions to access
    externalDrawingModeRef.current = externalDrawingMode;
    
    return () => {
        if (instructionsTimeoutRef.current) {
          clearTimeout(instructionsTimeoutRef.current);
      }
    };
  }, [externalDrawingMode, drawingManager]);

  const onMapLoad = useCallback(mapInstance => {
    console.log('[MapRenderer] onMapLoad called');
    setMap(mapInstance);
    setIsMapInstanceLoaded(true);
    mapInstance.setMapTypeId('roadmap');
    
    if (window.google && window.google.maps && window.google.maps.drawing) {
      // Create drawing manager with proper options
      const dm = new window.google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false, // We'll control this through our UI
        circleOptions: {
          fillColor: '#0d2e13',
          fillOpacity: 0.6,
          strokeColor: '#00e676',
          strokeOpacity: 1,
          strokeWeight: 3,
          clickable: false,
          editable: false,
          zIndex: 10
        },
        polygonOptions: { 
          clickable: false, 
          editable: false, 
          fillColor: '#0d2e13', 
          fillOpacity: 0.45, 
          strokeColor: '#00e676', 
          strokeOpacity: 1, 
          strokeWeight: 3, 
          zIndex: 1
        }
      });
      
      // Set the drawing manager on the map
      dm.setMap(mapInstance);
      setDrawingManager(dm);
      
      // Add event listeners for shape completion
      window.google.maps.event.clearInstanceListeners(dm);
      
      // Handle polygon completion
      window.google.maps.event.addListener(dm, 'polygoncomplete', polygon => {
        dm.setDrawingMode(null);

        const path = polygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));
        const region = { type: 'polygon', path };
        setSelectedRegion(region);
        if (onRegionSelect) onRegionSelect(region);

        polygon.setMap(null);

        // Ensure confirm button is hidden
        setShowConfirmButton(false);
        setCurrentDrawing(null);
      });
      
      // Handle circle completion
      window.google.maps.event.addListener(dm, 'circlecomplete', circle => {
        // Remove previous overlay if it exists
        if (lastCircleOverlayRef.current) {
          lastCircleOverlayRef.current.setMap(null);
          lastCircleOverlayRef.current = null;
        }
        // Store the new overlay
        lastCircleOverlayRef.current = circle;

        // Immediately set drawing mode to null to prevent multiple shapes
        dm.setDrawingMode(null);

        // Get center and radius from circle
        const center = { 
          lat: circle.getCenter().lat(), 
          lng: circle.getCenter().lng() 
        };
        const radius = circle.getRadius();

        // Create the circle data
        const circleData = { type: 'circle', center, radius };

        // Notify parent
        if (onRegionSelect) onRegionSelect(circleData);

        // Do NOT setSelectedRegion or setCurrentDrawing for circles (let Google Maps handle display)
        setResizeMarker(null);
        setShowConfirmButton(false);
        setCurrentDrawing(null);
        setSelectedRegion(null);

        // Optionally, re-enable drawing mode if you want to allow drawing another circle immediately
        if (drawingManager && externalDrawingModeRef.current === 'circle') {
          setTimeout(() => {
            drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.CIRCLE);
          }, 50);
        }
      });
    }
  }, []);

  const onUnmount = useCallback(() => {
    if (drawingManager) window.google.maps.event.clearInstanceListeners(drawingManager);
    setMap(null); setIsMapInstanceLoaded(false); setDrawingManager(null);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (instructionsTimeoutRef.current) clearTimeout(instructionsTimeoutRef.current);
  }, [drawingManager]);

  const handleResizeMarkerDrag = useCallback((e) => {
    const currentDrawingVal = currentDrawingRef.current;
    if (!currentDrawingVal || currentDrawingVal.type !== 'circle' || !currentDrawingVal.center) return;
    
    const center = currentDrawingVal.center;
    const newMarkerPosition = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    
    // Calculate direct distance between center and marker
    const p1 = new google.maps.LatLng(center.lat, center.lng);
    const p2 = new google.maps.LatLng(newMarkerPosition.lat, newMarkerPosition.lng);
    const newRadius = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
    
    // Minimum radius
    const minRadius = 50;
    const radiusToSet = Math.max(newRadius, minRadius);
    
    // Update circle with new radius
    setCurrentDrawing({
        type: 'circle',
        center: center,
      radius: radiusToSet
    });
    
    // Keep the marker on the edge
    setResizeMarker(newMarkerPosition);
    setShowConfirmButton(true);
  }, []);

  const handleResizeMarkerDragEnd = useCallback((e) => {
    const currentDrawingVal = currentDrawingRef.current;
    if (!currentDrawingVal || currentDrawingVal.type !== 'circle') return;
    
    // Immediately confirm the circle with the current radius
    setSelectedRegion(currentDrawingVal);
    if (onRegionSelect) onRegionSelect(currentDrawingVal);
    
    // Clear current drawing state
    setCurrentDrawing(null);
    setResizeMarker(null);
    setShowConfirmButton(false);
    
    // Exit drawing mode
    setDrawingModeInternal(null);
  }, [onRegionSelect]);

  const handleConfirmRegionClick = useCallback(() => {
    const currentDrawingVal = currentDrawingRef.current;
    if (currentDrawingVal) {
      setSelectedRegion(currentDrawingVal);
      if (onRegionSelect) onRegionSelect(currentDrawingVal);
      setShowConfirmButton(false);
      setCurrentDrawing(null);
      setDrawingModeInternal(null);
    }
  }, [onRegionSelect]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (externalDrawingModeRef.current || showConfirmButton)) {
        handleClearRegion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmButton, handleClearRegion]);

  const centerMapOnUser = () => { if (userLocation && map) { map.panTo(userLocation); map.setZoom(15); } };
  const toggleMapType = () => { if (map) { const nextType = mapType === 'roadmap' ? 'hybrid' : mapType === 'hybrid' ? 'satellite' : 'roadmap'; map.setMapTypeId(nextType); setMapType(nextType); } };
  const getButtonClass = () => mapType === 'roadmap' ? 'map-control-button' : 'map-control-button light';

  useImperativeHandle(ref, () => ({
    getMap: () => map,
    panTo: (location) => map?.panTo(location),
    setZoom: (zoomLevel) => map?.setZoom(zoomLevel),
    clearRegion: handleClearRegion
  }), [map, handleClearRegion]);

  useEffect(() => {
    currentDrawingRef.current = currentDrawing;
  }, [currentDrawing]);

  // Helper function to calculate resize handle position
  const calculateResizeHandlePosition = useCallback((center, radius) => {
    const R = 6371e3; // Earth radius in meters
    const latRad = center.lat * Math.PI / 180;
    const lngRad = center.lng * Math.PI / 180;
    const dLng = radius / (R * Math.cos(latRad));
    const resizeHandleLng = lngRad + dLng;
    
    return { 
      lat: center.lat,
      lng: resizeHandleLng * 180 / Math.PI 
    };
  }, []);

  // Add a helper to determine if a circle overlay exists
  const hasCircleOverlay = !!lastCircleOverlayRef.current;
  const hasPolygon = (currentDrawing && currentDrawing.type === 'polygon') || (selectedRegion && selectedRegion.type === 'polygon');
  const shouldShowClearButton = hasCircleOverlay || hasPolygon;

  if (!isLoaded) return <div className="loading">Loading map script...</div>; // Handled by parent for API key, this is for script itself
  if (loadError) return <div className="dashboard-error">Error loading Google Maps script: {loadError.message}</div>;

  const displayRegion = currentDrawing || selectedRegion;
  const displayPolygonPath = currentDrawing?.type === 'polygon' ? currentDrawing.path : (selectedRegion?.type === 'polygon' && !currentDrawing ? selectedRegion.path : []);

  return (
    <div className="dashboard-map-container" ref={mapContainerRef}>
      <GoogleMap
        mapContainerClassName={`google-map ${drawingModeInternal ? 'drawing-cursor' : ''}`}
        center={center}
        zoom={13}
        options={{ ...defaultOptions, mapTypeId: mapType, gestureHandling: 'greedy' }}
        onLoad={onMapLoad}
        onUnmount={onUnmount}
      >
        {userLocation && <Marker position={userLocation} icon={userMarkerIcon} title="Your location" />}
        
        {/* Circle - ONLY rendered if we have a currentDrawing or selectedRegion of type circle */}
        {currentDrawing?.type === 'circle' ? (
          <Circle 
            key={`current-circle-${renderKey}`}
            center={currentDrawing.center} 
            radius={currentDrawing.radius} 
            options={circleOptions}
          />
        ) : null}
        
        {/* Polygon */}
        {currentDrawing?.type === 'polygon' ? (
          <Polygon 
            key="current-polygon"
            paths={polygonPath} 
            options={polygonOptions} 
          />
        ) : selectedRegion?.type === 'polygon' ? (
          <Polygon
            key={`selected-polygon-${renderKey}`}
            paths={selectedRegion.path}
            options={polygonOptions}
          />
        ) : null}
        
        {/* Resize marker - only shown for active circle drawings */}
        {currentDrawing?.type === 'circle' && resizeMarker && (
          <Marker
            position={resizeMarker}
            icon={resizeHandleIcon}
            draggable={true}
            onDrag={handleResizeMarkerDrag}
            onDragEnd={handleResizeMarkerDragEnd}
            title="Drag to resize"
          />
        )}
      </GoogleMap>
      
      {isMapInstanceLoaded && (
        <>
          <div className="map-controls">
            <button className={getButtonClass()} onClick={centerMapOnUser} title="Center on my location">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
            </button>
            <button className={getButtonClass()} onClick={toggleMapType} title="Change map type">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.58 0-6.5-2.92-6.5-6.5S8.42 5.5 12 5.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5z"/><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </button>
            <button className={getButtonClass()} onClick={() => map?.setZoom((map?.getZoom() || 10) + 1)} title="Zoom in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            <button className={getButtonClass()} onClick={() => map?.setZoom((map?.getZoom() || 10) - 1)} title="Zoom out">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
          </button>
        </div>

          {shouldShowClearButton && (
            <div className="map-clear-button-container">
              <button 
                onClick={handleClearRegion} 
                className="clear-region-btn map-secondary-action-button" 
                title="Clear current drawing or selected region"
              >
                Clear
              </button>
            </div>
          )}
          
          {showInstructions && drawingModeInternal === 'polygon' && (
            <div className="drawing-instructions"><p>Click to add points. Click first point to close. ESC to cancel.</p></div>
          )}
          {showInstructions && drawingModeInternal === 'circle' && (
            <div className="drawing-instructions"><p>Click to place circle. Drag handle to resize. ESC to cancel.</p></div>
          )}
        </>
      )}
    </div>
  );
});

GoogleMapRenderer.displayName = 'GoogleMapRenderer'; 