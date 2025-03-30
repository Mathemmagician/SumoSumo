import "./styles.css";
import { socketClient } from "./socket-client";
import { uiManager } from "./ui-manager";
import { renderer } from "./renderer";

// Initialize everything when the page loads
window.addEventListener("load", async () => {
  console.log("Window loaded, initializing...");
  
  try {
    // First, connect socket client
    socketClient.connect();
    
    // Wait for renderer to initialize (which involves model loading)
    await renderer.initialize();
    
    console.log("Initialization complete");
  } catch (error) {
    console.error("Initialization error:", error);
  }
});
