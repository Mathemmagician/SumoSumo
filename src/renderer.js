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

export class Renderer {
  constructor() {
    console.log("Renderer constructor called");
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stadium = null;
    this.controls = null;

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

    // Bind methods
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    // Bind additional methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.toggleFreeCamera = this.toggleFreeCamera.bind(this);

    // Add ModelFactory instance
    this.modelFactory = new ModelFactory(/* pass face textures if needed */);

    // Add a Map to store player models
    this.playerModels = new Map();
  }

  async initialize() {
    console.log("Initializing renderer");

    // Initialize ModelFactory first
    await this.modelFactory.initialize();

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    console.log("Scene created");

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-15, 15, 15);
    this.camera.lookAt(0, 0, 0);
    console.log("Camera created and positioned");

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3; // Reduced from 1.5 to 1.3 for a slightly darker scene

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

    // Create FPS display
    this.createFpsDisplay();
    console.log("FPS display created");

    // Start a timer to update the game state debug info every 100ms
    this.startGameStateUpdateTimer();
    console.log("Game state update timer started");

    // Add event listeners
    window.addEventListener("resize", this.onWindowResize);
    // Add keyboard event listeners
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

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

  // Add a new method to update the game state debug display
  updateGameStateDebug(gameState) {
    const gameStateDiv = document.getElementById("game-state-debug");
    if (!gameStateDiv) return;

    let html = `
      <b>Current Stage:</b> ${gameState.stage}<br>
      <b>My Role:</b> ${gameState.myRole}<br>
      <b>My ID:</b> ${gameState.myId?.substring(0, 6) || "None"}<br>
      <b>Players:</b><br>
    `;

    // Add fighters
    html += "  <b>Fighters:</b> " + gameState.fighters.length + "<br>";
    gameState.fighters.forEach((fighter) => {
      html += `  • ${fighter.id.substring(0, 6)} (pos: ${Math.round(
        fighter.position?.x || 0
      )},${Math.round(fighter.position?.z || 0)})<br>`;
    });

    // Add referee
    html += "  <b>Referee:</b> " + (gameState.referee ? "1" : "0") + "<br>";
    if (gameState.referee) {
      html += `  • ${gameState.referee.id.substring(0, 6)}<br>`;
    }

    // Add viewers
    html += "  <b>Viewers:</b> " + gameState.viewers.length + "<br>";
    gameState.viewers.forEach((viewer) => {
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
    backLight.position.set(0, 10, -20);
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
    } else {
      this.controls.update();
    }

    // Log first frame render
    if (!this._hasLoggedFirstFrame) {
      console.log("First frame rendering");
      this._hasLoggedFirstFrame = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  // Add free camera toggle
  toggleFreeCamera(enabled) {
    this.isFreeCamera = enabled;

    // Enable/disable orbit controls when switching camera modes
    this.controls.enabled = !enabled;

    // Reset camera movement when disabling free camera
    if (!enabled) {
      for (const key in this.cameraMovement) {
        this.cameraMovement[key] = false;
      }
    }

    // Update the UI checkbox and text
    const freeCameraToggle = document.getElementById("free-camera-toggle");
    if (freeCameraToggle) {
      freeCameraToggle.checked = enabled;

      // Find the text span that's a sibling of the checkbox
      const textSpan = freeCameraToggle.nextElementSibling;
      if (textSpan && textSpan.classList.contains("viewer-only-text")) {
        if (enabled) {
          // Create or update controls hint element
          let controlsHint = textSpan.querySelector(".controls-hint");
          if (!controlsHint) {
            controlsHint = document.createElement("span");
            controlsHint.className = "controls-hint";
            controlsHint.style.cssText = `
              font-size: 11px;
              opacity: 0.7;
              margin-left: 5px;
              font-style: italic;
            `;
            textSpan.appendChild(controlsHint);
          }
          controlsHint.textContent = " WSAD,←→,↑↓";
        } else {
          // Remove controls hint if it exists
          const controlsHint = textSpan.querySelector(".controls-hint");
          if (controlsHint) {
            textSpan.removeChild(controlsHint);
          }
        }
      }
    }

    console.log(`Free camera ${enabled ? "enabled" : "disabled"}`);
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
      console.log("Renderer received gameStateUpdated:", gameState);
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
      console.log("Renderer received preCeremonyStart:", data);
      // Update fighters and referee positions
      if (data.fighters && data.fighters.length) {
        data.fighters.forEach((fighter) => this.updateOrCreatePlayer(fighter));
      }
      if (data.referee) {
        this.updateOrCreatePlayer(data.referee);
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
      const totalSeats = seatPositions.length;
      
      // Track which seats are already occupied
      const occupiedSeats = new Set();
      
      // Process each viewer
      viewers.forEach((viewer) => {
        // Clone viewer object to avoid modifying the original game state
        const viewerWithPosition = { ...viewer };
        
        // If viewer doesn't have a position or has null position (reset case),
        // or has a default position, place on a seat
        if (
          !viewerWithPosition.position ||
          viewerWithPosition.position === null || 
          (viewerWithPosition.position.x === 0 &&
           viewerWithPosition.position.z === 0)
        ) {
          // Determine seat based on player.seed if available, otherwise use player ID
          let seatIndex;
          
          if (viewer.seed !== undefined) {
            // Use the player's seed to determine seat
            seatIndex = Math.abs(viewer.seed) % totalSeats;
          } else {
            // Generate a deterministic seat index from player ID
            const idSum = viewer.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            seatIndex = idSum % totalSeats;
          }
          
          // If this seat is occupied, find the next available one
          let attempts = 0;
          const maxAttempts = totalSeats; // Only try each seat once at most
          
          while (occupiedSeats.has(seatIndex) && attempts < maxAttempts) {
            seatIndex = (seatIndex + 1) % totalSeats;
            attempts++;
          }
          
          // Mark this seat as occupied
          occupiedSeats.add(seatIndex);
          
          // Get the seat position
          const seatPos = seatPositions[seatIndex];
          
          viewerWithPosition.position = {
            x: seatPos.x,
            y: seatPos.y, // Use the position directly from seatPos which now includes the correct height
            z: seatPos.z,
          };
          
          // Set rotation to face the ring
          viewerWithPosition.rotation = seatPos.rotation;
          
          console.log(`Placed viewer ${viewer.id} at seat ${seatIndex} (row ${seatPos.row}, side ${seatPos.side})`);
        }
        
        console.log("Processing viewer:", viewerWithPosition);
        this.updateOrCreatePlayer(viewerWithPosition);
      });
    }

    console.log(`Total player models after update: ${this.playerModels.size}`);
  }

  // Helper method to get stadium seat positions from the actual stadium geometry
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
    // Let's use a multiple of the bench height
    const MODEL_HEIGHT_ABOVE_SEAT = 1.5; // This will make viewers sit properly above the bench
    
    // We'll focus on the first few rows
    const maxRows = 3;
    
    // Define the sides of the stadium
    const sideData = [
      { name: 'North', rotation: 0, x: 0, z: -1 },
      { name: 'East', rotation: -Math.PI / 2, x: 1, z: 0 },
      { name: 'West', rotation: Math.PI / 2, x: -1, z: 0 },
      { name: 'South', rotation: Math.PI, x: 0, z: 1 }
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
          
          // Add the position and rotation to our array
          positions.push({
            x: x,
            y: y + MODEL_HEIGHT_ABOVE_SEAT, // Sit higher above the bench
            z: z,
            rotation: side.rotation,
            side: side.name,
            row: rowIndex,
            seatIndex: i
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

    // Other cleanup as needed
    console.log("Renderer cleanup completed");
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
}

// Create and export a singleton instance
export const renderer = new Renderer();
