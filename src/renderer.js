import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { StadiumFactory } from './models';
import { socketClient } from './socket-client';
import { 
  RING_RADIUS,
  RING_HEIGHT,
  FIRST_ROW_DISTANCE,
  SEATS_PER_FIRST_ROW,
  SEATS_INCREMENT,
  ELEVATION_INCREMENT,
  ROW_SPACING,
  CAMERA_MOVE_SPEED,
  CAMERA_ROTATE_SPEED
} from './constants';

export class Renderer {
  constructor() {
    console.log('Renderer constructor called');
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
  }

  initialize() {
    console.log('Initializing renderer');
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    console.log('Scene created');

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-15, 15, 15);
    this.camera.lookAt(0, 0, 0);
    console.log('Camera created and positioned');

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance'  });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3; // Reduced from 1.5 to 1.3 for a slightly darker scene

    
    // Add renderer to DOM
    const container = document.createElement('div');
    container.id = 'canvas-container';
    document.body.appendChild(container);
    container.appendChild(this.renderer.domElement);
    console.log('Renderer created and added to DOM');

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Add smooth damping
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    console.log('Orbit controls initialized');

    // Set up lighting
    this.setupLighting();
    console.log('Lighting setup complete');

    // // Create test cube to verify rendering
    // const geometry = new THREE.BoxGeometry(5, 5, 5);
    // const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // const cube = new THREE.Mesh(geometry, material);
    // this.scene.add(cube);
    // console.log('Test cube added');

    // Create the complete stadium (includes ring)
    this.createStadium();
    console.log('Stadium created');

    // Create FPS display
    this.createFpsDisplay();
    console.log('FPS display created');

    // Add event listeners
    window.addEventListener('resize', this.onWindowResize);
    // Add keyboard event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Listen for free camera toggle from UI Manager
    document.addEventListener('freeCameraToggled', (event) => {
      this.toggleFreeCamera(event.detail.enabled);
    });

    // Start animation loop
    this.lastFpsUpdate = performance.now();
    console.log('Starting animation loop');
    this.animate();
  }

  // Add FPS display with socket stats
  createFpsDisplay() {
    const statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
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

    const fpsDiv = document.createElement('div');
    fpsDiv.id = 'fps-counter';
    fpsDiv.textContent = '0 FPS';
    
    // Socket stats toggle
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '▼ Socket Stats';
    toggleButton.style.cssText = `
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
    
    const socketStatsDiv = document.createElement('div');
    socketStatsDiv.id = 'socket-stats';
    socketStatsDiv.style.display = 'none'; // Hidden by default
    
    statsContainer.appendChild(fpsDiv);
    statsContainer.appendChild(toggleButton);
    statsContainer.appendChild(socketStatsDiv);
    document.body.appendChild(statsContainer);

    // Toggle socket stats visibility
    let isExpanded = false;
    toggleButton.addEventListener('click', () => {
      isExpanded = !isExpanded;
      socketStatsDiv.style.display = isExpanded ? 'block' : 'none';
      toggleButton.textContent = (isExpanded ? '▼' : '►') + ' Socket Stats';
    });

    // Listen for socket stats updates
    socketClient.on('socketStatsUpdated', (stats) => {
      this.updateSocketStats(stats);
    });
  }

  // Update the socket stats display
  updateSocketStats(stats) {
    const statsDiv = document.getElementById('socket-stats');
    if (!statsDiv) return;

    let html = '';
    Object.entries(stats).forEach(([event, count]) => {
      html += `${event}: ${count}<br>`;
    });
    statsDiv.innerHTML = html;
  }

  setupLighting() {
    // Ambient light with moderate intensity
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main spotlight (instead of directional light)
    const mainSpotlight = new THREE.SpotLight(0xffffff, 1.5);
    mainSpotlight.position.set(0, 30, 0);
    mainSpotlight.angle = Math.PI / 5.5;
    mainSpotlight.penumbra = 0.3;
    mainSpotlight.decay = 1.5;
    mainSpotlight.distance = 60;
    
    // Shadow settings
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

    // Fill light with warm color
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.9);
    fillLight.position.set(RING_RADIUS * 2, RING_RADIUS * 1.5, RING_RADIUS * 2);
    fillLight.castShadow = true;
    fillLight.shadow.mapSize.width = 1024;
    fillLight.shadow.mapSize.height = 1024;
    fillLight.shadow.camera.left = -15;
    fillLight.shadow.camera.right = 15;
    fillLight.shadow.camera.top = 15;
    fillLight.shadow.camera.bottom = -15;
    fillLight.shadow.camera.far = 50;
    fillLight.shadow.bias = -0.0003;
    this.scene.add(fillLight);

    // Key light with slight yellow tint
    const keyLight = new THREE.DirectionalLight(0xffffee, 0.7);
    keyLight.position.set(0, RING_RADIUS * 2, RING_RADIUS * 3);
    keyLight.lookAt(0, 0, 0);
    this.scene.add(keyLight);

    // Rim light with blue tint
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.7);
    rimLight.position.set(-RING_RADIUS * 2, RING_RADIUS * 1.5, -RING_RADIUS * 2);
    this.scene.add(rimLight);

    // Bounce light from below
    const bounceLight = new THREE.DirectionalLight(0xffffcc, 0.5);
    bounceLight.position.set(0, -2, 0);
    bounceLight.target.position.set(0, 2, 0);
    this.scene.add(bounceLight);
    this.scene.add(bounceLight.target);
    
    // Subtle shadow-only light
    const shadowLight = new THREE.DirectionalLight(0x000000, 0.03);
    shadowLight.position.set(5, 20, 5);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = 1024;
    shadowLight.shadow.mapSize.height = 1024;
    shadowLight.shadow.camera.near = 1;
    shadowLight.shadow.camera.far = 50;
    shadowLight.shadow.camera.left = -15;
    shadowLight.shadow.camera.right = 15;
    shadowLight.shadow.camera.top = 15;
    shadowLight.shadow.camera.bottom = -15;
    shadowLight.shadow.bias = -0.0003;
    this.scene.add(shadowLight);
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
        elevationIncrement: ELEVATION_INCREMENT
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
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      const fpsCounter = document.getElementById('fps-counter');
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
      console.log('First frame rendering');
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
    const freeCameraToggle = document.getElementById('free-camera-toggle');
    if (freeCameraToggle) {
      freeCameraToggle.checked = enabled;
      
      // Find the text span that's a sibling of the checkbox
      const textSpan = freeCameraToggle.nextElementSibling;
      if (textSpan && textSpan.classList.contains('viewer-only-text')) {
        if (enabled) {
          // Create or update controls hint element
          let controlsHint = textSpan.querySelector('.controls-hint');
          if (!controlsHint) {
            controlsHint = document.createElement('span');
            controlsHint.className = 'controls-hint';
            controlsHint.style.cssText = `
              font-size: 11px;
              opacity: 0.7;
              margin-left: 5px;
              font-style: italic;
            `;
            textSpan.appendChild(controlsHint);
          }
          controlsHint.textContent = " WSAD/↑↓←→";
        } else {
          // Remove controls hint if it exists
          const controlsHint = textSpan.querySelector('.controls-hint');
          if (controlsHint) {
            textSpan.removeChild(controlsHint);
          }
        }
      }
    }
    
    console.log(`Free camera ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Handle key down events for camera control
  handleKeyDown(event) {
    if (!this.isFreeCamera) return;
    
    switch (event.key.toLowerCase()) {
      case 'w': this.cameraMovement.forward = true; break;
      case 's': this.cameraMovement.backward = true; break;
      case 'a': this.cameraMovement.left = true; break;
      case 'd': this.cameraMovement.right = true; break;
      case 'arrowup': this.cameraMovement.up = true; break;
      case 'arrowdown': this.cameraMovement.down = true; break;
      case 'arrowleft': this.cameraMovement.rotateLeft = true; break;
      case 'arrowright': this.cameraMovement.rotateRight = true; break;
    }
  }

  // Handle key up events for camera control
  handleKeyUp(event) {
    if (!this.isFreeCamera) {
      return;
    }
    
    switch (event.key.toLowerCase()) {
      case 'w': this.cameraMovement.forward = false; break;
      case 's': this.cameraMovement.backward = false; break;
      case 'a': this.cameraMovement.left = false; break;
      case 'd': this.cameraMovement.right = false; break;
      case 'arrowup': this.cameraMovement.up = false; break;
      case 'arrowdown': this.cameraMovement.down = false; break;
      case 'arrowleft': this.cameraMovement.rotateLeft = false; break;
      case 'arrowright': this.cameraMovement.rotateRight = false; break;
    }
  }

  // Add a method to update camera position based on movement state
  updateCameraPosition() {
    // Create a vector for the camera's forward direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    // Create right vector by crossing forward with up
    const right = new THREE.Vector3();
    right.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
    
    // Forward/backward movement
    if (this.cameraMovement.forward) {
      this.camera.position.addScaledVector(direction, CAMERA_MOVE_SPEED);
    }
    if (this.cameraMovement.backward) {
      this.camera.position.addScaledVector(direction, -CAMERA_MOVE_SPEED);
    }
    
    // Left/right movement
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
    
    // Camera rotation
    if (this.cameraMovement.rotateLeft) {
      this.camera.rotateY(CAMERA_ROTATE_SPEED);
    }
    if (this.cameraMovement.rotateRight) {
      this.camera.rotateY(-CAMERA_ROTATE_SPEED);
    }
  }
}

// Create and export a singleton instance
export const renderer = new Renderer();