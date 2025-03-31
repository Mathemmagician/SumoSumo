import * as THREE from 'three';
import { RING_HEIGHT } from './constants';
import { STAGE_DURATIONS } from './constants';

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
      KNOCKOUT_SEQUENCE: 'knockoutSequence',
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
        // Timing constants (in milliseconds) - doubled for slower movement
        introduceDelay: 2000,    // Initial delay before starting introductions (2x slower)
        fighter1Time: 4000,      // Time to focus on fighter 1 (2x slower)
        fighter2Time: 4000,      // Time to focus on fighter 2 (2x slower)
        refereeTime: 4000,       // Time to focus on referee (2x slower)
        outroTime: 2000,         // Time to transition back to overview (2x slower)
        // Camera settings for close-ups
        closeupDistance: 1.0,    // How far from the face to position camera
        closeupHeight: 1.6,      // Height adjustment for close-ups
        cineBarsEnabled: true    // Whether to show cinematic bars
      },
      [this.MODES.KNOCKOUT_SEQUENCE]: {
        winner: null,
        loser: null,
        duration: 5000, // 5 seconds for the knockout sequence
        initialDelay: 0, // Brief delay before sequence begins
        behindWinnerTime: 1200, // Time to stay behind winner
        followLoserTime: 3300, // Time to follow loser flying through the air
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
    
    // For now, only allow WAITING_OVERVIEW, CEREMONY, and KNOCKOUT_SEQUENCE modes
    if (modeName !== this.MODES.CEREMONY && modeName !== this.MODES.WAITING_OVERVIEW && modeName !== this.MODES.KNOCKOUT_SEQUENCE) {
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
    
    // Add knockout mode handling
    if (this.currentMode === this.MODES.KNOCKOUT_SEQUENCE) {
      const elapsedTime = Date.now() - this.animationStartTime;
      const settings = this.cameraSettings[this.MODES.KNOCKOUT_SEQUENCE];
      this.updateKnockoutCamera(settings, elapsedTime);
      return;
    }
    
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
      case this.MODES.KNOCKOUT_SEQUENCE:
        this.updateKnockoutCamera(settings, elapsedTime);
        break;
      default:
        console.warn(`No update handler for camera mode: ${this.currentMode}`);
    }
  }
  
  /**
   * Update camera for waiting overview mode with slower motion
   * @param {Object} settings - Camera settings for this mode
   * @param {number} elapsedTime - Time elapsed since mode was set
   */
  updateWaitingOverviewCamera(settings, elapsedTime) {
    // Ensure we're not in ceremony mode
    if (this.ceremonyCameraActive) {
      this.cleanupCeremonyMode();
    }

    // Slow down the bobbing effect by halving the speed
    const slowerElapsedTime = elapsedTime * 0.5; // 2x slower
    
    // Calculate vertical bobbing
    const yOffset = Math.sin(slowerElapsedTime * settings.bobSpeed) * settings.bobAmplitude;
    
    // Set camera position with bobbing effect
    this.camera.position.copy(settings.basePosition);
    this.camera.position.y += yOffset;
    
    // Always look at the center of the ring
    this.camera.lookAt(settings.lookAt);
    this.camera.up.set(0, 1, 0); // Always maintain world-up
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
    
    // Get the total ceremony duration from constants
    const totalDuration = STAGE_DURATIONS.PRE_MATCH_CEREMONY;
    
    // Define new timing logic based on requirements
    // Using time remaining because we're counting backward from the end
    const timeRemaining = totalDuration - elapsedTime;
    

    const fightersTime = 7000;
    const perFighterTime = fightersTime / 2;
    const refereeTime = 2000;
    const totalTime = fightersTime + refereeTime;

    // Show cinematic bars for the fighter closeups and referee zoom
    if (timeRemaining <= totalTime && this.ceremonyCineBars) {
      this.ceremonyCineBars.show();
    } else if (this.ceremonyCineBars) {
      this.ceremonyCineBars.hide();
    }
    
    // Last 1 second: zoom from referee's face back to default overview
    if (timeRemaining <= refereeTime) {
      const progress = 1 - (timeRemaining / refereeTime); // 0 at start, 1 at end
      this.handleRefereeToOverviewTransition(settings, progress);
    }
    // Last 1-3 seconds: slow horizontal pan showing fighter2
    else if (timeRemaining <= refereeTime + perFighterTime) {
      const progress = (timeRemaining - refereeTime) / perFighterTime; // 1 at start, 0 at end
      this.handleFighterCloseup(settings.fighter2, settings, progress);
    }
    // Last 3-5 seconds: same camera setup for fighter1
    else if (timeRemaining <= refereeTime + fightersTime) {
      const progress = (timeRemaining - refereeTime - perFighterTime) / perFighterTime; // 1 at start, 0 at end
      this.handleFighterCloseup(settings.fighter1, settings, progress);
    }
    // Rest of the time: just do regular bobbing
    else {
      this.handleRegularBobbing(elapsedTime);
    }
    
    // If we've reached the end, exit ceremony mode
    if (elapsedTime >= totalDuration) {
      this.cleanupCeremonyMode();
      this.setMode(this.MODES.WAITING_OVERVIEW);
    }
  }
  
  /**
   * Handle the transition from referee closeup back to overview
   * @param {Object} settings - Camera settings
   * @param {number} progress - Transition progress (0-1)
   */
  handleRefereeToOverviewTransition(settings, progress) {
    const eased = this.easeOutCubic(progress);
    
    // Start position (referee closeup)
    const referee = settings.referee;
    const startPos = this.calculateRefereeCloseupPosition(referee);
    
    // End position (overview)
    const endPos = this.cameraSettings[this.MODES.WAITING_OVERVIEW].basePosition.clone();
    
    // Interpolate position
    const newPos = new THREE.Vector3().lerpVectors(startPos, endPos, eased);
    this.camera.position.copy(newPos);
    
    // Interpolate look target
    const startTarget = new THREE.Vector3(
      referee.position.x,
      referee.position.y + 1.6, // Eye level
      referee.position.z
    );
    const endTarget = this.cameraSettings[this.MODES.WAITING_OVERVIEW].lookAt.clone();
    const newTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, eased);
    
    // Look at the target
    this.camera.lookAt(newTarget);
    this.camera.up.set(0, 1, 0);
    
    // Interpolate FOV if using different FOVs
    const startFOV = 45;
    const endFOV = 75; // Default FOV
    this.camera.fov = startFOV + (endFOV - startFOV) * eased;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Calculate position for referee closeup
   * @param {Object} referee - The referee object
   * @returns {THREE.Vector3} Camera position
   */
  calculateRefereeCloseupPosition(referee) {
    // Position slightly behind and to the side of the referee
    const refPos = referee.position.clone();
    return new THREE.Vector3(
      refPos.x - 2,
      refPos.y + 1.6, // Eye level
      refPos.z + 2
    );
  }
  
  /**
   * Handle fighter closeup with horizontal panning
   * @param {Object} fighter - Fighter to focus on
   * @param {Object} settings - Camera settings
   * @param {number} progress - Progress through this phase (1 to 0)
   */
  handleFighterCloseup(fighter, settings, progress) {
    // Change FOV for cinematic effect
    this.camera.fov = 35;
    this.camera.updateProjectionMatrix();
    
    // Get fighter position
    const fighterPos = fighter.position.clone();
    const modelHeight = 1.3; // Estimate model height
    
    // Calculate camera height (slightly below eye level)
    const cameraHeight = fighterPos.y + (modelHeight * 0.9);
    
    // Calculate horizontal panning
    // Start further to one side and move across
    const horizontalRange = 0.5; // How far to pan horizontally
    const panOffset = (progress * 2 - 1) * horizontalRange; // -1 to 1 range
    
    // Set camera position for horizontal pan
    this.camera.position.set(
      fighterPos.x / 2, 
      cameraHeight,
      fighterPos.z + panOffset // Stay at a fixed distance in front
    );
    
    // Look at fighter's face
    const lookTarget = new THREE.Vector3(
      fighterPos.x,
      fighterPos.y + modelHeight, // Face level
      fighterPos.z
    );
    
    this.camera.lookAt(lookTarget);
    this.camera.up.set(0, 1, 0);

    // Show player stats during the closeup
    if (this.ceremonyCineBars) {
        // Use mock data for now - we'll replace this with real data later
        const mockStats = {
            [settings.fighter1.userData.playerId]: {
                name: "Thunder Sumo",
                rank: "S+",
                wins: 42
            },
            [settings.fighter2.userData.playerId]: {
                name: "Mountain Mover",
                rank: "A",
                wins: 28
            }
        };

        const fighterId = fighter.userData.playerId;
        const stats = mockStats[fighterId];
        
        if (stats) {
            // Show stats when closeup starts
            if (progress > 0.9) {
                this.ceremonyCineBars.showPlayerStats(stats.name, stats.rank, stats.wins);
            }
            // Hide stats when closeup is ending
            else if (progress < 0.1) {
                this.ceremonyCineBars.hidePlayerStats();
            }
        }
    }
  }
  
  /**
   * Handle regular bobbing camera for the introduction
   * @param {number} elapsedTime - Time elapsed
   */
  handleRegularBobbing(elapsedTime) {
    const overviewSettings = this.cameraSettings[this.MODES.WAITING_OVERVIEW];
    
    // Calculate vertical bobbing with slower motion
    const slowerElapsedTime = elapsedTime * 0.3; // Even slower for ceremony
    const yOffset = Math.sin(slowerElapsedTime * overviewSettings.bobSpeed) * overviewSettings.bobAmplitude;
    
    // Add slight circular motion
    const radius = 2;
    const xOffset = Math.sin(slowerElapsedTime * 0.0003) * radius;
    const zOffset = Math.cos(slowerElapsedTime * 0.0003) * radius;
    
    // Set camera position with combined effects
    this.camera.position.set(
      overviewSettings.basePosition.x + xOffset,
      overviewSettings.basePosition.y + yOffset,
      overviewSettings.basePosition.z + zOffset
    );
    
    // Always look at the center
    this.camera.lookAt(overviewSettings.lookAt);
    this.camera.up.set(0, 1, 0);
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

  /**
   * Create cinematic black bars with improved styling
   * @returns {Object} Controls for the bars
   */
  createCinematicBars() {
    const CINEMA_BAR_HEIGHT = 0.25;
    
    const container = document.createElement('div');
    container.id = 'cinematic-bars';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
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
        transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    `;

    // Add player stats container
    const statsContainer = document.createElement('div');
    statsContainer.id = 'player-stats';
    statsContainer.style.cssText = `
        position: absolute;
        color: white;
        font-family: 'Sawarabi Mincho', serif;
        font-size: 28px;
        white-space: nowrap;
        opacity: 0;
        transform: translateX(100%) scale(0.8);
        transition: all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        letter-spacing: 2px;
        padding: 0 30px;
        background: linear-gradient(90deg, 
            rgba(0,0,0,0) 0%, 
            rgba(255,255,255,0.1) 50%, 
            rgba(0,0,0,0) 100%
        );
    `;
    topBar.appendChild(statsContainer);

    const bottomBar = document.createElement('div');
    bottomBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: ${CINEMA_BAR_HEIGHT * 100}%;
        background-color: black;
        transform: translateY(100%);
        transition: transform 0.8s cubic-bezier(0.4, 0.0, 0.2, 1);
    `;

    container.appendChild(topBar);
    container.appendChild(bottomBar);
    document.body.appendChild(container);

    return {
        container,
        topBar,
        bottomBar,
        statsContainer: statsContainer,
        show() {
            container.style.opacity = '1';
            topBar.style.transform = 'translateY(0)';
            bottomBar.style.transform = 'translateY(0)';
        },
        hide() {
            container.style.opacity = '0';
            topBar.style.transform = 'translateY(-100%)';
            bottomBar.style.transform = 'translateY(100%)';
            // Hide stats when bars are hidden
            if (statsContainer) {
                statsContainer.style.opacity = '0';
                statsContainer.style.transform = 'translateX(-100%) scale(0.8)';
            }
        },
        showPlayerStats(name, rank, wins) {
            if (statsContainer) {
                statsContainer.innerHTML = `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        padding: 10px 0;
                    ">
                        <div style="
                            color: #FFD700;
                            font-size: 1.4em;
                            font-weight: bold;
                            text-shadow: 
                                0 0 10px rgba(255, 215, 0, 0.5),
                                0 0 20px rgba(255, 215, 0, 0.3);
                            transform: scale(0);
                            animation: nameReveal 0.5s forwards 0.3s;
                        ">${name}</div>

                        <div style="
                            width: 2px;
                            height: 30px;
                            background: linear-gradient(to bottom, 
                                rgba(255,255,255,0), 
                                rgba(255,255,255,0.8), 
                                rgba(255,255,255,0)
                            );
                        "></div>

                        <div style="
                            color: #ADD8E6;
                            opacity: 0;
                            animation: fadeIn 0.5s forwards 0.6s;
                        ">
                            <span style="
                                font-size: 0.8em;
                                text-transform: uppercase;
                                letter-spacing: 3px;
                                opacity: 0.8;
                            ">Rank</span><br>
                            <span style="
                                font-size: 1.2em;
                                font-weight: bold;
                                text-shadow: 0 0 10px rgba(173, 216, 230, 0.5);
                            ">${rank}</span>
                        </div>

                        <div style="
                            width: 2px;
                            height: 30px;
                            background: linear-gradient(to bottom, 
                                rgba(255,255,255,0), 
                                rgba(255,255,255,0.8), 
                                rgba(255,255,255,0)
                            );
                        "></div>

                        <div style="
                            color: #98FB98;
                            opacity: 0;
                            animation: fadeIn 0.5s forwards 0.9s;
                        ">
                            <span style="
                                font-size: 0.8em;
                                text-transform: uppercase;
                                letter-spacing: 3px;
                                opacity: 0.8;
                            ">Wins</span><br>
                            <span style="
                                font-size: 1.2em;
                                font-weight: bold;
                                text-shadow: 0 0 10px rgba(152, 251, 152, 0.5);
                            ">${wins}</span>
                        </div>
                    </div>
                `;

                // Add keyframe animations
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes nameReveal {
                        0% { transform: scale(0) rotate(-10deg); }
                        70% { transform: scale(1.2) rotate(5deg); }
                        100% { transform: scale(1) rotate(0deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);

                // Trigger main container animation
                statsContainer.style.opacity = '1';
                statsContainer.style.transform = 'translateX(0) scale(1)';
            }
        },
        hidePlayerStats() {
            if (statsContainer) {
                statsContainer.style.opacity = '0';
                statsContainer.style.transform = 'translateX(-100%) scale(0.8)';
            }
        }
    };
  }

  /**
   * Cubic ease-out function for smoother camera movement
   * @param {number} x - Input value between 0 and 1
   * @returns {number} Eased value
   */
  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  
  /**
   * Cubic ease-in function
   * @param {number} x - Input value between 0 and 1
   * @returns {number} Eased value
   */
  easeInCubic(x) {
    return x * x * x;
  }
  
  /**
   * Cubic ease-in-out function
   * @param {number} x - Input value between 0 and 1
   * @returns {number} Eased value
   */
  easeInOutCubic(x) {
    return x < 0.5 
      ? 4 * x * x * x 
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  /**
   * Start the knockout camera sequence
   * @param {Object} winner - The winning fighter
   * @param {Object} loser - The losing fighter
   */
  startKnockoutSequence(winner, loser) {
    // Don't start a new sequence if one is already running
    if (this.currentMode === this.MODES.KNOCKOUT_SEQUENCE) {
      return;
    }
    
    const settings = this.cameraSettings[this.MODES.KNOCKOUT_SEQUENCE];
    settings.winner = winner;
    settings.loser = loser;
    
    // Store original camera position for later restoration
    this._preKnockoutPosition = this.camera.position.clone();
    this._preKnockoutTarget = this.getTargetFromCamera();
    
    // Set the knockback mode
    this.setMode(this.MODES.KNOCKOUT_SEQUENCE);
    
    // Optional: Show cinematic bars for knockout
    if (this.ceremonyCineBars) {
      this.ceremonyCineBars.show();
    }
    
    // Reset animation start time
    this.animationStartTime = Date.now();
    
    console.log("Starting knockout camera sequence");
  }

  /**
   * Clean up knockout sequence resources and reset state
   */
  cleanupKnockoutSequence() {
    // Hide cinematic bars if they exist
    if (this.ceremonyCineBars) {
      this.ceremonyCineBars.hide();
    }
    
    // Reset knockout settings
    const knockoutSettings = this.cameraSettings[this.MODES.KNOCKOUT_SEQUENCE];
    knockoutSettings.winner = null;
    knockoutSettings.loser = null;
  }

  /**
   * Update camera for knockout sequence
   * @param {Object} settings - Camera settings for this mode
   * @param {number} elapsedTime - Time elapsed since mode was set
   */
  updateKnockoutCamera(settings, elapsedTime) {
    // Early exit if we don't have required participants
    if (!settings.winner || !settings.loser) {
      console.warn('Knockout sequence is missing participants, falling back to overview');
      this.cleanupKnockoutSequence();
      this.setMode(this.MODES.WAITING_OVERVIEW);
      return;
    }
    
    // If the sequence is complete, return to overview
    if (elapsedTime >= settings.duration) {
      this.cleanupKnockoutSequence();
      this.setMode(this.MODES.WAITING_OVERVIEW);
      return;
    }
    
    // Wait for initial delay before starting the sequence
    if (elapsedTime < settings.initialDelay) {
      return;
    }
    
    const activeTime = elapsedTime - settings.initialDelay;
    
    // Phase 1: Position behind winner looking at loser
    if (activeTime < settings.behindWinnerTime) {
      const progress = activeTime / settings.behindWinnerTime;
      this.updateBehindWinnerCamera(settings, progress);
    } 
    // Phase 2: Follow loser flying through the air
    else if (activeTime < settings.behindWinnerTime + settings.followLoserTime) {
      const progress = (activeTime - settings.behindWinnerTime) / settings.followLoserTime;
      this.updateFollowLoserCamera(settings, progress);
    }
  }

  /**
   * Position camera behind winner looking at loser
   * @param {Object} settings - Knockout camera settings
   * @param {number} progress - Progress through this phase (0-1)
   */
  updateBehindWinnerCamera(settings, progress) {
    const winner = settings.winner;
    const loser = settings.loser;
    
    if (!winner || !loser) return;
    
    // Get positions
    const winnerPos = winner.position.clone();
    const loserPos = loser.position.clone();
    
    // Calculate direction from winner to loser
    const direction = new THREE.Vector3().subVectors(loserPos, winnerPos).normalize();
    
    // Position camera behind winner
    const offset = 4; // Distance behind winner
    const height = 2; // Height above ground
    
    // Calculate camera position - behind winner, facing loser
    const cameraPos = new THREE.Vector3(
      winnerPos.x - direction.x * offset,
      winnerPos.y + height,
      winnerPos.z - direction.z * offset
    );
    
    // Smoothly move camera to this position
    const eased = this.easeOutCubic(progress);
    this.camera.position.lerp(cameraPos, eased);
    
    // Calculate look target (loser position with some height adjustment)
    const lookTarget = new THREE.Vector3(
      loserPos.x,
      loserPos.y + 1.5, // Look at loser's upper body
      loserPos.z
    );
    
    // Look at the loser
    this.camera.lookAt(lookTarget);
    this.camera.up.set(0, 1, 0);
    
    // Change FOV for more dramatic effect
    this.camera.fov = 50 - progress * 10; // Gradually zoom in
    this.camera.updateProjectionMatrix();
  }

  /**
   * Follow loser flying through the air
   * @param {Object} settings - Knockout camera settings
   * @param {number} progress - Progress through this phase (0-1)
   */
  updateFollowLoserCamera(settings, progress) {
    const winner = settings.winner;
    const loser = settings.loser;
    if (!winner || !loser) return;
    
    // Get positions
    const winnerPos = winner.position.clone();
    const loserPos = loser.position.clone();
    
    // Calculate direction from winner to loser
    const direction = new THREE.Vector3().subVectors(loserPos, winnerPos).normalize();
    
    // Position camera in an over-the-shoulder perspective from winner
    const shoulderOffset = 1.5; // Distance to the side of the winner
    const heightOffset = 2.0;   // Height above the winner
    const backOffset = 2.0;     // Distance behind the winner
    
    // Position camera over winner's shoulder - maintain this position throughout
    const cameraPos = new THREE.Vector3(
      winnerPos.x + (direction.z * shoulderOffset) - (direction.x * backOffset),
      winnerPos.y + heightOffset,
      winnerPos.z - (direction.x * shoulderOffset) - (direction.z * backOffset)
    );
    
    // Apply subtle cinematic motion to the camera (slight shake decreasing over time)
    const shakeMagnitude = 0.05 * (1 - progress);
    cameraPos.x += (Math.random() - 0.5) * shakeMagnitude;
    cameraPos.y += (Math.random() - 0.5) * shakeMagnitude;
    cameraPos.z += (Math.random() - 0.5) * shakeMagnitude;
    
    // Set camera position
    this.camera.position.copy(cameraPos);
    
    // Look target is always at the loser as they fly away
    const lookTarget = new THREE.Vector3(
      loserPos.x,
      loserPos.y + 1.0, // Look at loser's upper body
      loserPos.z
    );
    
    // Look at target
    this.camera.lookAt(lookTarget);
    this.camera.up.set(0, 1, 0);
    
    // Slightly adjust FOV for more dramatic effect as loser flies away
    this.camera.fov = 45 + progress * 10; // 45 to 55, less dramatic change
    this.camera.updateProjectionMatrix();
  }
} 