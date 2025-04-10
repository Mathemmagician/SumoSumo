// Only disable console.log in production, keep other console methods
if (import.meta.env.PROD) {
  console.log = () => {};
}

import "./styles.css";
import { socketClient } from "./socket-client";
import { uiManager } from "./ui-manager";
import { renderer } from "./renderer";
import { sumiEAnimation } from "./intro-animation-sumi";
// import { stripeManager } from './stripe-manager.js';  // Don't delete this
import "./analytics";
import { storylineManager } from "./storyline-manager";

let stripeManager = null;

console.log("Loaded modules including stripeManager:", !!stripeManager);

// Initialize everything when the page loads
window.addEventListener("load", async () => {
  console.log("Window loaded, initializing...");

  try {
    // Initialize the intro animation
    // await sumiEAnimation.play();

    // Wait for renderer to initialize (which involves model loading)
    await renderer.initialize();

    // First, connect socket client
    socketClient.connect();
    
    // Explicitly make sure the stripe manager is initialized
    if (stripeManager) {
      console.log("StripeManager present, ensuring initialization");
      // The constructor should have called initialize already, but just in case
      if (typeof stripeManager.initialize === "function") {
        stripeManager.initialize();
      }
    }

    console.log("Initialization complete");
  } catch (error) {
    console.error("Initialization error:", error);
  }
});
