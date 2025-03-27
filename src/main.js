import "./styles.css";
import { socketClient } from "./socket-client";
import { uiManager } from "./ui-manager";
import { renderer } from "./renderer";

// Initialize everything when the page loads
window.addEventListener("load", () => {
  console.log("Window loaded, initializing...");
  socketClient.connect();
  renderer.initialize();
  console.log("Initialization complete");
});
