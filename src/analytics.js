import posthog from 'posthog-js';

// Initialize PostHog
posthog.init('phc_tlQJij5bXtoLSw0cUFuBF6E6yQFWooHscrQOJexf7fl', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only'
});

// Helper functions for tracking events
export const trackUserJoined = (userId) => {
  // Identify the user
  posthog.identify(userId);
  
  // Track the user joined event
  posthog.capture('user_joined', {
    userId: userId,
    timestamp: new Date().toISOString()
  });
};

export default posthog; 