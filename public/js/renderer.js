// At the very top of renderer.js, add:
window.removePlayerFromScene = removePlayerFromScene;
window.showPlayerEmote = showPlayerEmote;
window.showPlayerMessage = showPlayerMessage;
window.addPlayerToScene = addPlayerToScene;
window.updatePlayerInScene = updatePlayerInScene;

// Three.js renderer code
let scene, camera, renderer;
let cameraSystem;
let ring, playerModels = {};
let textureLoader;
let faceTextures = [];

// ADDED: simple global flag to see if we've already inited once
let sceneInitialized = false;

// Constants for scene dimensions
const RING_RADIUS = 7; // Base measurement for the scene
const RING_HEIGHT = 1.0;
const FLOOR_SIZE = RING_RADIUS * 5;

const SQUARE_RING_RADIUS = RING_RADIUS + 0.3;
const SQUARE_BOTTOM_RADIUS = SQUARE_RING_RADIUS + 0.5;

// BENCH/MAT constants for audience seats
// (used in createAudienceAreas() with InstancedMesh)
const ELEVATION_INCREMENT = 0.8;
const SEATS_PER_FIRST_ROW = 6;
const SEATS_INCREMENT = 2;
const FIRST_ROW_DISTANCE = RING_RADIUS * 1.4;

const BENCH_WIDTH = 2.0 * RING_RADIUS / SEATS_PER_FIRST_ROW; // default seats per first row = 10
const BENCH_HEIGHT = 0.1;
const BENCH_DEPTH = BENCH_WIDTH;
const ROW_SPACING = BENCH_WIDTH; // distance between rows

// Cache canvas and context for reuse
const messageCanvas = document.createElement('canvas');
messageCanvas.width = 512;
messageCanvas.height = 256;
const messageCtx = messageCanvas.getContext('2d');

const emoteCanvas = document.createElement('canvas');
emoteCanvas.width = 128;
emoteCanvas.height = 128;
const emoteCtx = emoteCanvas.getContext('2d');

// Near the top with other constants
let frameCount = 0;
let fps = 0;
let fpsUpdateInterval = 500; // Update FPS every 500ms
let lastFpsUpdate = performance.now();

// Add near the top with other constants
const FACE_ZOOM_DISTANCE = 1.2;    // How close to zoom to faces
const FACE_ZOOM_HEIGHT = 1.0;    // Slightly above eye level
let ceremonyCameraActive = false;
let originalCameraPosition = null;
let ceremonyStartTime = 0;

// Update near the top with other constants
const FIGHTER1_HOLD_TIME = 2000; // 2 seconds on first fighter
const FIGHTER2_HOLD_TIME = 2000; // 2 seconds on second fighter
const REFEREE_HOLD_TIME = 1000;  // 1 second on referee

// Add this near the top with other variables
let modelFactory;

// Add near the top with other constants
const CINEMA_BAR_HEIGHT = 0.20; // 15% of screen height for top and bottom bars

// Add these constants near the top
const CAMERA_MOVE_SPEED = 0.5;
const CAMERA_ROTATE_SPEED = 0.02;
let freeCameraMode = false;
let cameraControls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  moveUp: false,
  moveDown: false,
  rotateLeft: false,
  rotateRight: false,
  rotateUp: false,
  rotateDown: false
};

// Add these physics constants for the falling animation
const FALL_PHYSICS = {
  GRAVITY: 0.015,
  INITIAL_UPWARD_VELOCITY: 0.1,
  ROTATION_SPEED: 0.05,
  FORWARD_MOMENTUM: 0.1,
  BOUNCE_DAMPING: 0.4,  // How much bounce energy is retained (0-1)
  MIN_BOUNCE_VELOCITY: 0.05  // Minimum velocity to continue bouncing
};

/**
 * Initialize the 3D scene. We only want to do this once.
 */
function initScene(initialGameState) {
  if (sceneInitialized) {
    console.warn('initScene() was called more than once! Skipping re-initialization.');
    return;
  }
  sceneInitialized = true;

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5CB8EB); // Slightly darker blue than before

  // Create camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3; // Reduced from 1.5 to 1.3 for a slightly darker scene
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Initialize camera system
  cameraSystem = new CameraSystem(scene, camera, renderer);

  // Enhanced lighting setup
  setupLighting();

  // Create texture loader
  textureLoader = new THREE.TextureLoader();

  // Generate face textures once and initialize ModelFactory
  generateFaceTextures();
  modelFactory = new ModelFactory(faceTextures);

  // Create the sumo ring
  createRing();

  // Create the audience areas (using InstancedMesh)
  createAudienceAreas();
  
  // Add stadium walls after audience areas
  createStadiumWalls();

  // Add all existing players to the scene
  initialGameState.fighters.forEach(fighter => {
    addPlayerToScene(fighter);
  });
  if (initialGameState.referee) {
    addPlayerToScene(initialGameState.referee);
  }
  initialGameState.viewers.forEach(viewer => {
    addPlayerToScene(viewer);
  });

  createFpsDisplay();

  // We no longer need to create cinematic bars here as they're managed by the camera system
  cinematicBars = null;

  // Create camera info display
  createCameraInfoDisplay();
  
  // Add keyboard event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Start animation loop
  animate();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

// Setup lighting with moderate brightness
function setupLighting() {
  // Reduce ambient light intensity
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Reduced from 0.8 to 0.6
  scene.add(ambientLight);

  // Main spotlight with balanced intensity
  const mainSpotlight = new THREE.SpotLight(0xffffff, 1.5); // Reduced from 1.8 to 1.5
  mainSpotlight.position.set(0, 30, 0);
  mainSpotlight.angle = Math.PI / 5.5; // Slightly narrower angle
  mainSpotlight.penumbra = 0.3;
  mainSpotlight.decay = 1.5; // Slightly more decay
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
  scene.add(mainSpotlight);
  scene.add(mainSpotlight.target);

  // Fill light with reduced intensity
  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.9); // Reduced from 1.2 to 0.9
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
  scene.add(fillLight);

  // Key light with reduced intensity
  const keyLight = new THREE.DirectionalLight(0xffffee, 0.7); // Reduced from 1.0 to 0.7
  keyLight.position.set(0, RING_RADIUS * 2, RING_RADIUS * 3);
  keyLight.lookAt(0, 0, 0);
  scene.add(keyLight);

  // Rim light with reduced intensity
  const rimLight = new THREE.DirectionalLight(0xaaccff, 0.7); // Reduced from 1.0 to 0.7
  rimLight.position.set(-RING_RADIUS * 2, RING_RADIUS * 1.5, -RING_RADIUS * 2);
  scene.add(rimLight);

  // Bounce light with reduced intensity
  const bounceLight = new THREE.DirectionalLight(0xffffcc, 0.5); // Reduced from 0.7 to 0.5
  bounceLight.position.set(0, -2, 0);
  bounceLight.target.position.set(0, 2, 0);
  scene.add(bounceLight);
  scene.add(bounceLight.target);
  
  // Add a subtle shadow-only light to enhance shadows slightly
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
  scene.add(shadowLight);
}

// Generate face textures
function generateFaceTextures() {
  // Clear existing textures first
  faceTextures = [];
  
  for (let i = 0; i < 10; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Use consistent seed based on faceId for randomization
    const seed = i; // Using faceId as seed
    const random = () => {
      // Simple deterministic random number generator
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Face background color - use fixed hue based on faceId
    ctx.fillStyle = `hsl(${i * 36}, 80%, 80%)`;
    ctx.fillRect(0, 0, 256, 256);

    // Draw eyes - use fixed sizes based on faceId
    ctx.fillStyle = 'black';
    const eyeSize = 20 + (i % 3) * 5; // Deterministic eye size based on faceId
    
    // Left eye
    ctx.beginPath();
    ctx.arc(90, 100, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(166, 100, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows - deterministic based on faceId
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    const eyebrowTilt = (i % 2) === 0 ? 10 : -10;
    ctx.beginPath();
    ctx.moveTo(60, 70);
    ctx.lineTo(120, 70 + eyebrowTilt);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(136, 70 + eyebrowTilt);
    ctx.lineTo(196, 70);
    ctx.stroke();

    // Mouth - deterministic based on faceId
    ctx.lineWidth = 6;
    const mouthStyle = i % 4; // Use faceId to determine mouth style
    switch (mouthStyle) {
      case 0: // Happy
        ctx.beginPath();
        ctx.arc(128, 160, 40, 0, Math.PI);
        ctx.stroke();
        break;
      case 1: // Straight
        ctx.beginPath();
        ctx.moveTo(88, 160);
        ctx.lineTo(168, 160);
        ctx.stroke();
        break;
      case 2: // Surprised
        ctx.beginPath();
        ctx.arc(128, 160, 20, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 3: // Frown
        ctx.beginPath();
        ctx.arc(128, 200, 40, Math.PI, Math.PI * 2);
        ctx.stroke();
        break;
    }

    // Optional details - deterministic based on faceId
    if ((i % 3) === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(
        80 + (i * 10), // Deterministic x position
        120 + (i * 8), // Deterministic y position
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    faceTextures[i] = texture;
  }
}

// Create the sumo ring
function createRing() {
  const squareBase = new THREE.BufferGeometry();
  squareBase.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    // Bottom (y=0): 4 vertices
    -SQUARE_BOTTOM_RADIUS,0,-SQUARE_BOTTOM_RADIUS,  
    SQUARE_BOTTOM_RADIUS,0,-SQUARE_BOTTOM_RADIUS,   
    SQUARE_BOTTOM_RADIUS,0,SQUARE_BOTTOM_RADIUS,    
    -SQUARE_BOTTOM_RADIUS,0,SQUARE_BOTTOM_RADIUS,
    // Top (y=1): 4 vertices
    -SQUARE_RING_RADIUS,RING_HEIGHT,-SQUARE_RING_RADIUS,  
    SQUARE_RING_RADIUS,RING_HEIGHT,-SQUARE_RING_RADIUS,   
    SQUARE_RING_RADIUS,RING_HEIGHT,SQUARE_RING_RADIUS,    
    -SQUARE_RING_RADIUS,RING_HEIGHT,SQUARE_RING_RADIUS
  ]), 3));
  squareBase.setIndex([
    0,1,2, 0,2,3,    // bottom face
    4,6,5, 4,7,6,    // top face
    0,4,5, 0,5,1,    // front vertical
    1,5,6, 1,6,2,    // right vertical
    2,6,7, 2,7,3,    // back vertical
    3,7,4, 3,4,0     // left vertical
  ]);
  squareBase.computeVertexNormals();
  
  // Create texture for the clay-like material with subtle variations
  const clayTexture = new THREE.CanvasTexture(createClayTexture());
  
  const baseMesh = new THREE.Mesh(squareBase, new THREE.MeshStandardMaterial({ 
    color: 0xD9B382, // Warmer clay color
    roughness: 0.8,
    metalness: 0.1,
    map: clayTexture
  }));
  baseMesh.position.y = -0.05;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  scene.add(baseMesh);

  // Dohyo cylinder with more realistic material
  const ringGeometry = new THREE.CylinderGeometry(RING_RADIUS, RING_RADIUS, RING_HEIGHT, 64);
  const ringTexture = new THREE.CanvasTexture(createDohyoTexture());
  
  const ringMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xD9B382, 
    roughness: 0.7,
    metalness: 0.1,
    map: ringTexture
  });
  
  ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = RING_HEIGHT / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  scene.add(ring);

  // Traditional straw border (tawara)
  const tawaraGeometry = new THREE.TorusGeometry(RING_RADIUS + 0.05, 0.25, 16, 64);
  const tawaraMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xC9A165, // Straw color
    roughness: 0.9,
    metalness: 0.0,
    map: createStrawTexture()
  });
  
  const tawara = new THREE.Mesh(tawaraGeometry, tawaraMaterial);
  tawara.position.y = RING_HEIGHT - 0.2;
  tawara.rotation.x = Math.PI / 2;
  tawara.receiveShadow = true;
  tawara.castShadow = true;
  scene.add(tawara);

  // Create shikirisen (starting lines)
  const lineWidth = 0.1;
  const lineDepth = RING_RADIUS * 0.6;
  const lineGeometry = new THREE.BoxGeometry(lineWidth, 0.02, lineDepth);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  
  // Create two starting lines
  const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
  line1.position.set(-0.75, RING_HEIGHT + 0.01, 0);
  scene.add(line1);
  
  const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
  line2.position.set(0.75, RING_HEIGHT + 0.01, 0);
  scene.add(line2);

  // Create center circle (nakabashira)
  const centerCircleGeometry = new THREE.CircleGeometry(0.5, 32);
  const centerCircleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  
  const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = RING_HEIGHT + 0.02;
  scene.add(centerCircle);

  // Add traditional corner markers (hyoushigi)
  const markerPositions = [
    {x: 0, z: RING_RADIUS * 0.8}, // North
    {x: RING_RADIUS * 0.8, z: 0}, // East
    {x: 0, z: -RING_RADIUS * 0.8}, // South
    {x: -RING_RADIUS * 0.8, z: 0}  // West
  ];
  
  markerPositions.forEach(pos => {
    const markerGeometry = new THREE.BoxGeometry(0.3, 0.03, 0.3);
    const markerMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x000000,
      roughness: 0.5,
      metalness: 0.2
    });
    
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(pos.x, RING_HEIGHT + 0.015, pos.z);
    scene.add(marker);
  });
}

// Helper function to create a texture for the clay surface
function createClayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#D9B382';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add subtle noise for clay texture
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 2 + 0.5;
    
    // Randomly vary the clay color
    const variation = Math.random() * 15 - 7;
    const r = 217 + variation;
    const g = 179 + variation;
    const b = 130 + variation;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas;
}

// Helper function to create a texture for the dohyo top surface
function createDohyoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#D9B382';
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Draw circular boundary
  ctx.strokeStyle = '#BF9E76';
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.arc(512, 512, 450, 0, Math.PI * 2);
  ctx.stroke();
  
  // Add salt scatter pattern (subtle white dots)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  
  for (let i = 0; i < 2000; i++) {
    // Keep salt mostly in the center area
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 350; // Within the ring
    const x = 512 + Math.cos(angle) * distance;
    const y = 512 + Math.sin(angle) * distance;
    const radius = Math.random() * 2 + 0.5;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add footprint-like marks (subtle indentations)
  ctx.fillStyle = 'rgba(185, 152, 115, 0.3)';
  
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 400; // Within the ring
    const x = 512 + Math.cos(angle) * distance;
    const y = 512 + Math.sin(angle) * distance;
    
    // Create oval-shaped footprint
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI * 2);
    ctx.scale(1, 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, 15 + Math.random() * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  return canvas;
}

// Helper function to create a straw texture for the tawara
function createStrawTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Base color
  ctx.fillStyle = '#C9A165';
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw straw-like lines
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 256;
    ctx.strokeStyle = `rgba(${150 + Math.random() * 60}, ${110 + Math.random() * 50}, ${40 + Math.random() * 40}, 0.7)`;
    ctx.lineWidth = 1 + Math.random();
    
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  
  // Add horizontal bindings
  for (let i = 0; i < 10; i++) {
    const y = i * 25 + Math.random() * 10;
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3 + Math.random() * 2;
    
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Create audience areas but use InstancedMesh for the seats to reduce overhead.
 */
function createAudienceAreas() {
  const NUM_ROWS = 20;

  // We'll keep the old platform approach for elevation, but each platform is a single Mesh
  // The seats themselves are turned into InstancedMeshes for benches & mats

  // Materials for benches/mats
  const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown wood
  const matMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 });   // Red mat

  // Single geometry for bench
  const benchGeometry = new THREE.BoxGeometry(BENCH_WIDTH * 0.9, BENCH_HEIGHT, BENCH_DEPTH * 0.9);
  // Single geometry for mat
  const matGeometry = new THREE.BoxGeometry(BENCH_WIDTH * 0.8, 0.05, BENCH_DEPTH * 0.8);

  // We'll calculate total seat count so we can create InstancedMesh with correct capacity
  let totalSeats = 0;
  const sides = ['North','East','West','South'];
  sides.forEach(() => {
    for (let rowIndex = 0; rowIndex < NUM_ROWS; rowIndex++) {
      const seatsInRow = SEATS_PER_FIRST_ROW + (rowIndex * SEATS_INCREMENT);
      totalSeats += seatsInRow;
    }
  });
  // We do 4 sides, so totalSeats accounts for that above

  // Create InstancedMesh for benches & mats
  const benchInstancedMesh = new THREE.InstancedMesh(benchGeometry, benchMaterial, totalSeats);
  const matInstancedMesh = new THREE.InstancedMesh(matGeometry, matMaterial, totalSeats);
  benchInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  matInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  let seatIndex = 0;

  // We'll keep the same side definitions
  const sideData = [
    { name: 'North', rotation: 0, x: 0, z: -1 },
    { name: 'East', rotation: Math.PI / 2, x: 1, z: 0 },
    { name: 'West', rotation: -Math.PI / 2, x: -1, z: 0 },
    { name: 'South', rotation: Math.PI, x: 0, z: 1 }
  ];

  sideData.forEach(side => {
    for (let rowIndex = 0; rowIndex < NUM_ROWS; rowIndex++) {
      // Row properties
      const distance = FIRST_ROW_DISTANCE + (rowIndex * ROW_SPACING);
      const seatsInRow = SEATS_PER_FIRST_ROW + (rowIndex * SEATS_INCREMENT);
      const elevationLevel = Math.floor(rowIndex / 2);
      const elevation = elevationLevel * ELEVATION_INCREMENT;

      // Create platform if elevated
      if (elevation > 0) {
        const platformWidth = BENCH_WIDTH * seatsInRow;
        const platformGeometry = new THREE.BoxGeometry(
          (side.z !== 0 ? platformWidth : BENCH_DEPTH),
          elevation,
          (side.x !== 0 ? platformWidth : BENCH_DEPTH)
        );
        const platform = new THREE.Mesh(platformGeometry, benchMaterial);

        if (side.x !== 0) {
          platform.position.set(side.x * distance, elevation / 2, 0);
        } else {
          platform.position.set(0, elevation / 2, side.z * distance);
        }
        scene.add(platform);
      }

      for (let i = 0; i < seatsInRow; i++) {
        // offset from center
        const offset = (i - (seatsInRow - 1) / 2) * BENCH_WIDTH;

        let x = 0, y = BENCH_HEIGHT / 2, z = 0;
        if (elevation > 0) y += elevation;

        if (side.x !== 0) {
          x = side.x * distance;
          z = offset;
        } else {
          x = offset;
          z = side.z * distance;
        }

        // Build a transform matrix for the bench
        const benchMatrix = new THREE.Matrix4();
        benchMatrix.makeTranslation(x, y, z);
        benchMatrix.multiply(new THREE.Matrix4().makeRotationY(side.rotation));

        // For the mat, we place it slightly above the bench
        const matMatrix = benchMatrix.clone();
        // We can shift the mat up a little bit
        const matOffset = new THREE.Matrix4().makeTranslation(0, BENCH_HEIGHT / 2 + 0.025, 0);
        matMatrix.multiply(matOffset);

        // Set the instance matrix
        benchInstancedMesh.setMatrixAt(seatIndex, benchMatrix);
        matInstancedMesh.setMatrixAt(seatIndex, matMatrix);
        
        seatIndex++;
      }
    }
  });

  scene.add(benchInstancedMesh);
  scene.add(matInstancedMesh);
}

// Update the addPlayerToScene function to be more robust
function addPlayerToScene(player) {
  // First remove any existing model for this player
  if (playerModels[player.id]) {
    removePlayerFromScene(player.id);
  }

  // Ensure we have valid player data
  if (!player || !player.id || !player.role) {
    console.error('Invalid player data:', player);
    return;
  }

  const model = createSumoModel(player);
  if (!model) {
    console.error('Failed to create model for player:', player);
    return;
  }
  
  // Store complete player data in model's userData
  model.userData = {
    id: player.id,
    role: player.role,
    faceId: player.faceId,
    colorId: player.colorId,
    seed: player.seed
  };
  
  playerModels[player.id] = model;
  
  // Ensure proper initial positioning
  if (player.role === 'viewer') {
    positionViewer(model, player.seed);
  } else {
    model.position.set(
      player.position?.x || 0,
      player.position?.y || 2,
      player.position?.z || 0
    );
    model.rotation.y = player.rotation || 0;
  }
  
  scene.add(model);
}

// Create player model based on role
function createSumoModel(player) {
  if (!modelFactory) {
    console.error('ModelFactory not initialized!');
    return null;
  }
  try {
    return modelFactory.createPlayerModel(player);
  } catch (error) {
    console.error('Error creating player model:', error);
    return null;
  }
}

// Update the updatePlayerInScene function to handle role changes properly
function updatePlayerInScene(player) {
  if (!player || !player.id) {
    console.error('Invalid player data in updatePlayerInScene:', player);
    return;
  }

  const model = playerModels[player.id];
  
  // If no model exists or role has changed, create a new one
  if (!model || model.userData.role !== player.role) {
    addPlayerToScene(player);
    return;
  }

  // Update position & rotation based on role
  if (player.role === 'viewer') {
    positionViewer(model, player.seed);
  } else {
    // For fighters and referee, use provided position
    model.position.set(
      player.position?.x || 0,
      player.position?.y || 2,
      player.position?.z || 0
    );
  model.rotation.y = player.rotation || 0;
  }
}

// REMOVED: updateFighterReadyState(...) entirely

// Position viewer - now using player.seed instead of hashString
function positionViewer(model, viewerIndex) {
  // Find the player object from gameState
  const playerId = model.userData.id;
  const player = 
    gameState.viewers.find(v => v.id === playerId) ||
    gameState.fighters.find(f => f.id === playerId) ||
    (gameState.referee && gameState.referee.id === playerId ? gameState.referee : null);

  if (!player) return;

  // Use player.seed instead of viewerIndex for consistent positioning
  const seatIndex = player.seed % 60; // Limit to 60 seats for cycling

  // Calculate total seats per prioritized side (North, West, East)
  let totalSeatsPerSide = 0;
  for (let i = 0; i < 5; i++) {
    totalSeatsPerSide += (SEATS_PER_FIRST_ROW + (i * SEATS_INCREMENT));
  }
  
  // Determine which side and seat
  const sideOrder = [0, 2, 1]; // 0=North, 2=West, 1=East (prioritize these sides)
  const side = sideOrder[Math.floor(seatIndex / totalSeatsPerSide) % 3];
  const seatInSide = seatIndex % totalSeatsPerSide;
  
  // Find which row and seat in row
  let row = 0;
  let seatOffset = seatInSide;
  let seatsInCurrentRow = SEATS_PER_FIRST_ROW;
  
  while (seatOffset >= seatsInCurrentRow) {
    seatOffset -= seatsInCurrentRow;
    row++;
    seatsInCurrentRow = SEATS_PER_FIRST_ROW + (row * SEATS_INCREMENT);
  }
  
  // Calculate position
  let x, y, z, rotation;
  let distance = FIRST_ROW_DISTANCE + (row * ROW_SPACING);
  
  // Determine height (based on elevation level)
  const elevationLevel = Math.floor(row / 2);
  const elevation = elevationLevel * ELEVATION_INCREMENT;
  y = BENCH_HEIGHT + 0.5 + elevation; // Half height of sumo model + bench height + elevation
  
  // Calculate offset from center of row
  const seatsInRow = SEATS_PER_FIRST_ROW + (row * SEATS_INCREMENT);
  const offset = (seatOffset - (seatsInRow - 1) / 2) * BENCH_WIDTH;
  
  // Position based on side
  switch (side) {
    case 0: // North
      x = offset;
      z = -distance;
      rotation = Math.PI;
      break;
    case 1: // East
      x = distance;
      z = offset;
      rotation = -Math.PI / 2;
      break;
    case 2: // West
      x = -distance;
      z = offset;
      rotation = Math.PI / 2;
      break;
  }
  
  // Set position and rotation
  model.position.set(x, y, z);
  model.rotation.y = rotation;
  
  // ADDED: Store the base Y position for animation
  model.userData.baseY = y;
}

// Window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Update the camera system's cinematic bars if needed
  if (cameraSystem && cameraSystem.ceremonyCineBars) {
    document.body.removeChild(cameraSystem.ceremonyCineBars.container);
    cameraSystem.ceremonyCineBars = cameraSystem.createCinematicBars();
  }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const currentTime = Date.now();
  frameCount++;

  // Update camera system (this replaces the old camera angle code)
  if (!freeCameraMode && cameraSystem) {
    // Check if we're in the PRE_MATCH_CEREMONY stage and should switch to ceremony mode
    if (gameState.stage === 'PRE_MATCH_CEREMONY' && gameState.stageTimeRemaining <= 5000 &&
        cameraSystem.getCurrentMode() !== cameraSystem.MODES.CEREMONY) {
      
      // Get the participants for the ceremony
      const fighter1Model = gameState.fighters[0] ? playerModels[gameState.fighters[0].id] : null;
      const fighter2Model = gameState.fighters[1] ? playerModels[gameState.fighters[1].id] : null;
      const refereeModel = gameState.referee ? playerModels[gameState.referee.id] : null;
      
      if (fighter1Model && fighter2Model && refereeModel) {
        // Switch to ceremony mode
        cameraSystem.setMode(cameraSystem.MODES.CEREMONY, {
          fighter1: fighter1Model,
          fighter2: fighter2Model,
          referee: refereeModel
        });
      }
    }
    
    cameraSystem.update();
  }

  // Update FPS counter every 500ms
  if (currentTime - lastFpsUpdate > fpsUpdateInterval) {
    fps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
    document.getElementById('fps-counter').textContent = `${fps} FPS`;
    frameCount = 0;
    lastFpsUpdate = currentTime;
  }

  // Optional bobbing for viewers
  Object.values(playerModels).forEach(model => {
    if (model.userData.role === 'viewer') {
      const baseY = model.userData.baseY || model.position.y;
      const playerId = model.userData.id;
      const player = gameState.viewers.find(v => v.id === playerId);
      if (player) {
        model.position.y = baseY + Math.sin(Date.now() * 0.002 + player.seed * 0.1) * 0.1;
      }
    }

    // Emote bubble float
    const emoteBubble = model.getObjectByName('emoteBubble');
    if (emoteBubble && emoteBubble.visible) {
      emoteBubble.position.y = 2 + Math.sin(Date.now() * 0.003) * 0.1;
      const scaleFactor = 1 + Math.sin(Date.now() * 0.006) * 0.1;
      emoteBubble.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  });

  // Handle free camera controls
  if (freeCameraMode) {
    // Handle camera movement
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    if (cameraControls.moveForward) camera.position.addScaledVector(forward, CAMERA_MOVE_SPEED);
    if (cameraControls.moveBackward) camera.position.addScaledVector(forward, -CAMERA_MOVE_SPEED);
    if (cameraControls.moveRight) camera.position.addScaledVector(right, CAMERA_MOVE_SPEED);
    if (cameraControls.moveLeft) camera.position.addScaledVector(right, -CAMERA_MOVE_SPEED);
    if (cameraControls.moveUp) camera.position.y += CAMERA_MOVE_SPEED;
    if (cameraControls.moveDown) camera.position.y -= CAMERA_MOVE_SPEED;
    
    // Create euler angles for rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    
    // Handle camera rotation along world axes
    if (cameraControls.rotateLeft) euler.y += CAMERA_ROTATE_SPEED;
    if (cameraControls.rotateRight) euler.y -= CAMERA_ROTATE_SPEED;
    if (cameraControls.rotateUp) euler.x = Math.max(-Math.PI/2, euler.x - CAMERA_ROTATE_SPEED);
    if (cameraControls.rotateDown) euler.x = Math.min(Math.PI/2, euler.x + CAMERA_ROTATE_SPEED);
    
    // Apply the rotation
    camera.quaternion.setFromEuler(euler);
    
    // Update camera info display
    const infoDisplay = document.getElementById('camera-info');
    infoDisplay.innerHTML = `
      camera.position.set(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)});
      camera.rotation.set(${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)});
      camera.lookAt(${camera.getWorldDirection(new THREE.Vector3()).x.toFixed(2)}, ${camera.getWorldDirection(new THREE.Vector3()).y.toFixed(2)}, ${camera.getWorldDirection(new THREE.Vector3()).z.toFixed(2)});
      
    `;
  }

  renderer.render(scene, camera);
}

// Show match start animation
function showMatchStartAnimation() {
  // Create a text overlay
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 512, 256);
  
  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px "Sawarabi Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIGHT!', 256, 80);
  
  // Create a plane to display the text
  const geometry = new THREE.PlaneGeometry(10, 5);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });
  
  const matchStartPlane = new THREE.Mesh(geometry, material);
  matchStartPlane.position.set(0, 5, 0);
  matchStartPlane.name = 'matchStartPlane';
  scene.add(matchStartPlane);
  
  // Animate the plane
  let scale = 1;
  const animateInterval = setInterval(() => {
    scale += 0.05;
    matchStartPlane.scale.set(scale, scale, scale);
    matchStartPlane.material.opacity -= 0.02;
    
    if (matchStartPlane.material.opacity <= 0) {
      clearInterval(animateInterval);
      scene.remove(matchStartPlane);
    }
  }, 50);
  
  // Remove after a few seconds
  setTimeout(() => {
    clearInterval(animateInterval);
    scene.remove(matchStartPlane);
  }, 3000);
}

// Show match end animation
function showMatchEndAnimation(winnerId, loserId, reason) {
  // Create the regular match end text overlay
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 512, 256);
  
  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px "Sawarabi Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MATCH OVER!', 256, 80);
  
  ctx.font = '30px "Sawarabi Mincho", serif';
  if (winnerId) {
    const winnerName = winnerId.substring(0, 6);
    ctx.fillText(`Winner: ${winnerName}`, 256, 150);
    
    if (reason === 'disconnect') {
      ctx.font = '20px "Sawarabi Mincho", serif';
      ctx.fillText('(Opponent disconnected)', 256, 190);
    }
  }
  
  // Create and add the text plane
  const geometry = new THREE.PlaneGeometry(10, 5);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });
  
  const matchEndPlane = new THREE.Mesh(geometry, material);
  matchEndPlane.position.set(0, 5, 0);
  matchEndPlane.name = 'matchEndPlane';
  scene.add(matchEndPlane);
  
  // Start the loser's falling animation
  if (loserId && playerModels[loserId]) {
    startLoserFallAnimation(playerModels[loserId]);
  }
  
  // Remove the text plane after animation
  setTimeout(() => {
    scene.remove(matchEndPlane);
  }, 5000);
}

// Update the startLoserFallAnimation function
function startLoserFallAnimation(loserModel) {
  // Store initial position and rotation for reference
  const initialPos = loserModel.position.clone();
  const initialRot = loserModel.rotation.clone();
  
  // Calculate direction vector away from ring center
  const directionOut = new THREE.Vector3(
    initialPos.x,
    0,
    initialPos.z
  ).normalize();
  
  // Initialize physics state
  const fallState = {
    verticalVelocity: FALL_PHYSICS.INITIAL_UPWARD_VELOCITY,
    rotationX: 0,
    rotationZ: 0,
    time: 0,
    isResting: false
  };
  
  // Create an animation function
  function animateLoserFall() {
    if (!fallState.isResting) {
      // Update vertical position with gravity
      fallState.verticalVelocity -= FALL_PHYSICS.GRAVITY;
      loserModel.position.y += fallState.verticalVelocity;
      
      // Check for floor collision
      if (loserModel.position.y < 0) {
        loserModel.position.y = 0;  // Prevent going below floor
        
        // Handle bounce
        if (Math.abs(fallState.verticalVelocity) > FALL_PHYSICS.MIN_BOUNCE_VELOCITY) {
          fallState.verticalVelocity = -fallState.verticalVelocity * FALL_PHYSICS.BOUNCE_DAMPING;
          
          // Create bounce particles
          createBounceParticles(loserModel.position);
        } else {
          // Come to rest
          fallState.isResting = true;
          fallState.verticalVelocity = 0;
          loserModel.position.y = 0;
          
          // Create final impact particles
          createBounceParticles(loserModel.position, true);
          return;  // Stop animation when resting
        }
      }
      
      // Move outward from ring
      loserModel.position.x += directionOut.x * FALL_PHYSICS.FORWARD_MOMENTUM;
      loserModel.position.z += directionOut.z * FALL_PHYSICS.FORWARD_MOMENTUM;
      
      // Add tumbling rotation (reduced when on ground)
      const rotationMultiplier = loserModel.position.y < 0.5 ? 0.5 : 1;
      fallState.rotationX += FALL_PHYSICS.ROTATION_SPEED * (1 + Math.sin(fallState.time)) * rotationMultiplier;
      fallState.rotationZ += FALL_PHYSICS.ROTATION_SPEED * (1 + Math.cos(fallState.time)) * rotationMultiplier;
      
      // Apply rotations
      loserModel.rotation.x = initialRot.x + fallState.rotationX;
      loserModel.rotation.z = initialRot.z + fallState.rotationZ;
      
      // Update time
      fallState.time += 0.1;
      
      // Continue animation
      requestAnimationFrame(animateLoserFall);
    }
  }
  
  // Add dramatic pause before starting fall
      setTimeout(() => {
    // Optional: Add a small upward bump before falling
    loserModel.position.y += 0.2;
    
    // Start the falling animation
    animateLoserFall();
    
    // Create initial fall particles
    createFallParticles(loserModel);
  }, 500); // Half second delay before fall starts
}

// Add a new function for bounce particles
function createBounceParticles(position, isFinal = false) {
  const particleCount = isFinal ? 30 : 15;
  const particles = new THREE.BufferGeometry();
  
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  
  // Initialize particles around the impact point
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = position.x;
    positions[i3 + 1] = 0.1; // Slightly above ground
    positions[i3 + 2] = position.z;
    
    // Radial velocity for bounce particles
    const angle = (Math.random() * Math.PI * 2);
    const speed = 0.1 + Math.random() * 0.1;
    velocities.push({
      x: Math.cos(angle) * speed,
      y: 0.1 + Math.random() * 0.1,
      z: Math.sin(angle) * speed
    });
  }
  
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  // Create particle material
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xCCCCCC,
    size: 0.05,
    opacity: 0.8,
    transparent: true
  });
  
  // Create particle system
  const particleSystem = new THREE.Points(particles, particleMaterial);
  scene.add(particleSystem);
  
  // Animate particles
  function animateParticles() {
    const positions = particles.attributes.position.array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Update positions
      positions[i3] += velocities[i].x;
      positions[i3 + 1] += velocities[i].y;
      positions[i3 + 2] += velocities[i].z;
      
      // Add gravity effect
      velocities[i].y -= 0.01;
      
      // Ground collision
      if (positions[i3 + 1] < 0) {
        positions[i3 + 1] = 0;
        velocities[i].y = 0;
      }
      
      // Fade out
      particleMaterial.opacity *= 0.98;
    }
    
    particles.attributes.position.needsUpdate = true;
    
    // Continue animation until particles fade out
    if (particleMaterial.opacity > 0.1) {
      requestAnimationFrame(animateParticles);
    } else {
      scene.remove(particleSystem);
      particles.dispose();
      particleMaterial.dispose();
    }
  }
  
  // Start particle animation
  animateParticles();
}

// Show match draw animation
function showMatchDrawAnimation() {
  // Create a text overlay
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 512, 256);
  
  // Draw text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 40px "Sawarabi Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TIME UP!', 256, 80);
  
  ctx.font = '30px "Sawarabi Mincho", serif';
  ctx.fillText('Match ended in a draw', 256, 150);
  
  // Create a plane to display the text
  const geometry = new THREE.PlaneGeometry(10, 5);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });
  
  const drawPlane = new THREE.Mesh(geometry, material);
  drawPlane.position.set(0, 5, 0);
  drawPlane.name = 'drawPlane';
  scene.add(drawPlane);
  
  // Remove after a few seconds
  setTimeout(() => {
    scene.remove(drawPlane);
  }, 5000);
}

// Remove player from scene
function removePlayerFromScene(playerId) {
  const model = playerModels[playerId];
  if (model) {
    scene.remove(model);
    // Properly dispose of geometries and materials
    if (model.geometry) model.geometry.dispose();
    if (model.material) {
      if (Array.isArray(model.material)) {
        model.material.forEach(mat => mat.dispose());
      } else {
        model.material.dispose();
      }
    }
    // Remove any textures
    if (model.userData.textures) {
      model.userData.textures.forEach(texture => texture.dispose());
    }
    delete playerModels[playerId];
  }
}

// Show player emote (optimized)
function showPlayerEmote(playerId, emoteType) {
  const model = playerModels[playerId];
  if (!model) return;

  const textBubble = model.getObjectByName('textBubble');
  if (!textBubble) return;

  if (emoteType) {
    // Show emote through text bubble
    textBubble.visible = true;
    textBubble.material.opacity = 1;

    // Use minimal canvas size to reduce whitespace
    const canvasWidth = 480;
    const canvasHeight = 240;
    messageCanvas.width = canvasWidth;
    messageCanvas.height = canvasHeight;
    
    // Clear canvas
    messageCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw speech bubble - minimal padding
    messageCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    roundRect(messageCtx, 2, 2, canvasWidth-4, canvasHeight-4, 20);
    messageCtx.fill();
    
    // Add border
    messageCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    messageCtx.lineWidth = 4;
    roundRect(messageCtx, 2, 2, canvasWidth-4, canvasHeight-4, 20);
    messageCtx.stroke();

    // Draw emote text with LARGE font
    messageCtx.fillStyle = 'black';
    messageCtx.font = 'bold 90px Arial'; // Very large font
    messageCtx.textAlign = 'center';
    messageCtx.textBaseline = 'middle';
    
    // Draw the emote
    messageCtx.fillText(emoteType, canvasWidth / 2, canvasHeight / 2);

    // Reuse texture if possible
    if (!textBubble.material.map) {
      textBubble.material.map = new THREE.CanvasTexture(messageCanvas);
    } else {
      textBubble.material.map.needsUpdate = true;
    }
    
    // Scale based on emote length
    const scaleFactor = Math.min(1.5, Math.max(1.0, Math.sqrt(emoteType.length) / 6));
    textBubble.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Make sure the bubble faces the camera
    textBubble.lookAt(camera.position);
  } else {
    // Hide emote
    textBubble.visible = false;
    textBubble.material.opacity = 0;
  }
}

// Show player message with minimal whitespace and large text
function showPlayerMessage(playerId, message) {
  const model = playerModels[playerId];
  if (!model) return;

  const textBubble = model.getObjectByName('textBubble');
  if (!textBubble) return;

  if (message) {
    // Show message
    textBubble.visible = true;
    textBubble.material.opacity = 1;

    // Use minimal canvas size to reduce whitespace
    const canvasWidth = 480;
    const canvasHeight = 240;
    messageCanvas.width = canvasWidth;
    messageCanvas.height = canvasHeight;
    
    // Clear canvas
    messageCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw speech bubble - minimal padding
    messageCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    roundRect(messageCtx, 2, 2, canvasWidth-4, canvasHeight-4, 20);
    messageCtx.fill();
    
    // Add border
    messageCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    messageCtx.lineWidth = 4;
    roundRect(messageCtx, 2, 2, canvasWidth-4, canvasHeight-4, 20);
    messageCtx.stroke();

    // Draw text with LARGE font
    messageCtx.fillStyle = 'black';
    messageCtx.font = 'bold 90px Arial'; // Very large font
    messageCtx.textAlign = 'center';
    messageCtx.textBaseline = 'middle';
    
    // Calculate appropriate font size based on message length
    const fontSize = Math.min(90, Math.max(48, 300 / Math.sqrt(message.length)));
    messageCtx.font = `bold ${Math.floor(fontSize)}px Arial`;
    
    // Word wrap with minimal margins
    const words = message.split(' ');
    let line = '';
    let y = canvasHeight / 2; // Start at center
    const maxWidth = canvasWidth - 20; // Very little margin
    const lineHeight = fontSize * 1.1; // Tight line height
    
    // For multi-line text, start higher up
    const estimatedLines = Math.ceil(message.length / 15);
    if (estimatedLines > 1) {
      y = (canvasHeight / 2) - ((estimatedLines - 1) * lineHeight / 2);
    }

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = messageCtx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        messageCtx.fillText(line, canvasWidth/2, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    messageCtx.fillText(line, canvasWidth/2, y);

    // Add a speech bubble tail
    messageCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    messageCtx.beginPath();
    messageCtx.moveTo(canvasWidth/2, canvasHeight-2);
    messageCtx.lineTo(canvasWidth/2-30, canvasHeight+30);
    messageCtx.lineTo(canvasWidth/2+30, canvasHeight+30);
    messageCtx.closePath();
    messageCtx.fill();
    
    messageCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    messageCtx.lineWidth = 4;
    messageCtx.beginPath();
    messageCtx.moveTo(canvasWidth/2, canvasHeight-2);
    messageCtx.lineTo(canvasWidth/2-30, canvasHeight+30);
    messageCtx.lineTo(canvasWidth/2+30, canvasHeight+30);
    messageCtx.closePath();
    messageCtx.stroke();

    // Reuse texture if possible
    if (!textBubble.material.map) {
      textBubble.material.map = new THREE.CanvasTexture(messageCanvas);
    } else {
      textBubble.material.map.needsUpdate = true;
    }
    
    // Scale based on message length
    const scaleFactor = Math.min(1.5, Math.max(1.0, Math.sqrt(message.length) / 6));
    textBubble.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Make sure the bubble faces the camera
    textBubble.lookAt(camera.position);
  } else {
    // Hide message
    textBubble.visible = false;
    textBubble.material.opacity = 0;
  }
}

// Helper function for drawing rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'undefined') {
    radius = 5;
  }
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

// Add this function after the other initialization code
function createFpsDisplay() {
  const statsContainer = document.createElement('div');
  statsContainer.id = 'stats-container';
  statsContainer.style.cssText = `
    position: fixed;
    top: 10px;
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
}

// Add this function to update the socket stats display
function updateSocketStats(stats) {
  const statsDiv = document.getElementById('socket-stats');
  if (!statsDiv) return;

  let html = '';
  Object.entries(stats).forEach(([event, count]) => {
    html += `${event}: ${count}<br>`;
  });
  statsDiv.innerHTML = html;
}

// Update the toggleFreeCamera function to clean up cinematics
function toggleFreeCamera() {
  freeCameraMode = !freeCameraMode;
  const infoDisplay = document.getElementById('camera-info');
  infoDisplay.style.display = freeCameraMode ? 'block' : 'none';
  
  if (freeCameraMode) {
    // Store original camera position for restoration
    originalCameraPosition = camera.position.clone();
    originalCameraRotation = camera.rotation.clone();
  } else {
    // Return control to the camera system
    cameraSystem.updateCameraForCurrentMode(0);
  }
}

// Add these keyboard handler functions
function handleKeyDown(event) {
  if (!freeCameraMode) return;
  
  switch(event.key.toLowerCase()) {
    case 'w': cameraControls.moveForward = true; break;
    case 's': cameraControls.moveBackward = true; break;
    case 'a': cameraControls.moveLeft = true; break;
    case 'd': cameraControls.moveRight = true; break;
    case 'q': cameraControls.moveDown = true; break;
    case 'e': cameraControls.moveUp = true; break;
    case 'arrowleft': cameraControls.rotateLeft = true; break;
    case 'arrowright': cameraControls.rotateRight = true; break;
    case 'arrowup': cameraControls.rotateUp = true; break;
    case 'arrowdown': cameraControls.rotateDown = true; break;
    case 'f': toggleFreeCamera(); break;
  }
}

function handleKeyUp(event) {
  if (!freeCameraMode) return;
  
  switch(event.key.toLowerCase()) {
    case 'w': cameraControls.moveForward = false; break;
    case 's': cameraControls.moveBackward = false; break;
    case 'a': cameraControls.moveLeft = false; break;
    case 'd': cameraControls.moveRight = false; break;
    case 'q': cameraControls.moveDown = false; break;
    case 'e': cameraControls.moveUp = false; break;
    case 'arrowleft': cameraControls.rotateLeft = false; break;
    case 'arrowright': cameraControls.rotateRight = false; break;
    case 'arrowup': cameraControls.rotateUp = false; break;
    case 'arrowdown': cameraControls.rotateDown = false; break;
  }
}

/**
 * Creates and sets up the camera information display
 * This is used to show position and rotation information when in free camera mode
 * @returns {HTMLElement} The info display container
 */
function createCameraInfoDisplay() {
  const infoContainer = document.createElement('div');
  infoContainer.id = 'camera-info';
  infoContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    font-family: monospace;
    font-size: 14px;
    padding: 10px;
    border-radius: 4px;
    z-index: 1000;
    display: none;
  `;
  
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Toggle Free Camera (F)';
  toggleButton.style.cssText = `
    position: fixed;
    top: 10px;
    right: 200px;
    padding: 5px 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    border: 1px solid white;
    border-radius: 4px;
    cursor: pointer;
    z-index: 1000;
  `;
  
  document.body.appendChild(infoContainer);
  document.body.appendChild(toggleButton);
  
  toggleButton.addEventListener('click', toggleFreeCamera);
  return infoContainer;
}

// Add this new function to create the stadium walls
function createStadiumWalls() {
  // Calculate the distance to the last row of audience seating
  const lastRowDistance = FIRST_ROW_DISTANCE + (19 * ROW_SPACING); // 20th row (index 19)
  
  // Create the stadium walls using the factory
  const stadium = StadiumFactory.createStadiumWalls(RING_RADIUS, lastRowDistance);
  scene.add(stadium);
}

// Update the updatePlayerPosition function to handle Z-axis movement
function updatePlayerPosition(playerId, position, rotation) {
  const playerModel = playerModels[playerId];
  if (!playerModel) return;
  
  // Update all three position coordinates
  playerModel.position.set(
    position.x, 
    position.y, 
    position.z !== undefined ? position.z : 0 // Handle legacy data
  );
  
  // Apply rotation - the server now sends the actual angle
  if (rotation !== undefined) {
    playerModel.rotation.y = rotation;
  }
}

// Add this function to properly clean up all models
function cleanupAllModels() {
  // Remove all existing models from the scene
  Object.entries(playerModels).forEach(([playerId, model]) => {
    scene.remove(model);
    // Properly dispose of geometries and materials
    if (model.geometry) model.geometry.dispose();
    if (model.material) {
      if (Array.isArray(model.material)) {
        model.material.forEach(mat => mat.dispose());
      } else {
        model.material.dispose();
      }
    }
    // Remove any textures
    if (model.userData.textures) {
      model.userData.textures.forEach(texture => texture.dispose());
    }
  });
  
  // Clear the playerModels object
  playerModels = {};
}