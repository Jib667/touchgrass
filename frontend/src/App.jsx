import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const polygonsContainerRef = useRef(null);
  const markersContainerRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Initialize map elements once at startup
    createPolygons();
    createMarkers();
    
    // We won't periodically recreate them to avoid resets
    // Instead, we'll create more than needed initially and let them cycle through animations
  }, []);
  
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
        
        <button className="cta-button">
          Join the Revolution
        </button>
      </main>
    </div>
  )
}

export default App
