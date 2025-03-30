import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { StadiumFactory } from "./models";
import { socketClient } from "./socket-client";
import {
  RING_RADIUS,
  RING_HEIGHT,
  FIRST_ROW_DISTANCE,
  SEATS_PER_FIRST_ROW,
  SEATS_INCREMENT,
  ELEVATION_INCREMENT,
  ROW_SPACING,
  CAMERA_MOVE_SPEED,
  CAMERA_ROTATE_SPEED,
  BENCH_WIDTH,
  BENCH_HEIGHT,
} from "./constants";
import { ModelFactory } from "./models";
import { CameraSystem } from './camera-system';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// First, update the VIEWER_ANIMATION constants with additional properties for excited state
const VIEWER_ANIMATION = {
  BOB_AMPLITUDE: 0.05,           // Normal bobbing height
  BOB_FREQUENCY: 0.0025,         // Normal bobbing speed
  EXCITED_AMPLITUDE: 0.1,        // 2x amplitude when excited (match end)
  EXCITED_FREQUENCY: 0.005,      // 2x frequency when excited
  PHASE_VARIATION: 0.5,          // Random phase offset to prevent viewers from bobbing in sync
  FREQUENCY_VARIATION: 0.3,      // Small random variation in bobbing speed
  TRANSITION_DURATION: 1000      // Time in ms to transition between normal and excited states
};

export class Renderer {
  constructor() {
    console.log("Renderer constructor called");
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stadium = null;
    this.controls = null;
    this.cameraSystem = null; // Initialize as null, we'll create it later

    // FPS counter variables
    this.frameCount = 0;
    this.fps = 0;
    this.fpsUpdateInterval = 500; // Update FPS every 500ms
    this.lastFpsUpdate = 0;

    // Add these new properties for camera control
    this.isFreeCamera = false;
    this.cameraMovement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      rotateLeft: false,
      rotateRight: false
    };

    // Add fighter movement state
    this.fighterMovement = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // Bind methods
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    // Bind additional methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.toggleFreeCamera = this.toggleFreeCamera.bind(this);
    this.handleFighterKeyDown = this.handleFighterKeyDown.bind(this);
    this.handleFighterKeyUp = this.handleFighterKeyUp.bind(this);
    this.updateFighterMovement = this.updateFighterMovement.bind(this);

    // Add ModelFactory instance
    this.modelFactory = new ModelFactory(/* pass face textures if needed */);

    // Add a Map to store player models
    this.playerModels = new Map();

    // Add map to store active text bubbles
    this.textBubbles = new Map();

    // Add CSS2D renderer
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(this.labelRenderer.domElement);
  }

  async initialize() {
    console.log("Initializing renderer");

    // Initialize ModelFactory first
    await this.modelFactory.initialize();
    
    // Check if running on mobile
    this.isMobile = this.checkIsMobile();
    console.log("Mobile device detected:", this.isMobile);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    console.log("Scene created");

    // Create camera with adjusted field of view for mobile
    const fov = this.isMobile ? 45 : 75; // Wider FOV on mobile
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-15, 15, 15);
    this.camera.lookAt(0, 0, 0);
    console.log("Camera created and positioned");

    // Create renderer with mobile optimizations if needed
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile, // Disable antialiasing on mobile for better performance
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Performance optimizations
    this.renderer.shadowMap.enabled = false; // Disable shadows
    // this.renderer.shadowMap.enabled = !this.isMobile; // Disable shadows on mobile
    if (this.isMobile) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Limit pixel ratio on mobile
    }
    
    // Enable frustum culling for better performance
    this.camera.frustumCulled = true;

    // Add renderer to DOM
    const container = document.createElement("div");
    container.id = "canvas-container";
    document.body.appendChild(container);
    container.appendChild(this.renderer.domElement);
    console.log("Renderer created and added to DOM");

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Add smooth damping
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    this.controls.maxPolarAngle = Math.PI / 2;
    console.log("Orbit controls initialized");

    // Set up lighting
    this.setupLighting();
    console.log("Lighting setup complete");

    // // Create test cube to verify rendering
    // const geometry = new THREE.BoxGeometry(5, 5, 5);
    // const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.scene.add(cube);
    // console.log('Test cube added');

    // Create the complete stadium (includes ring)
    this.createStadium();
    console.log("Stadium created");

    // Create FPS display and stats container (always create it, visibility controlled by UI)
    this.createFpsDisplay();
    
    // Ensure stats container is hidden by default
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
        statsContainer.style.display = 'none';
    }

    // Start a timer to update the game state debug info every 100ms
    this.startGameStateUpdateTimer();
    console.log("Game state update timer started");

    // Add event listeners
    window.addEventListener("resize", this.onWindowResize);
    // Add keyboard event listeners
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("keydown", this.handleFighterKeyDown);
    window.addEventListener("keyup", this.handleFighterKeyUp);

    // Listen for free camera toggle from UI Manager
    document.addEventListener("freeCameraToggled", (event) => {
      this.toggleFreeCamera(event.detail.enabled);
    });

    // Set up more comprehensive socket event listeners for player updates
    this.setupSocketEventListeners();
    
    // Process initial game state (if available)
    if (socketClient.gameState) {
      console.log("Processing initial game state");
      this.updatePlayers(socketClient.gameState);
    }

    // Now initialize the camera system after scene, camera and renderer are created
    this.cameraSystem = new CameraSystem(this.scene, this.camera, this.renderer);
    console.log("Camera system initialized");

    // Start animation loop
    this.lastFpsUpdate = performance.now();
    console.log("Starting animation loop");
    this.animate();
  }

  // Add FPS display with socket stats
  createFpsDisplay() {
    const statsContainer = document.createElement("div");
    statsContainer.id = "stats-container";
    statsContainer.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background-color: rgba(0, 0, 0, 0.5);
      color: white;
      font-family: monospace;
      font-size: 14px;
      padding: 5px 10px;
      border-radius: 4px;
      z-index: 1000;
    `;

    const fpsDiv = document.createElement("div");
    fpsDiv.id = "fps-counter";
    fpsDiv.textContent = "0 FPS";

    // Socket stats toggle
    const socketToggleButton = document.createElement("button");
    socketToggleButton.textContent = "▼ Socket Stats";
    socketToggleButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-family: monospace;
      font-size: 14px;
      padding: 2px 0;
      cursor: pointer;
      width: 100%;
      text-align: left;
      margin: 5px 0;
    `;

    const socketStatsDiv = document.createElement("div");
    socketStatsDiv.id = "socket-stats";
    socketStatsDiv.style.display = "none"; // Hidden by default

    // Game state toggle
    const gameStateToggleButton = document.createElement("button");
    gameStateToggleButton.textContent = "▼ Game State";
    gameStateToggleButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-family: monospace;
      font-size: 14px;
      padding: 2px 0;
      cursor: pointer;
      width: 100%;
      text-align: left;
      margin: 5px 0;
    `;

    const gameStateDiv = document.createElement("div");
    gameStateDiv.id = "game-state-debug";
    gameStateDiv.style.display = "none"; // Hidden by default

    statsContainer.appendChild(fpsDiv);
    statsContainer.appendChild(socketToggleButton);
    statsContainer.appendChild(socketStatsDiv);
    statsContainer.appendChild(gameStateToggleButton);
    statsContainer.appendChild(gameStateDiv);
    document.body.appendChild(statsContainer);

    // Toggle socket stats visibility
    let isSocketStatsExpanded = false;
    socketToggleButton.addEventListener("click", () => {
      isSocketStatsExpanded = !isSocketStatsExpanded;
      socketStatsDiv.style.display = isSocketStatsExpanded ? "block" : "none";
      socketToggleButton.textContent =
        (isSocketStatsExpanded ? "▼" : "►") + " Socket Stats";
    });

    // Toggle game state visibility
    let isGameStateExpanded = false;
    gameStateToggleButton.addEventListener("click", () => {
      isGameStateExpanded = !isGameStateExpanded;
      gameStateDiv.style.display = isGameStateExpanded ? "block" : "none";
      gameStateToggleButton.textContent =
        (isGameStateExpanded ? "▼" : "►") + " Game State";
    });

    // Listen for socket stats updates
    socketClient.on("socketStatsUpdated", (stats) => {
      this.updateSocketStats(stats);
    });

    // Listen for game state updates
    socketClient.on("gameStateUpdated", (gameState) => {
      this.updateGameStateDebug(gameState);
    });
  }

  // Update the socket stats display
  updateSocketStats(stats) {
    const statsDiv = document.getElementById("socket-stats");
    if (!statsDiv) return;

    let html = "";
    Object.entries(stats).forEach(([event, count]) => {
      html += `${event}: ${count}<br>`;
    });
    statsDiv.innerHTML = html;
  }

  // Update the game state debug display
  updateGameStateDebug(gameState) {
    const gameStateDiv = document.getElementById("game-state-debug");
    if (!gameStateDiv) return;

    let html = `
      <b>Current Stage:</b> ${gameState.stage}<br>
      <b>My Role:</b> ${gameState.myRole}<br>
      <b>My ID:</b> ${gameState.myId?.substring(0, 6) || "None"}<br>
      <b>Players:</b><br>
    `;

    // Add fighters (filtered to exclude NPCs)
    const realFighters = gameState.fighters.filter(
      fighter => !fighter.id.startsWith('npc-') && !fighter.id.startsWith('fake-')
    );
    html += "  <b>Fighters:</b> " + realFighters.length + "<br>";
    realFighters.forEach((fighter) => {
      html += `  • ${fighter.id.substring(0, 6)} (pos: ${Math.round(
        fighter.position?.x || 0
      )},${Math.round(fighter.position?.z || 0)})<br>`;
    });

    // Add referee (only if not an NPC)
    const referee = gameState.referee && 
                   !gameState.referee.id.startsWith('npc-') && 
                   !gameState.referee.id.startsWith('fake-') ? 
                   gameState.referee : null;
    
    html += "  <b>Referee:</b> " + (referee ? "1" : "0") + "<br>";
    if (referee) {
      html += `  • ${referee.id.substring(0, 6)}<br>`;
    }

    // Add viewers (filtered to exclude NPCs)
    const realViewers = gameState.viewers.filter(
      viewer => !viewer.id.startsWith('npc-') && !viewer.id.startsWith('fake-')
    );
    html += "  <b>Viewers:</b> " + realViewers.length + "<br>";
    realViewers.forEach((viewer) => {
      html += `  • ${viewer.id.substring(0, 6)}<br>`;
    });

    gameStateDiv.innerHTML = html;
  }

  setupLighting() {
    // Increase ambient light intensity
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Increased from 0.6 to 0.8
    this.scene.add(ambientLight);

    // Main spotlight with increased intensity
    const mainSpotlight = new THREE.SpotLight(0xffffff, 2.0); // Increased from 1.5 to 2.0
    mainSpotlight.position.set(0, 30, 0);
    mainSpotlight.angle = Math.PI / 5.5;
    mainSpotlight.penumbra = 0.3;
    mainSpotlight.decay = 1.5;
    mainSpotlight.distance = 60;

    mainSpotlight.castShadow = true;
    mainSpotlight.shadow.mapSize.width = 2048;
    mainSpotlight.shadow.mapSize.height = 2048;
    mainSpotlight.shadow.camera.near = 10;
    mainSpotlight.shadow.camera.far = 60;
    mainSpotlight.shadow.bias = -0.0003;
    mainSpotlight.shadow.normalBias = 0.01;

    mainSpotlight.target.position.set(0, 0, 0);
    this.scene.add(mainSpotlight);
    this.scene.add(mainSpotlight.target);

    // Add a front-facing fill light
    const fillLight = new THREE.DirectionalLight(0xffeedd, 1.2); // Increased intensity
    fillLight.position.set(0, 10, 20); // Positioned more in front
    fillLight.castShadow = true;
    this.scene.add(fillLight);

    // Add a back light to highlight the model's edges
    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(5, 5, 20);
    this.scene.add(backLight);
  }

  createStadium() {
    // Create complete stadium using the factory with a fixed number of 20 rows
    const stadium = StadiumFactory.createCompleteStadium(
      RING_RADIUS,
      RING_HEIGHT,
      {
        seatsPerFirstRow: SEATS_PER_FIRST_ROW,
        firstRowDistance: FIRST_ROW_DISTANCE,
        seatsIncrement: SEATS_INCREMENT,
        rowSpacing: ROW_SPACING,
        elevationIncrement: ELEVATION_INCREMENT,
      },
      20 // Fixed number of rows
    );

    this.scene.add(stadium);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Add CSS2D renderer resize
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Update FPS counter
    const currentTime = performance.now();
    this.frameCount++;

    // Update FPS counter every 500ms
    if (currentTime - this.lastFpsUpdate > this.fpsUpdateInterval) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastFpsUpdate)
      );
      const fpsCounter = document.getElementById("fps-counter");
      if (fpsCounter) {
        fpsCounter.textContent = `${this.fps} FPS`;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }

    // Handle camera movement if free camera is enabled
    if (this.isFreeCamera) {
      this.updateCameraPosition();
    } else if (this.cameraSystem) {
      this.cameraSystem.update();
    }

    // Update fighter movement
    this.updateFighterMovement();

    // Log first frame render
    if (!this._hasLoggedFirstFrame) {
      console.log("First frame rendering");
      this._hasLoggedFirstFrame = true;
    }

    // Update text bubble positions to follow players
    this.textBubbles.forEach((bubble) => {
      if (bubble.sprite && bubble.playerModel) {
        const playerPosition = new THREE.Vector3();
        bubble.playerModel.getWorldPosition(playerPosition);
        bubble.sprite.position.copy(playerPosition);
        bubble.sprite.position.y += 2.0; // Match the new modelHeight

        // Make sprite face camera
        bubble.sprite.quaternion.copy(this.camera.quaternion);
      }
    });

    // Update viewer bobbing animations
    this.updateViewerAnimations();

    // Add CSS2D renderer render call before the main render
    this.labelRenderer.render(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  // Add free camera toggle
  toggleFreeCamera(enabled) {
    console.log("Toggling free camera:", enabled);
    this.isFreeCamera = enabled;
    
    if (enabled) {
      // Store original camera parameters
      this.originalCameraPosition = this.camera.position.clone();
      this.originalCameraRotation = this.camera.rotation.clone();
      
      // Initialize camera movement state
      this.movementSpeed = 0.5;
      this.cameraMovement = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
      };
      
      // Set up keyboard event listeners
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      document.addEventListener('keyup', this.handleKeyUp.bind(this));
      
      // Enable free camera controls
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.body.requestPointerLock();
    } else {
      // Disable free camera controls
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      document.removeEventListener('keyup', this.handleKeyUp.bind(this));
      document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
      
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock();
      }
      
      // Let the camera system take control again
      this.updateCameraForGameState(socketClient.gameState);
    }
  }

  // Handle key down events for camera control
  handleKeyDown(event) {
    if (!this.isFreeCamera) return;

    switch (event.key.toLowerCase()) {
      case "w":
        this.cameraMovement.forward = true;
        break;
      case "s":
        this.cameraMovement.backward = true;
        break;
      case "a":
        this.cameraMovement.left = true;
        break;
      case "d":
        this.cameraMovement.right = true;
        break;
      case "arrowup":
        this.cameraMovement.up = true;
        break;
      case "arrowdown":
        this.cameraMovement.down = true;
        break;
      case "arrowleft":
        this.cameraMovement.rotateLeft = true;
        break;
      case "arrowright":
        this.cameraMovement.rotateRight = true;
        break;
    }
  }

  // Handle key up events for camera control
  handleKeyUp(event) {
    if (!this.isFreeCamera) return;

    switch (event.key.toLowerCase()) {
      case "w":
        this.cameraMovement.forward = false;
        break;
      case "s":
        this.cameraMovement.backward = false;
        break;
      case "a":
        this.cameraMovement.left = false;
        break;
      case "d":
        this.cameraMovement.right = false;
        break;
      case "arrowup":
        this.cameraMovement.up = false;
        break;
      case "arrowdown":
        this.cameraMovement.down = false;
        break;
      case "arrowleft":
        this.cameraMovement.rotateLeft = false;
        break;
      case "arrowright":
        this.cameraMovement.rotateRight = false;
        break;
    }
  }

  // Update the camera movement method
  updateCameraPosition() {
    // Get camera's forward direction (excluding y component for level movement)
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0; // Keep movement level
    direction.normalize();

    // Get right vector by crossing forward with up
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();

    // Forward/backward movement along camera's direction
    if (this.cameraMovement.forward) {
      this.camera.position.addScaledVector(direction, CAMERA_MOVE_SPEED);
    }
    if (this.cameraMovement.backward) {
      this.camera.position.addScaledVector(direction, -CAMERA_MOVE_SPEED);
    }

    // Left/right movement (strafe)
    if (this.cameraMovement.left) {
      this.camera.position.addScaledVector(right, -CAMERA_MOVE_SPEED);
    }
    if (this.cameraMovement.right) {
      this.camera.position.addScaledVector(right, CAMERA_MOVE_SPEED);
    }

    // Up/down movement
    if (this.cameraMovement.up) {
      this.camera.position.y += CAMERA_MOVE_SPEED;
    }
    if (this.cameraMovement.down) {
      this.camera.position.y -= CAMERA_MOVE_SPEED;
    }

    // Rotation (arrow keys) - using 3x faster rotation speed
    if (this.cameraMovement.rotateLeft || this.cameraMovement.rotateRight) {
      const rotationAngle = (CAMERA_ROTATE_SPEED * 3) * 
        (this.cameraMovement.rotateLeft ? 1 : -1);
      
      // Create rotation matrix around world Y axis
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeRotationY(rotationAngle);
      
      // Apply rotation to camera direction
      direction.applyMatrix4(rotationMatrix);
      
      // Update camera look direction
      const target = new THREE.Vector3();
      target.copy(this.camera.position).add(direction);
      this.camera.lookAt(target);
    }
  }

  setupSocketEventListeners() {
    // Main game state update
    socketClient.on("gameStateUpdated", (gameState) => {
      console.log("Game state updated:", gameState);
      // Update camera for the new game state
      this.updateCameraForGameState(gameState);
      
      // Always force a complete update when receiving game state
      this.updatePlayers(gameState);
    });

    // Individual player updates
    socketClient.on("playerMoved", (data) => {
      console.log("Renderer received playerMoved:", data);
      this.updatePlayerPosition(data);
    });

    // Player removals
    socketClient.on("playerLeft", (playerId) => {
      console.log("Renderer received playerLeft:", playerId);
      this.removePlayer(playerId);
    });

    // Role changes
    socketClient.on("playerRoleChanged", (data) => {
      console.log("Renderer received playerRoleChanged:", data);
      this.handlePlayerRoleChanged(data);
    });

    // Fighter selection events
    socketClient.on("fightersSelected", (data) => {
      console.log("Renderer received fightersSelected:", data);
      this.updateFightersAndReferee(data);
    });

    // Match stage transitions
    socketClient.on("matchStart", (data) => {
      console.log("Renderer received matchStart:", data);
      // Ensure fighters are in correct positions
      if (data.fighters && data.fighters.length) {
        data.fighters.forEach((fighter) => this.updateOrCreatePlayer(fighter));
      }
    });

    // Handle new referee assignments
    socketClient.on("newReferee", (referee) => {
      console.log("Renderer received newReferee:", referee);
      this.updateOrCreatePlayer(referee);
    });

    // Handle pre-ceremony positioning
    socketClient.on("preCeremonyStart", (data) => {
      console.log("Pre-ceremony started:", data);
      // Set camera to ceremony mode
      if (socketClient.gameState.fighters.length === 2 && socketClient.gameState.referee) {
        const fighter1Model = this.playerModels.get(socketClient.gameState.fighters[0].id);
        const fighter2Model = this.playerModels.get(socketClient.gameState.fighters[1].id);
        const refereeModel = this.playerModels.get(socketClient.gameState.referee.id);
        
        if (fighter1Model && fighter2Model && refereeModel) {
          console.log("Setting ceremony camera mode for pre-ceremony");
          this.cameraSystem.setMode(this.cameraSystem.MODES.CEREMONY, {
            fighter1: fighter1Model,
            fighter2: fighter2Model,
            referee: refereeModel
          });
        }
      }
    });

    // Add specific handler for game state reset
    socketClient.on("gameStateReset", (data) => {
      console.log("Renderer received gameStateReset:", data);
      
      // Force complete update of all player models
      this.updatePlayers(socketClient.gameState);
      
      // Optional: move camera to a good viewing position
      if (this.isFreeCamera === false) {
        this.resetCameraPosition();
      }
    });

    // Add specific handler for player joined events
    socketClient.on("playerJoined", (player) => {
      console.log("Renderer received playerJoined:", player);
      
      // For viewers, we need to assign a seat position if they don't have one
      if (player.role === "viewer" && 
          (!player.position || player.position === null)) {
        // Generate a full game state update to trigger proper seat assignment
        this.updatePlayers(socketClient.gameState);
      } else {
        // For fighters and referees, we can directly create/update the model
        this.updateOrCreatePlayer(player);
      }
    });

    // Update emote handler to match socket data structure
    socketClient.on("playerEmote", (data) => {
      // console.log("Renderer received playerEmote:", data);
      // Check the actual data structure
      const emoteText = data.emote || data.type || data;
      if (typeof emoteText === 'string' && emoteText.length > 0) {
        // console.log("Creating emote bubble for", data.id || data.playerId, "with text:", emoteText);
        this.createTextBubble(data.id || data.playerId, emoteText, true);
      }
    });

    // Update message handler to match socket data structure
    socketClient.on("playerMessage", (data) => {
      // console.log("Renderer received playerMessage:", data);
      // Check the actual data structure
      const messageText = data.message || data.text || data;
      if (typeof messageText === 'string' && messageText.length > 0) {
        // console.log("Creating message bubble for", data.id || data.playerId, "with text:", messageText);
        this.createTextBubble(data.id || data.playerId, messageText, false);
      }
    });

    // Listen for stage changes
    socketClient.on("stageChanged", (data) => {
      console.log("Stage changed to:", data.stage);

      // Calculate seconds for display
      const seconds = Math.ceil(data.duration / 1000);
      
      // Update the UI with both the display name and the seconds
      uiManager.updateMatchStatus(data.displayName, seconds);
      
      // Reset fighter movement if stage is not MATCH_IN_PROGRESS
      if (data.stage !== 'MATCH_IN_PROGRESS') {
        this.resetFighterMovement();
      }
      
      // When match ends and victory ceremony begins, make viewers excited
      if (data.stage === "VICTORY_CEREMONY") {
        console.log("Victory ceremony started, viewers getting excited!");
        this.setViewersExcitedState(true);
      } 
      // When post-match cooldown starts, return to normal
      else if (data.stage === "POST_MATCH_COOLDOWN") {
        console.log("Post-match cooldown started, viewers calming down");
        this.setViewersExcitedState(false);
      }
    });

    // Handle match end - trigger excitement immediately when match ends
    socketClient.on("matchEnd", (data) => {
      console.log("Match ended, winner:", data.winnerId, "loser:", data.loserId);
      
      // Extract winner and loser objects from the scene
      const winnerId = data.winnerId;
      const loserId = data.loserId;
      
      // Find the 3D objects for these players
      const winnerObject = this.scene.getObjectByName(`player-${winnerId}`);
      const loserObject = this.scene.getObjectByName(`player-${loserId}`);
      
      // Store loser's current position for the camera tracking
      if (loserObject) {
        loserObject.previousPosition = loserObject.position.clone();
      }
      
      // If we have both objects, trigger the knockout camera sequence
      if (winnerObject && loserObject) {
        this.cameraSystem.startKnockoutSequence(winnerObject, loserObject);
      }
      
      // Animate the loser falling
      this.animateFighterFall(loserId);
      
      // Reset fighter movement state to prevent continued movement after match
      this.resetFighterMovement();
      
      // Set viewers to excited state immediately when match ends
      console.log("Match ended, viewers getting excited!");
      this.setViewersExcitedState(true);
    });
  }

  // Add a new method to handle player role changes
  handlePlayerRoleChanged(data) {
    const { id, role } = data;

    // Get the current game state
    const gameState = socketClient.gameState;

    // Find the player in the game state
    let player = null;
    if (role === "fighter") {
      player = gameState.fighters.find((f) => f.id === id);
    } else if (role === "referee") {
      player = gameState.referee;
    } else {
      player = gameState.viewers.find((v) => v.id === id);
    }

    // If we found the player, update or recreate their model
    if (player) {
      // If the player already has a model, remove it first
      if (this.playerModels.has(id)) {
        this.removePlayer(id);
      }

      // Create a new model with the correct role
      this.updateOrCreatePlayer(player);
    }
  }

  // Add a method to specifically handle fighter and referee selection
  updateFightersAndReferee(data) {
    // Update fighter models
    if (data.fighter1) {
      this.updateOrCreatePlayer(data.fighter1);
    }

    if (data.fighter2) {
      this.updateOrCreatePlayer(data.fighter2);
    }

    // Update referee model
    if (data.referee) {
      this.updateOrCreatePlayer(data.referee);
    }
  }

  updatePlayers(gameState) {
    console.log("Updating players with gameState:", gameState);

    // Don't proceed if game state is not valid
    if (!gameState) {
      console.warn("Invalid game state received");
      return;
    }

    // Process fighters
    const fighters = gameState.fighters || [];
    // Process referee
    const referee = gameState.referee;
    // Process viewers
    const viewers = gameState.viewers || [];

    // Create sets of current player IDs for efficient tracking
    const currentFighterIds = new Set(fighters.map((f) => f.id));
    const currentViewerIds = new Set(viewers.map((v) => v.id));
    const currentRefereeId = referee ? referee.id : null;

    // Track all current player IDs
    const allCurrentIds = new Set([
      ...currentFighterIds,
      ...currentViewerIds,
      ...(currentRefereeId ? [currentRefereeId] : []),
    ]);

    // First, check for newly added viewers that need seat assignments
    const newViewersNeedingSeats = viewers.filter(viewer => 
      !this.playerModels.has(viewer.id) && 
      (!viewer.position || viewer.position === null)
    );
    
    if (newViewersNeedingSeats.length > 0) {
      console.log(`Found ${newViewersNeedingSeats.length} new viewers needing seat assignments`);
    }

    // Remove players that no longer exist
    for (const [playerId, model] of this.playerModels.entries()) {
      if (!allCurrentIds.has(playerId)) {
        console.log("Removing player that no longer exists:", playerId);
        this.removePlayer(playerId);
      }
    }

    // Process fighters
    fighters.forEach((fighter) => {
      console.log("Processing fighter:", fighter);
      this.updateOrCreatePlayer(fighter);
    });

    // Process referee
    if (referee) {
      console.log("Processing referee:", referee);
      this.updateOrCreatePlayer(referee);
    }

    // Update or add viewers - PLACE THEM ON ACTUAL SEATS IN THE ARENA
    if (viewers && viewers.length) {
      // Get seat positions from the stadium
      const seatPositions = this.getStadiumSeatPositions();
      
      // Get all seats (no restriction based on position)
      const allSeats = seatPositions;
      
      // Get only seats that are good for real users (not south side)
      const realUserSeats = seatPositions.filter(seat => seat.forRealUsers);
      
      // Track which seats are already occupied
      const occupiedSeats = new Set();
      
      // Process each viewer
      viewers.forEach((viewer) => {
        // Clone viewer object to avoid modifying the original game state
        const viewerWithPosition = { ...viewer };
        
        // Check if position needs to be assigned
        if (
          !viewerWithPosition.position ||
          viewerWithPosition.position === null || 
          (viewerWithPosition.position.x === 0 &&
           viewerWithPosition.position.z === 0)
        ) {
          // Determine if this is a real user or an NPC/fake user
          const isNpc = viewer.id.startsWith('npc-') || viewer.id.startsWith('fake-');
          
          // For NPCs, use all seats. For real users, use only seats that are good for viewing.
          const eligibleSeats = isNpc ? allSeats : realUserSeats;
          
          // Determine seat based on player.seed if available, otherwise use player ID
          let seatIndex;
          
          if (viewer.seed !== undefined) {
            // Use the player's seed to determine seat
            seatIndex = Math.abs(viewer.seed) % eligibleSeats.length;
          } else {
            // Generate a deterministic seat index from player ID
            const idSum = viewer.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            seatIndex = idSum % eligibleSeats.length;
          }
          
          // If this seat is occupied, find the next available one
          let attempts = 0;
          const maxAttempts = eligibleSeats.length; // Only try each seat once at most
          
          while (occupiedSeats.has(seatIndex) && attempts < maxAttempts) {
            seatIndex = (seatIndex + 1) % eligibleSeats.length;
            attempts++;
          }
          
          // Mark this seat as occupied
          occupiedSeats.add(seatIndex);
          
          // Get the seat position
          const seatPos = eligibleSeats[seatIndex];
          
          viewerWithPosition.position = {
            x: seatPos.x,
            y: seatPos.y,
            z: seatPos.z,
          };
          
          // Set rotation to face the ring
          viewerWithPosition.rotation = seatPos.rotation;
          
          console.log(`Placed ${isNpc ? 'NPC' : 'user'} ${viewer.id} at ${seatPos.side} side, row ${seatPos.row}, seat ${seatPos.seatIndex}`);
        }
        
        console.log("Processing viewer:", viewerWithPosition);
        this.updateOrCreatePlayer(viewerWithPosition);
      });
    }

    console.log(`Total player models after update: ${this.playerModels.size}`);
  }

  // Helper method to get stadium seat positions with improved placement logic
  getStadiumSeatPositions() {
    // Create an array to store seat positions
    const positions = [];
    
    // Parameters based on StadiumFactory constants from constants.js
    const firstRowDistance = FIRST_ROW_DISTANCE;
    const rowSpacing = ROW_SPACING;
    const seatsPerFirstRow = SEATS_PER_FIRST_ROW;
    const seatsIncrement = SEATS_INCREMENT;
    const elevationIncrement = ELEVATION_INCREMENT;
    const benchWidth = BENCH_WIDTH;
    const benchHeight = BENCH_HEIGHT;
    
    // Set a proper height offset for viewers based on the model scale
    const MODEL_HEIGHT_ABOVE_SEAT = 1.5; // This will make viewers sit properly above the bench
    
    // We'll focus on the first few rows
    const maxRows = 8;
    
    // Define the sides of the stadium
    const sideData = [
      { name: 'North', rotation: 0, x: 0, z: -1, forRealUsers: true },
      { name: 'East', rotation: -Math.PI / 2, x: 1, z: 0, forRealUsers: true },
      { name: 'West', rotation: Math.PI / 2, x: -1, z: 0, forRealUsers: true },
      { name: 'South', rotation: Math.PI, x: 0, z: 1, forRealUsers: false } // South side is not good for real users
    ];
    
    // For each side of the stadium
    sideData.forEach(side => {
      for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
        // Calculate row properties
        const distance = firstRowDistance + (rowIndex * rowSpacing);
        const seatsInRow = seatsPerFirstRow + (rowIndex * seatsIncrement);
        const elevationLevel = Math.floor(rowIndex / 2);
        const elevation = elevationLevel * elevationIncrement;
        
        // For each seat in the row
        for (let i = 0; i < seatsInRow; i++) {
          // Calculate offset from center of the row
          const offset = (i - (seatsInRow - 1) / 2) * benchWidth;
          
          // Initialize position
          let x = 0, y = benchHeight, z = 0;
          
          // Add elevation if the row is elevated
          if (elevation > 0) y += elevation;
          
          // Position based on which side of the stadium
          if (side.x !== 0) {
            x = side.x * distance;
            z = offset;
          } else {
            x = offset;
            z = side.z * distance;
          }
          
          // Add the position and rotation to our array along with metadata about seat suitability
          positions.push({
            x: x,
            y: y + MODEL_HEIGHT_ABOVE_SEAT, // Sit higher above the bench
            z: z,
            rotation: side.rotation,
            side: side.name,
            row: rowIndex,
            seatIndex: i,
            forRealUsers: side.forRealUsers // Whether this seat is suitable for real users
          });
        }
      }
    });
    
    return positions;
  }

  updateOrCreatePlayer(player) {
    console.log("updateOrCreatePlayer called for:", player);
    if (!player || !player.id) {
      console.error("Invalid player data:", player);
      return;
    }

    // Check if we need to remove an existing model (for role changes)
    if (this.playerModels.has(player.id)) {
      // If role changed, remove the old model
      const existingModel = this.playerModels.get(player.id);
      const roleChanged = existingModel.userData.role !== player.role;

      if (roleChanged) {
        console.log(
          `Role changed for player ${player.id} from ${existingModel.userData.role} to ${player.role}`
        );
        this.removePlayer(player.id);
      }
    }

    // Create or update the player model
    if (!this.playerModels.has(player.id)) {
      console.log(
        "Creating new model for player:",
        player.id,
        "with role:",
        player.role
      );
      // Create new model
      const model = this.modelFactory.createPlayerModel(player);
      if (model) {
        console.log("Model created successfully:", model);
        // Store the player's role in the model's userData for future reference
        model.userData = {
          role: player.role,
          playerId: player.id,
        };

        // Set initial position and rotation
        if (player.position) {
          // Position the model
          model.position.set(
            player.position.x,
            player.position.y,
            player.position.z
          );
          
          // For viewers, additional adjustment if needed based on role
          if (player.role === 'viewer') {
            // We're already handling this in getStadiumSeatPositions, 
            // so this is just an additional safeguard
            if (model.position.y < BENCH_HEIGHT) {
              model.position.y = BENCH_HEIGHT + 2.0;
            }
          }
        }
        
        if (player.rotation !== undefined) {
          model.rotation.y = player.rotation;
        }

        this.scene.add(model);
        this.playerModels.set(player.id, model);

        console.log(
          `Added player model to scene. Total models: ${this.playerModels.size}`
        );

        // Initialize bobbing animation for viewers
        if (player.role === 'viewer') {
          this.initializeViewerAnimation(model, player.id);
        }
      } else {
        console.error("Failed to create model for player:", player);
      }
    } else {
      // Update existing model position/rotation
      console.log("Updating existing model for player:", player.id);
      const model = this.playerModels.get(player.id);

      if (player.position) {
        model.position.set(
          player.position.x,
          player.position.y,
          player.position.z
        );
      }
      if (player.rotation !== undefined) {
        model.rotation.y = player.rotation;
      }
    }
  }

  updatePlayerPosition(data) {
    const model = this.playerModels.get(data.id);
    if (model) {
      console.log(`Updating position for ${data.id}:`, data.position);
      if (data.position) {
        model.position.set(data.position.x, model.position.y, data.position.z);
      }
      if (data.rotation !== undefined) {
        model.rotation.y = data.rotation;
      }
    } else {
      console.warn(
        `Tried to update position for missing player model: ${data.id}`
      );
    }
  }

  removePlayer(playerId) {
    console.log("Removing player model:", playerId);
    const model = this.playerModels.get(playerId);
    if (model) {
      this.scene.remove(model);
      this.playerModels.delete(playerId);
      console.log(
        `Removed player model. Total models: ${this.playerModels.size}`
      );
    }
  }

  // Add a new method to start the game state update timer
  startGameStateUpdateTimer() {
    // Update the game state debug info every 100ms (0.1 seconds)
    this.gameStateUpdateInterval = setInterval(() => {
      // Get the latest game state from socket client
      const gameState = socketClient.gameState;
      // Update the debug display
      this.updateGameStateDebug(gameState);
    }, 100); // 100ms = 0.1 seconds
  }

  // Add a cleanup method to properly dispose resources
  cleanup() {
    // Clear the game state update interval
    if (this.gameStateUpdateInterval) {
      clearInterval(this.gameStateUpdateInterval);
      this.gameStateUpdateInterval = null;
    }

    // Remove event listeners
    window.removeEventListener("resize", this.onWindowResize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("keydown", this.handleFighterKeyDown);
    window.removeEventListener("keyup", this.handleFighterKeyUp);

    // Other cleanup as needed
    console.log("Renderer cleanup completed");

    // Clean up any remaining text bubbles
    for (const [playerId, bubble] of this.textBubbles) {
      clearTimeout(bubble.timeout);
      bubble.sprite.material.dispose();
      bubble.sprite.material.map.dispose();
    }
    this.textBubbles.clear();

    // Dispose of camera system
    if (this.cameraSystem) {
      this.cameraSystem.dispose();
      this.cameraSystem = null;
    }

    // Remove CSS2D renderer
    if (this.labelRenderer) {
      document.body.removeChild(this.labelRenderer.domElement);
    }
  }

  // Add a method to reset camera to a good viewing position
  resetCameraPosition() {
    // Smoothly move camera to a default position overlooking the ring
    const targetPosition = new THREE.Vector3(-15, 15, 15);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    
    // Use a simple animation to move the camera
    const duration = 1000; // 1 second
    const startTime = performance.now();
    const startPosition = this.camera.position.clone();
    
    const animateCamera = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use an easing function for smoother motion
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      
      // Interpolate position
      this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      
      // Look at center
      this.camera.lookAt(targetLookAt);
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    
    requestAnimationFrame(animateCamera);
  }

  // Add new methods for fighter movement
  handleFighterKeyDown(event) {
    // Check if this is coming from a custom event (our mobile controls)
    const isMobileEvent = event.isTrusted === false;
    
    // Only handle fighter movement if I am a fighter
    // For mobile, we'll be more lenient about the stage check
    if (socketClient.gameState.myRole !== 'fighter') {
      return;
    }
    
    // For keyboard input, enforce match in progress stage check
    if (!isMobileEvent && socketClient.gameState.stage !== 'MATCH_IN_PROGRESS') {
      return;
    }

    console.log(`Fighter control: ${event.key} down, mobile: ${isMobileEvent}`);
    
    switch (event.key.toLowerCase()) {
      case "w":
      case "arrowup":
        this.fighterMovement.forward = true;
        break;
      case "s":
      case "arrowdown":
        this.fighterMovement.backward = true;
        break;
      case "a":
      case "arrowleft":
        this.fighterMovement.left = true;
        break;
      case "d":
      case "arrowright":
        this.fighterMovement.right = true;
        break;
    }
  }

  handleFighterKeyUp(event) {
    // Check if this is coming from a custom event (our mobile controls)
    const isMobileEvent = event.isTrusted === false;
    
    // Only handle fighter movement if I am a fighter
    // For mobile, we'll be more lenient about the stage check
    if (socketClient.gameState.myRole !== 'fighter') {
      return;
    }
    
    // For keyboard input, enforce match in progress stage check
    if (!isMobileEvent && socketClient.gameState.stage !== 'MATCH_IN_PROGRESS') {
      return;
    }

    console.log(`Fighter control: ${event.key} up, mobile: ${isMobileEvent}`);
    
    switch (event.key.toLowerCase()) {
      case "w":
      case "arrowup":
        this.fighterMovement.forward = false;
        break;
      case "s":
      case "arrowdown":
        this.fighterMovement.backward = false;
        break;
      case "a":
      case "arrowleft":
        this.fighterMovement.left = false;
        break;
      case "d":
      case "arrowright":
        this.fighterMovement.right = false;
        break;
    }
  }

  updateFighterMovement() {
    // Only send movement if we're a fighter
    if (socketClient.gameState.myRole !== 'fighter') {
      return;
    }
    
    // Strictly enforce match in progress stage check - no mobile exception
    if (socketClient.gameState.stage !== 'MATCH_IN_PROGRESS') {
      return;
    }

    // Check if any movement keys are pressed
    let movement = false;
    
    if (this.fighterMovement.forward) {
      socketClient.sendMovement('forward');
      movement = true;
    }
    if (this.fighterMovement.backward) {
      socketClient.sendMovement('backward');
      movement = true;
    }
    if (this.fighterMovement.left) {
      socketClient.sendMovement('left');
      movement = true;
    }
    if (this.fighterMovement.right) {
      socketClient.sendMovement('right');
      movement = true;
    }
  }

  // Add new methods for text bubble management
  createTextBubble(playerId, text, isEmote = false) {
    // Remove any existing bubble
    this.removeTextBubble(playerId);

    const player = this.playerModels.get(playerId);
    if (!player) return;

    // Create container div
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = isEmote ? 'text-bubble emote-bubble' : 'text-bubble';
    
    // Set text content
    bubbleDiv.textContent = text;

    // Create CSS2DObject
    const textObject = new CSS2DObject(bubbleDiv);
    
    // Position above player model - adjust height based on player scale
    const modelHeight = player.scale.y;
    textObject.position.set(0, 1.0, 0);
    
    // Add to player mesh and store reference
    player.add(textObject);
    this.textBubbles.set(playerId, textObject);

    // Auto-remove after delay
    setTimeout(() => {
      if (this.textBubbles.has(playerId)) {
        bubbleDiv.style.opacity = '0';
        setTimeout(() => this.removeTextBubble(playerId), 300);
      }
    }, isEmote ? 2000 : 5000);
  }

  removeTextBubble(playerId) {
    const textObject = this.textBubbles.get(playerId);
    if (textObject) {
      const player = this.playerModels.get(playerId);
      if (player) {
        player.remove(textObject);
      }
      this.textBubbles.delete(playerId);
    }
  }

  // Helper method for drawing rounded rectangles
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Add this method to handle game state updates for camera
  updateCameraForGameState(gameState) {
    // Don't update if free camera is enabled or cameraSystem is not initialized
    if (this.isFreeCamera || !this.cameraSystem) return;
    
    // Get current game stage
    const currentStage = gameState.stage;
    
    // Update camera mode based on game stage
    switch (currentStage) {
      case 'PRE_CEREMONY':
      case 'PRE_MATCH_CEREMONY':
        // Set ceremony mode with fighters and referee
        if (gameState.fighters.length === 2 && gameState.referee) {
          const fighter1Model = this.playerModels.get(gameState.fighters[0].id);
          const fighter2Model = this.playerModels.get(gameState.fighters[1].id);
          const refereeModel = this.playerModels.get(gameState.referee.id);
          
          if (fighter1Model && fighter2Model && refereeModel) {
            // Only change mode if needed
            if (this.cameraSystem.getCurrentMode() !== this.cameraSystem.MODES.CEREMONY) {
              console.log("Setting ceremony camera mode");
              // Use longer transition for ceremony (1.5 seconds)
              this.cameraSystem.setMode(this.cameraSystem.MODES.CEREMONY, {
                fighter1: fighter1Model,
                fighter2: fighter2Model,
                referee: refereeModel
              }, 1500);
            }
          }
        }
        break;
        
      case 'MATCH_IN_PROGRESS':
        // During match, use the overview camera
        if (this.cameraSystem.getCurrentMode() !== this.cameraSystem.MODES.WAITING_OVERVIEW) {
          // Fast transition to match view (0.8 seconds)
          this.cameraSystem.setMode(this.cameraSystem.MODES.WAITING_OVERVIEW, {}, 800);
        }
        break;
        
      default:
        // Default to waiting overview
        if (this.cameraSystem.getCurrentMode() !== this.cameraSystem.MODES.WAITING_OVERVIEW) {
          // Standard transition (1 second)
          this.cameraSystem.setMode(this.cameraSystem.MODES.WAITING_OVERVIEW);
        }
        break;
    }
  }

  // Add this method to animate a fighter falling off the ring
  animateFighterFall(loserId) {
    console.log(`Animating fall for fighter: ${loserId}`);
    
    // Get the fighter model
    const fighterModel = this.playerModels.get(loserId);
    if (!fighterModel) {
      console.warn(`Cannot animate fall: fighter model ${loserId} not found`);
      return;
    }
    
    // Save original position and rotation for reference
    const originalPosition = fighterModel.position.clone();
    const originalRotation = fighterModel.rotation.clone();
    
    // Calculate a random direction to fall (away from the ring center)
    const ringCenter = new THREE.Vector3(0, 0, 0);
    const fallDirection = new THREE.Vector3()
      .subVectors(originalPosition, ringCenter)
      .normalize();
    
    // Add some randomness to make it more natural
    fallDirection.x += (Math.random() * 0.4) - 0.2;
    fallDirection.z += (Math.random() * 0.4) - 0.2;
    fallDirection.normalize();
    
    // Calculate a target position in the audience
    const fallDistance = 12 + Math.random() * 5; // How far they fall (into audience)
    const targetPosition = new THREE.Vector3()
      .copy(originalPosition)
      .add(fallDirection.multiplyScalar(fallDistance));
    
    // Randomize landing spot a bit
    targetPosition.x += (Math.random() * 6) - 3;
    targetPosition.z += (Math.random() * 6) - 3;
    targetPosition.y = 0.5; // Land on the floor
    
    // Calculate a target rotation (face up, looking at the ceiling)
    const targetRotation = new THREE.Euler(
      Math.PI / 2 + (Math.random() * 0.4 - 0.2), // Mostly face up, slight random tilt
      originalRotation.y + Math.PI + (Math.random() * 0.6 - 0.3), // Spin around with some randomness
      (Math.random() * 0.5) - 0.25 // Slight random roll
    );
    
    // Animation parameters
    const startTime = performance.now();
    const duration = 2000; // 2 seconds for the fall
    const bounceHeight = 8; // Maximum height during the arc
    
    // Create a new text bubble for a dramatic "NOOOOO!" or similar exclamation
    const fallExclamations = [
      "NOOOOO!",
      "AAAAAH!",
      "I'M FLYING!",
      "OOF!",
      "NOT LIKE THIS!",
      "IMPOSSIBLE!",
      "DISHONOR!"
    ];
    const randomExclamation = fallExclamations[Math.floor(Math.random() * fallExclamations.length)];
    
    // Add a slight delay before showing the text bubble
    setTimeout(() => {
      this.createTextBubble(loserId, randomExclamation, true);
    }, 500);
    
    // Animation function
    const animateFall = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      
      // Use easing functions for more natural motion
      const positionEase = this.easeOutQuart(progress);
      const rotationEase = this.easeInOutQuad(progress);
      
      // Calculate current position with arc trajectory
      const currentPosition = new THREE.Vector3();
      
      // Interpolate X and Z with easing
      currentPosition.x = originalPosition.x + (targetPosition.x - originalPosition.x) * positionEase;
      currentPosition.z = originalPosition.z + (targetPosition.z - originalPosition.z) * positionEase;
      
      // Y position follows a parabolic arc (up then down)
      // Start upward trajectory, then fall down
      if (progress < 0.5) {
        // First half - go up
        currentPosition.y = originalPosition.y + bounceHeight * this.easeOutQuad(progress * 2);
      } else {
        // Second half - fall down
        currentPosition.y = originalPosition.y + bounceHeight + 
          (targetPosition.y - (originalPosition.y + bounceHeight)) * 
          this.easeInQuad((progress - 0.5) * 2);
      }
      
      // Update fighter position
      fighterModel.position.copy(currentPosition);
      
      // Interpolate rotation with easing
      fighterModel.rotation.x = originalRotation.x + (targetRotation.x - originalRotation.x) * rotationEase;
      fighterModel.rotation.y = originalRotation.y + (targetRotation.y - originalRotation.y) * rotationEase;
      fighterModel.rotation.z = originalRotation.z + (targetRotation.z - originalRotation.z) * rotationEase;
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateFall);
      }
    };
    
    // Start the animation
    requestAnimationFrame(animateFall);
  }

  // Add easing functions to make the animation more natural
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  easeInQuad(t) {
    return t * t;
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // Add helper method to check if on mobile
  checkIsMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  // Add a method to initialize viewer animation properties
  initializeViewerAnimation(viewerModel, playerId) {
    // Generate a consistent phase offset based on player ID
    const phaseHash = this.hashStringToFloat(playerId);
    
    // Store animation parameters in the model's userData
    viewerModel.userData.animation = {
      baseY: viewerModel.position.y,  // Store original Y position
      phaseOffset: phaseHash * Math.PI * 2 * VIEWER_ANIMATION.PHASE_VARIATION, // Unique phase
      frequencyMod: 0.8 + (phaseHash * VIEWER_ANIMATION.FREQUENCY_VARIATION)   // Slight frequency variation
    };
  }

  // Add a helper method to create a consistent float from string
  hashStringToFloat(str) {
    if (!str) return Math.random();
    
    // Simple string hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Normalize to 0-1 range
    return (hash & 0x7FFFFFFF) / 0x7FFFFFFF;
  }

  // Add this method to update the viewer animations during each frame
  updateViewerAnimations() {
    const currentTime = performance.now();
    
    // Go through all player models
    this.playerModels.forEach((model, playerId) => {
      // Only animate viewers
      if (model.userData.role === 'viewer' && model.userData.animation) {
        const animation = model.userData.animation;
        
        // Calculate transition progress if we're in a transition
        let transitionProgress = 1;
        if (animation.transitionStartTime) {
          const timeSinceTransition = currentTime - animation.transitionStartTime;
          if (timeSinceTransition < VIEWER_ANIMATION.TRANSITION_DURATION) {
            transitionProgress = timeSinceTransition / VIEWER_ANIMATION.TRANSITION_DURATION;
            // Keep progress between 0 and 1
            transitionProgress = Math.max(0, Math.min(1, transitionProgress));
          } else {
            // Transition complete, clear transition time
            animation.transitionStartTime = null;
          }
        }
        
        // Determine the current amplitude and frequency based on excited state and transition
        let currentAmplitude, currentFrequency;
        
        if (animation.excited) {
          // Transitioning to excited state
          currentAmplitude = VIEWER_ANIMATION.BOB_AMPLITUDE + 
            (VIEWER_ANIMATION.EXCITED_AMPLITUDE - VIEWER_ANIMATION.BOB_AMPLITUDE) * transitionProgress;
          currentFrequency = VIEWER_ANIMATION.BOB_FREQUENCY + 
            (VIEWER_ANIMATION.EXCITED_FREQUENCY - VIEWER_ANIMATION.BOB_FREQUENCY) * transitionProgress;
        } else {
          // Transitioning to normal state
          currentAmplitude = VIEWER_ANIMATION.EXCITED_AMPLITUDE - 
            (VIEWER_ANIMATION.EXCITED_AMPLITUDE - VIEWER_ANIMATION.BOB_AMPLITUDE) * transitionProgress;
          currentFrequency = VIEWER_ANIMATION.EXCITED_FREQUENCY - 
            (VIEWER_ANIMATION.EXCITED_FREQUENCY - VIEWER_ANIMATION.BOB_FREQUENCY) * transitionProgress;
        }
        
        // Calculate bobbing effect with current animation parameters
        const bobbing = Math.sin(
          currentTime * currentFrequency * animation.frequencyMod + 
          animation.phaseOffset
        ) * currentAmplitude;
        
        // Apply bobbing to model position
        model.position.y = animation.baseY + bobbing;
      }
    });
  }

  // Add a method to set all viewers to excited state
  setViewersExcitedState(excited) {
    const transitionStartTime = performance.now();
    
    // Update all viewer models
    this.playerModels.forEach((model, playerId) => {
      if (model.userData.role === 'viewer' && model.userData.animation) {
        model.userData.animation.excited = excited;
        model.userData.animation.transitionStartTime = transitionStartTime;
      }
    });
    
    console.log(`Setting viewer excited state to: ${excited}`);
  }

  // Add a helper method to reset fighter movement
  resetFighterMovement() {
    this.fighterMovement.forward = false;
    this.fighterMovement.backward = false;
    this.fighterMovement.left = false;
    this.fighterMovement.right = false;
  }
}

// Create and export a singleton instance
export const renderer = new Renderer();
