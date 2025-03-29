import * as THREE from 'three';
import { RING_HEIGHT } from './constants';

/**
 * Camera System for SumoSumo
 * Manages different camera modes and transitions
 */
export class CameraSystem {
  constructor(scene, camera, renderer) {
    // Check if dependencies are provided
    if (!scene || !camera || !renderer) {
      console.error("CameraSystem: Missing required dependencies");
      // Use safe defaults
      this.scene = scene || new THREE.Scene();
      this.camera = camera || new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.renderer = renderer || {};
      // Add a flag to disable operations when improperly initialized
      this._initialized = false;
    } else {
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this._initialized = true;
    }
    
    // Camera mode constants
    this.MODES = {
      WAITING_OVERVIEW: 'waitingOverview',
      CEREMONY: 'ceremony',
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
      },
      [this.MODES.CEREMONY]: {
        // These will be set dynamically when the ceremony starts
        fighter1: null,
        fighter2: null,
        referee: null,
        // Timing constants (in milliseconds)
        introduceDelay: 1000,    // Initial delay before starting introductions
        fighter1Time: 2000,      // Time to focus on fighter 1
        fighter2Time: 2000,      // Time to focus on fighter 2
        refereeTime: 2000,       // Time to focus on referee
        outroTime: 1000,         // Time to transition back to overview
        // Camera settings for close-ups
        closeupDistance: 1.0,    // How far from the face to position camera
        closeupHeight: 1.4,      // Height adjustment for close-ups
        cineBarsEnabled: true    // Whether to show cinematic bars
      }
    };
    
    // Animation variables
    this.animationStartTime = Date.now();
    this.ceremonyCameraActive = false;
    this.ceremonyPhase = null;
    this.ceremonyCineBars = null;
    
    // For smooth transitions
    this.transitionStartTime = null;
    this.transitionFromPosition = null;
    this.transitionFromTarget = null;
    this.transitionToPosition = null;
    this.transitionToTarget = null;
    this.transitionDuration = 500; // ms
    
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
   * @param {Object} params - Optional parameters for the mode
   */
  setMode(modeName, params = {}) {
    if (!this._initialized) return;
    
    // For now, only allow WAITING_OVERVIEW and CEREMONY modes
    if (modeName !== this.MODES.CEREMONY) {
      modeName = this.MODES.WAITING_OVERVIEW;
    }

    // Handle specific setup for ceremony mode
    if (modeName === this.MODES.CEREMONY) {
      if (!params.fighter1 || !params.fighter2 || !params.referee) {
        console.warn('Ceremony mode missing required params, falling back to overview');
        modeName = this.MODES.WAITING_OVERVIEW;
      } else {
        this.setupCeremonyMode(params);
      }
    }

    // Store the previous position and target for transitions
    this.transitionStartTime = Date.now();
    this.transitionFromPosition = this.camera.position.clone();
    this.transitionFromTarget = this.getTargetFromCamera();

    this.currentMode = modeName;
    this.animationStartTime = Date.now();

    // Initialize position for this mode
    this.updateCameraForCurrentMode(0);
  }
  
  /**
   * Get the current camera target (what it's looking at)
   * @returns {THREE.Vector3} The current camera target
   */
  getTargetFromCamera() {
    // Calculate where the camera is looking
    const target = new THREE.Vector3(0, 0, -1);
    target.applyQuaternion(this.camera.quaternion);
    target.multiplyScalar(100); // Extend out to a reasonable distance
    target.add(this.camera.position);
    return target;
  }
  
  /**
   * Setup ceremony mode with required parameters
   * @param {Object} params - The ceremony parameters
   */
  setupCeremonyMode(params) {
    const ceremonySettings = this.cameraSettings[this.MODES.CEREMONY];
    
    if (!params.fighter1 || !params.fighter2 || !params.referee) {
      console.error('Ceremony mode requires fighter1, fighter2, and referee objects');
      return;
    }
    
    ceremonySettings.fighter1 = params.fighter1;
    ceremonySettings.fighter2 = params.fighter2;
    ceremonySettings.referee = params.referee;
    
    // Reset ceremony state
    this.ceremonyCameraActive = true;
    this.ceremonyPhase = 'intro';
    
    // Create cinematic bars if enabled and they don't exist
    if (ceremonySettings.cineBarsEnabled && !this.ceremonyCineBars) {
      this.ceremonyCineBars = this.createCinematicBars();
    }
  }
  
  /**
   * Update camera position and orientation based on current mode and time
   */
  update() {
    if (!this._initialized) return;
    
    // Default to WAITING_OVERVIEW for all non-ceremony stages
    if (this.currentMode !== this.MODES.CEREMONY) {
      if (this.currentMode !== this.MODES.WAITING_OVERVIEW) {
        this.setMode(this.MODES.WAITING_OVERVIEW);
        return;
      }
    }

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
      case this.MODES.CEREMONY:
        this.updateCeremonyCamera(settings, elapsedTime);
        break;
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
    // Ensure we're not in ceremony mode
    if (this.ceremonyCameraActive) {
        this.cleanupCeremonyMode();
    }

    // Calculate vertical bobbing
    const yOffset = Math.sin(elapsedTime * settings.bobSpeed) * settings.bobAmplitude;
    
    // Set camera position with bobbing effect
    this.camera.position.copy(settings.basePosition);
    this.camera.position.y += yOffset;
    
    // Always look at the center of the ring
    this.camera.lookAt(settings.lookAt);
  }
  
  /**
   * Update camera for ceremony mode
   * @param {Object} settings - Camera settings for this mode
   * @param {number} elapsedTime - Time elapsed since mode was set
   */
  updateCeremonyCamera(settings, elapsedTime) {
    // Early exit if we don't have all the required participants
    if (!settings.fighter1 || !settings.fighter2 || !settings.referee) {
        console.warn('Ceremony mode is missing participants, falling back to overview');
        this.cleanupCeremonyMode();
        this.setMode(this.MODES.WAITING_OVERVIEW);
        return;
    }
    
    // Define the phases and their timing
    const phases = {
      intro: {
        time: settings.introduceDelay,
        next: 'fighter1',
        showBars: false
      },
      fighter1: {
        time: settings.fighter1Time,
        next: 'fighter2',
        showBars: true,
        target: settings.fighter1
      },
      fighter2: {
        time: settings.fighter2Time,
        next: 'referee',
        showBars: true,
        target: settings.fighter2
      },
      referee: {
        time: settings.refereeTime,
        next: 'outro',
        showBars: true,
        target: settings.referee
      },
      outro: {
        time: settings.outroTime,
        next: null,
        showBars: false
      }
    };
    
    // Find which phase we're in based on elapsed time
    let timeAccumulator = 0;
    let currentPhase = 'intro';
    
    for (const [phaseName, phase] of Object.entries(phases)) {
      if (elapsedTime < timeAccumulator + phase.time) {
        currentPhase = phaseName;
        break;
      }
      timeAccumulator += phase.time;
    }
    
    // Update ceremony phase if changed
    if (this.ceremonyPhase !== currentPhase) {
      this.handlePhaseChange(this.ceremonyPhase, currentPhase, phases);
      this.ceremonyPhase = currentPhase;
    }
    
    // Handle the current phase
    const phase = phases[currentPhase];
    const phaseElapsedTime = elapsedTime - timeAccumulator;
    const phaseProgress = phaseElapsedTime / phase.time;
    
    switch (currentPhase) {
      case 'intro':
        // Instead of rotating, just position the camera at a fixed overview position
        this.camera.position.set(-15, 15, 15);
        this.camera.lookAt(0, 0, 0);
        break;
        
      case 'fighter1':
      case 'fighter2':
      case 'referee':
        // Position camera for close-up on the current target
        this.positionCameraForCloseup(phase.target, settings);
        break;
        
      case 'outro':
        // Transition back to waiting overview
        if (phaseProgress >= 1.0) {
          if (this.currentMode === this.MODES.CEREMONY) {
            this.cleanupCeremonyMode();
            this.setMode(this.MODES.WAITING_OVERVIEW);
          }
        } else {
          this.transitionToWaitingOverview(phaseProgress);
        }
        break;
    }
    
    // If we've gone through all phases, exit ceremony mode
    if (timeAccumulator + phase.time <= elapsedTime && !phase.next) {
        if (this.currentMode === this.MODES.CEREMONY) {
            this.cleanupCeremonyMode();
            this.setMode(this.MODES.WAITING_OVERVIEW);
        }
        return;
    }
  }
  
  /**
   * Handle phase change in ceremony mode
   * @param {string} fromPhase - The previous phase
   * @param {string} toPhase - The new phase
   * @param {Object} phases - Phase definitions
   */
  handlePhaseChange(fromPhase, toPhase, phases) {
    const fromPhaseObj = phases[fromPhase];
    const toPhaseObj = phases[toPhase];
    
    // Handle cinematic bars
    if (toPhaseObj.showBars && this.ceremonyCineBars) {
      this.ceremonyCineBars.show();
    } else if (this.ceremonyCineBars) {
      this.ceremonyCineBars.hide();
    }
    
    // Store transition start info
    this.transitionStartTime = Date.now();
    this.transitionFromPosition = this.camera.position.clone();
    this.transitionFromTarget = this.getTargetFromCamera();
  }
  
  /**
   * Position camera for close-up on a target
   * @param {Object} target - The target to focus on (fighter or referee)
   * @param {Object} settings - Camera settings
   */
  positionCameraForCloseup(target, settings) {
    if (!target || !target.position) {
      console.warn('Invalid target for close-up');
      return;
    }
    
    // Position camera at the center of the ring
    const ringCenter = new THREE.Vector3(0, RING_HEIGHT + settings.closeupHeight, 0); // Center of the ring, slightly elevated
    
    // Get target position
    const targetPosition = target.position.clone();
    
    // Calculate direction from ring center to target
    const directionToTarget = new THREE.Vector3()
      .subVectors(targetPosition, ringCenter)
      .normalize();
    
    // Calculate eye level position (adjust height for better framing)
    const eyePosition = targetPosition.clone();
    eyePosition.y += settings.closeupHeight;
    
    // Position camera in the center of the ring
    this.camera.position.copy(ringCenter);
    
    // Look at the target's eye level
    this.camera.lookAt(eyePosition);
    
    // Add a slight upward tilt for a more dramatic look
    const cameraUp = new THREE.Vector3(0, 0.5, 0);
    const rightVector = new THREE.Vector3().crossVectors(directionToTarget, cameraUp).normalize();
    
    // Tilt the camera slightly based on an offset from the perfect center
    const tiltDirection = new THREE.Vector3().crossVectors(rightVector, directionToTarget).normalize();
    this.camera.position.add(tiltDirection.multiplyScalar(0.3)); // Subtle upward tilt
  }
  
  /**
   * Transition from current position to waiting overview
   * @param {number} progress - Transition progress (0-1)
   */
  transitionToWaitingOverview(progress) {
    const overviewSettings = this.cameraSettings[this.MODES.WAITING_OVERVIEW];
    
    // Use smoothstep for easing
    const t = this.smoothstep(0, 1, progress);
    
    // Interpolate position
    const newPosition = new THREE.Vector3().lerpVectors(
      this.transitionFromPosition,
      overviewSettings.basePosition,
      t
    );
    
    this.camera.position.copy(newPosition);
    
    // Interpolate look target (more complex)
    const fromDirection = this.transitionFromTarget.clone().sub(this.transitionFromPosition).normalize();
    const toDirection = overviewSettings.lookAt.clone().sub(overviewSettings.basePosition).normalize();
    
    // Spherical interpolation would be better, but we'll use a simple approach
    const currentDirection = new THREE.Vector3().lerpVectors(fromDirection, toDirection, t).normalize();
    
    // Calculate look target point
    const targetPoint = newPosition.clone().add(currentDirection.multiplyScalar(10));
    this.camera.lookAt(targetPoint);
  }
  
  /**
   * Smoothstep function for better easing
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} value - Input value
   * @returns {number} Smoothed value
   */
  smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }
  
  /**
   * Create cinematic black bars
   * @returns {Object} Controls for the bars
   */
  createCinematicBars() {
    const CINEMA_BAR_HEIGHT = 0.15; // 15% of screen height for top and bottom
    
    const container = document.createElement('div');
    container.id = 'cinematic-bars';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
    `;

    const topBar = document.createElement('div');
    topBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: ${CINEMA_BAR_HEIGHT * 100}%;
      background-color: black;
      transform: translateY(-100%);
      transition: transform 0.5s ease-in-out;
    `;

    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: ${CINEMA_BAR_HEIGHT * 100}%;
      background-color: black;
      transform: translateY(100%);
      transition: transform 0.5s ease-in-out;
    `;

    container.appendChild(topBar);
    container.appendChild(bottomBar);
    document.body.appendChild(container);

    return {
      container,
      topBar,
      bottomBar,
      show() {
        container.style.opacity = '1';
        topBar.style.transform = 'translateY(0)';
        bottomBar.style.transform = 'translateY(0)';
      },
      hide() {
        container.style.opacity = '0';
        topBar.style.transform = 'translateY(-100%)';
        bottomBar.style.transform = 'translateY(100%)';
      }
    };
  }
  
  /**
   * Get the current camera mode
   * @returns {string} The current camera mode
   */
  getCurrentMode() {
    return this.currentMode;
  }
  
  /**
   * Clean up ceremony mode resources and reset state
   */
  cleanupCeremonyMode() {
    // Hide cinematic bars if they exist
    if (this.ceremonyCineBars) {
        this.ceremonyCineBars.hide();
    }
    
    // Reset ceremony state
    this.ceremonyCameraActive = false;
    this.ceremonyPhase = null;
    
    // Clear ceremony settings
    const ceremonySettings = this.cameraSettings[this.MODES.CEREMONY];
    ceremonySettings.fighter1 = null;
    ceremonySettings.fighter2 = null;
    ceremonySettings.referee = null;
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.cleanupCeremonyMode();
    if (this.ceremonyCineBars) {
        document.body.removeChild(this.ceremonyCineBars.container);
        this.ceremonyCineBars = null;
    }
  }
} 