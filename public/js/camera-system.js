/**
 * Camera System for SumoSumo
 * Manages different camera modes and transitions
 */

class CameraSystem {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Camera mode constants
    this.MODES = {
      WAITING_OVERVIEW: 'waitingOverview',
      // We'll add more modes later
    };
    
    // Current active mode
    this.currentMode = this.MODES.WAITING_OVERVIEW;
    
    // Camera positions and settings for different modes
    this.cameraSettings = {
      [this.MODES.WAITING_OVERVIEW]: {
        basePosition: new THREE.Vector3(-2.00, 12.72, 20.40),
        lookAt: new THREE.Vector3(0, 2, 0), // Center of the ring
        bobAmplitude: 2.0, // How much the camera moves up and down
        bobSpeed: 0.0005, // Speed of the up/down movement
      }
    };
    
    // Animation variables
    this.animationStartTime = Date.now();
    
    // Initialize the system
    this.init();
  }
  
  /**
   * Initialize the camera system
   */
  init() {
    // Set initial camera position based on current mode
    this.setMode(this.currentMode);
  }
  
  /**
   * Set the camera mode
   * @param {string} modeName - The mode to set
   */
  setMode(modeName) {
    if (!this.MODES[modeName] && !Object.values(this.MODES).includes(modeName)) {
      console.error(`Invalid camera mode: ${modeName}`);
      return;
    }
    
    this.currentMode = modeName;
    this.animationStartTime = Date.now(); // Reset animation timer on mode change
    
    // Initialize position for this mode
    this.updateCameraForCurrentMode(0); // Initial update with 0 elapsed time
  }
  
  /**
   * Update camera position and orientation based on current mode and time
   */
  update() {
    const elapsedTime = Date.now() - this.animationStartTime;
    this.updateCameraForCurrentMode(elapsedTime);
  }
  
  /**
   * Update camera for current mode with given elapsed time
   * @param {number} elapsedTime - Time elapsed since mode was set
   */
  updateCameraForCurrentMode(elapsedTime) {
    const settings = this.cameraSettings[this.currentMode];
    
    if (!settings) {
      console.error(`No settings for camera mode: ${this.currentMode}`);
      return;
    }
    
    // Handle based on specific mode
    switch (this.currentMode) {
      case this.MODES.WAITING_OVERVIEW:
        this.updateWaitingOverviewCamera(settings, elapsedTime);
        break;
      // Add more modes as needed
      default:
        console.warn(`No update handler for camera mode: ${this.currentMode}`);
    }
  }
  
  /**
   * Update camera for waiting overview mode
   * @param {Object} settings - Camera settings for this mode
   * @param {number} elapsedTime - Time elapsed since mode was set
   */
  updateWaitingOverviewCamera(settings, elapsedTime) {
    // Calculate vertical bobbing
    const yOffset = Math.sin(elapsedTime * settings.bobSpeed) * settings.bobAmplitude;
    
    // Set camera position with bobbing effect
    this.camera.position.copy(settings.basePosition);
    this.camera.position.y += yOffset;
    
    // Always look at the center of the ring
    this.camera.lookAt(settings.lookAt);
  }
  
  /**
   * Get the current camera mode
   * @returns {string} The current camera mode
   */
  getCurrentMode() {
    return this.currentMode;
  }
}

// Make the camera system available globally
window.CameraSystem = CameraSystem; 