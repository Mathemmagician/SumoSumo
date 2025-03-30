import posthog from 'posthog-js';

// Create a dummy posthog object for non-production environments
const dummyPosthog = {
  init: () => {},
  identify: () => {},
  capture: () => {},
  // Add other posthog methods you use as needed
};

// Only initialize PostHog in production
let activePosthog = dummyPosthog;
if (process.env.NODE_ENV === 'production') {
  // Initialize PostHog
  posthog.init('phc_tlQJij5bXtoLSw0cUFuBF6E6yQFWooHscrQOJexf7fl', {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only'
  });
  activePosthog = posthog;
}

// Helper functions for tracking events
export const trackUserJoined = (userId) => {
  // Identify the user
  activePosthog.identify(userId);
  
  // Track the user joined event
  activePosthog.capture('user_joined', {
    userId: userId,
    timestamp: new Date().toISOString()
  });
};

export default activePosthog; 