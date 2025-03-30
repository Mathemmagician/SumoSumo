import "./styles.css";
import { socketClient } from "./socket-client";
import { uiManager } from "./ui-manager";
import { renderer } from "./renderer";
import { stripeManager } from './stripe-manager.js';

console.log("Loaded modules including stripeManager:", !!stripeManager);

// Initialize everything when the page loads
window.addEventListener("load", async () => {
  console.log("Window loaded, initializing...");
  
  try {
    // First, connect socket client
    socketClient.connect();
    
    // Wait for renderer to initialize (which involves model loading)
    await renderer.initialize();
    
    // Explicitly make sure the stripe manager is initialized
    if (stripeManager) {
      console.log("StripeManager present, ensuring initialization");
      // The constructor should have called initialize already, but just in case
      if (typeof stripeManager.initialize === 'function') {
        stripeManager.initialize();
      }
    }
    
    console.log("Initialization complete");
  } catch (error) {
    console.error("Initialization error:", error);
  }
});
