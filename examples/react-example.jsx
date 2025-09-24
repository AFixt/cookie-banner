/**
 * React Example of Accessible Cookie Banner
 * This file demonstrates how to use the cookie banner in a React application
 */

import React, { useEffect, useState } from 'react';

// In a real application, you would import from the package
// import CookieBanner from 'accessible-cookie-banner';
// import 'accessible-cookie-banner/dist/banner.css';

// Mock imports for demonstration purposes
const CookieBanner = window.CookieBanner;

const ConsentManager = () => {
  const [consent, setConsent] = useState(null);
  
  useEffect(() => {
    // Initialize the cookie banner when the component mounts
    CookieBanner.init({
      locale: 'en',
      theme: 'light',
      showModal: true,
      onConsentChange: (newConsent) => {
        console.log('Consent changed:', newConsent);
        setConsent(newConsent);
        
        // Conditionally load scripts based on consent
        if (newConsent.analytics) {
          loadAnalytics();
        }
        
        if (newConsent.marketing) {
          loadMarketingScripts();
        }
      }
    });
    
    // Check initial consent
    const initialConsent = CookieBanner.getConsent();
    setConsent(initialConsent);
    
    // Listen for consent change events
    const handleConsentChange = (e) => {
      setConsent(e.detail);
    };
    
    document.addEventListener('cookieConsentChanged', handleConsentChange);
    
    // Clean up event listener on unmount
    return () => {
      document.removeEventListener('cookieConsentChanged', handleConsentChange);
    };
  }, []);
  
  const loadAnalytics = () => {
    console.log('Loading analytics...');
    // In a real app, you would load your analytics script here
    // Example:
    // const script = document.createElement('script');
    // script.src = 'https://www.google-analytics.com/analytics.js';
    // document.body.appendChild(script);
  };
  
  const loadMarketingScripts = () => {
    console.log('Loading marketing scripts...');
    // In a real app, you would load marketing scripts here
  };
  
  const resetConsent = () => {
    // Create a ConsentManager instance to access clearConsent method
    const manager = new window.ConsentManager();
    manager.clearConsent();
    window.location.reload();
  };
  
  return (
    <div className="consent-manager">
      <h2>Consent Management Component</h2>
      
      <div className="consent-status">
        <h3>Current Consent Status:</h3>
        {consent ? (
          <pre>{JSON.stringify(consent, null, 2)}</pre>
        ) : (
          <p>No consent data found</p>
        )}
      </div>
      
      <button onClick={resetConsent}>Reset Consent</button>
    </div>
  );
};

// Example App component
const App = () => {
  return (
    <div className="app">
      <header>
        <h1>React Cookie Consent Example</h1>
      </header>
      
      <main>
        <p>
          This example demonstrates how to integrate the Accessible Cookie Banner
          in a React application. The banner is initialized in a React component
          and the consent state is managed through React hooks.
        </p>
        
        <ConsentManager />
      </main>
    </div>
  );
};

export default App;

/**
 * Note: This is a demonstration file only.
 * 
 * To use in a real React application:
 * 
 * 1. Install the package: npm install accessible-cookie-banner
 * 2. Import the component and CSS in your app
 * 3. Initialize the banner in a side effect (useEffect hook)
 * 4. Manage consent state in your React application
 * 
 * For more advanced use cases, you might want to create a React context
 * to make consent state available throughout your application.
 */