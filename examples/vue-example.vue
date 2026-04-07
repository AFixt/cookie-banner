<!--
  Vue.js Example of Accessible Cookie Banner
  This file demonstrates how to use the cookie banner in a Vue application
-->

<template>
  <div class="consent-manager">
    <h2>Consent Management Component</h2>

    <div class="consent-status">
      <h3>Current Consent Status:</h3>
      <pre v-if="consent">{{ JSON.stringify(consent, null, 2) }}</pre>
      <p v-else>No consent data found</p>
    </div>

    <button @click="resetConsent">Reset Consent</button>
  </div>
</template>

<script>
// In a real application, you would import from the package
// import CookieBanner from 'accessible-cookie-banner';
// import 'accessible-cookie-banner/dist/banner.css';

export default {
  name: 'ConsentManager',

  data() {
    return {
      consent: null,
    };
  },

  mounted() {
    // Initialize the cookie banner when the component is mounted
    // Assume CookieBanner is available globally for this example
    window.CookieBanner.init({
      locale: 'en',
      theme: 'light',
      showModal: true,
      onConsentChange: newConsent => {
        console.log('Consent changed:', newConsent);
        this.consent = newConsent;

        // Conditionally load scripts based on consent
        if (newConsent.analytics) {
          this.loadAnalytics();
        }

        if (newConsent.marketing) {
          this.loadMarketingScripts();
        }
      },
    });

    // Check initial consent
    this.consent = window.CookieBanner.getConsent();

    // Listen for consent change events
    document.addEventListener('cookieConsentChanged', this.handleConsentChange);
  },

  beforeDestroy() {
    // Clean up event listener when component is destroyed
    document.removeEventListener('cookieConsentChanged', this.handleConsentChange);
  },

  methods: {
    handleConsentChange(e) {
      this.consent = e.detail;
    },

    loadAnalytics() {
      console.log('Loading analytics...');
      // In a real app, you would load your analytics script here
      // Example:
      // const script = document.createElement('script');
      // script.src = 'https://www.google-analytics.com/analytics.js';
      // document.body.appendChild(script);
    },

    loadMarketingScripts() {
      console.log('Loading marketing scripts...');
      // In a real app, you would load marketing scripts here
    },

    resetConsent() {
      // Create a ConsentManager instance to access clearConsent method
      const manager = new window.ConsentManager();
      manager.clearConsent();
      window.location.reload();
    },
  },
};
</script>

<style scoped>
.consent-manager {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  background: #0056b3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #003d82;
}

button:focus {
  outline: 3px solid #4d90fe;
}

pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>

<!--
  Note: This is a demonstration file only.
  
  To use in a real Vue application:
  
  1. Install the package: npm install accessible-cookie-banner
  2. Import the component and CSS in your app
  3. Initialize the banner in the mounted hook
  4. Manage consent state in your Vue component
  
  For more advanced use cases, you might want to create a Vuex store
  to make consent state available throughout your application.
-->
