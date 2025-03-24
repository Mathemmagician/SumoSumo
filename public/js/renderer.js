// At the very top of renderer.js, add:
window.removePlayerFromScene = removePlayerFromScene;
window.showPlayerEmote = showPlayerEmote;
window.showPlayerMessage = showPlayerMessage;
window.addPlayerToScene = addPlayerToScene;
window.updatePlayerInScene = updatePlayerInScene;

// Three.js renderer code
let scene, camera, renderer;
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
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
let fpsUpdateInterval = 500; // Update FPS every 500ms
let lastFpsUpdate = performance.now();

// Add these near the top with other constants
const CAMERA_ROTATION_SPEED = 0.002; // Adjust this value to change rotation speed
const CAMERA_DISTANCE = 30; // Distance from center
const CAMERA_HEIGHT = 15;   // Height of camera
let cameraAngle = 0;       // Current angle of rotation

// Add near the top with other constants
const CEREMONY_ZOOM_DURATION = 1000; // 1 second per zoom
const FACE_ZOOM_DISTANCE = 3;    // How close to zoom to faces
const FACE_ZOOM_HEIGHT = 1.5;    // Slightly above eye level
let ceremonyCameraActive = false;
let originalCameraPosition = null;
let cameraTarget = new THREE.Vector3();
let ceremonyStartTime = 0;

// Update near the top with other constants
const FIGHTER1_HOLD_TIME = 2000; // 2 seconds on first fighter
const FIGHTER2_HOLD_TIME = 2000; // 2 seconds on second fighter
const REFEREE_HOLD_TIME = 1000;  // 1 second on referee

// Add this near the top with other variables
let modelFactory;

/**
 * Initialize the 3D scene. We only want to do this once.
 */
function initScene(initialGameState) {
  // ADDED: Check if scene is already initialized
  if (sceneInitialized) {
    console.warn('initScene() was called more than once! Skipping re-initialization.');
    return;
  }
  sceneInitialized = true; // Mark as inited

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue background

  // Create camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(CAMERA_DISTANCE, CAMERA_HEIGHT, 0); // Start position
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Enhanced lighting setup
  setupLighting();

  // Create texture loader
  textureLoader = new THREE.TextureLoader();

  // Generate face textures dynamically and initialize ModelFactory
  generateFaceTextures();
  modelFactory = new ModelFactory(faceTextures);

  // Create the sumo ring
  createRing();

  // Create the audience areas (using InstancedMesh)
  createAudienceAreas();

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

  // Start animation loop
  animate();

  // Handle window resize
  window.addEventListener('resize', onWindowResize);
}

// Setup lighting
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xf5e1c0, 0.4);
  scene.add(ambientLight);

  // Main spotlight
  const mainSpotlight = new THREE.SpotLight(0xffffff, 1.0);
  mainSpotlight.position.set(0, 30, 0);
  mainSpotlight.angle = Math.PI / 6;
  mainSpotlight.penumbra = 0.3;
  mainSpotlight.decay = 1.5;
  mainSpotlight.distance = 50;
  mainSpotlight.castShadow = true;
  mainSpotlight.shadow.mapSize.width = 1024;
  mainSpotlight.shadow.mapSize.height = 1024;
  mainSpotlight.shadow.camera.near = 10;
  mainSpotlight.shadow.camera.far = 50;
  mainSpotlight.target.position.set(0, 0, 0);
  scene.add(mainSpotlight);
  scene.add(mainSpotlight.target);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0xffcc88, 0.6);
  fillLight.position.set(RING_RADIUS * 2, RING_RADIUS, RING_RADIUS * 2);
  fillLight.castShadow = true;
  fillLight.shadow.mapSize.width = 1024;
  fillLight.shadow.mapSize.height = 1024;
  scene.add(fillLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0x8888ff, 0.5);
  rimLight.position.set(-RING_RADIUS * 2, RING_RADIUS, -RING_RADIUS * 2);
  scene.add(rimLight);

  // Bounce light
  const bounceLight = new THREE.DirectionalLight(0xffffcc, 0.2);
  bounceLight.position.set(0, -5, 0);
  bounceLight.target.position.set(0, 0, 0);
  scene.add(bounceLight);
  scene.add(bounceLight.target);
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
  scene.add(new THREE.Mesh(squareBase, new THREE.MeshLambertMaterial({ color: 0xD2B48C })));

  // Dohyo cylinder
  const ringGeometry = new THREE.CylinderGeometry(RING_RADIUS, RING_RADIUS, RING_HEIGHT, 32);
  const ringMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C });
  ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = RING_HEIGHT / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  scene.add(ring);

  // Border
  const borderGeometry = new THREE.RingGeometry(RING_RADIUS, RING_RADIUS + 0.5, 32);
  const borderMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x8B4513,
    side: THREE.DoubleSide
  });
  const border = new THREE.Mesh(borderGeometry, borderMaterial);
  border.rotation.x = Math.PI / 2;
  border.position.y = RING_HEIGHT + 0.01;
  border.receiveShadow = true;
  scene.add(border);

  // Markings
  const markingsGeometry = new THREE.CircleGeometry(RING_RADIUS * 0.8, 32);
  const markingsMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
  markings.rotation.x = Math.PI / 2;
  markings.position.y = RING_HEIGHT + 0.02;
  scene.add(markings);

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const floorMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xBF924A,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
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

// Add player to scene
function addPlayerToScene(player) {
  const model = createSumoModel(player);
  if (!model) {
    console.error('Failed to create model for player:', player);
    return;
  }
  playerModels[player.id] = model;
  updatePlayerInScene(player);
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

// Update player in scene
function updatePlayerInScene(player) {
  const model = playerModels[player.id];
  if (!model) return;

  // Check if role changed
  if (model.userData.role !== player.role) {
    // Remove old model
    scene.remove(model);
    
    // Create new model with updated role
    const newModel = createSumoModel(player);
    playerModels[player.id] = newModel;
    scene.add(newModel);
    
    // Update position based on new role
    if (player.role === 'viewer') {
      positionViewer(newModel, player.seed);
    } else {
      newModel.position.set(player.position.x, player.position.y, player.position.z);
      newModel.rotation.y = player.rotation || 0;
    }
    
    return; // Exit early since we've handled everything for the new model
  }

  // If role hasn't changed, just update position & rotation
  if (player.role === 'viewer') {
    positionViewer(model, player.seed);
  } else {
    model.position.set(player.position.x, player.position.y, player.position.z);
  }
  model.rotation.y = player.rotation || 0;
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
  let x = 0, y = 0, z = 0;
  let rotation = 0;
  
  // Determine row distance
  const distance = FIRST_ROW_DISTANCE + (row * ROW_SPACING);
  
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
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const currentTime = Date.now();
  frameCount++;

  // Handle ceremony camera if active
  if (gameState.stage === 'PRE_MATCH_CEREMONY' && gameState.stageTimeRemaining) {
    updateCeremonyCamera(gameState.stageTimeRemaining);
  }

  // Only update regular camera if ceremony camera is not active
  if (!ceremonyCameraActive) {
    // Update camera position
    cameraAngle += CAMERA_ROTATION_SPEED;
    camera.position.x = Math.cos(cameraAngle) * CAMERA_DISTANCE;
    camera.position.z = Math.sin(cameraAngle) * CAMERA_DISTANCE;
    camera.position.y = CAMERA_HEIGHT;
    camera.lookAt(0, 0, 0);
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
  ctx.fillText('MATCH OVER!', 256, 80);
  
  ctx.font = '30px "Sawarabi Mincho", serif';
  if (winnerId) {
    const winnerName = winnerId.substring(0, 6);
    ctx.fillText(`Winner: ${winnerName}`, 256, 150);
    
    if (reason === 'disconnect') {
      ctx.font = '20px "Sawarabi Mincho", serif';
      ctx.fillText('(Opponent disconnected)', 256, 190);
    }
  } else {
    ctx.fillText('No winner', 256, 150);
  }
  
  // Create a plane to display the text
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
  
  // Remove after a few seconds
  setTimeout(() => {
    scene.remove(matchEndPlane);
  }, 5000);
  
  // If I'm the winner, add a crown to my model
  if (winnerId === gameState.myId) {
    const myModel = playerModels[gameState.myId];
    if (myModel) {
      const crownGeometry = new THREE.ConeGeometry(0.3, 0.5, 4);
      const crownMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
      const crown = new THREE.Mesh(crownGeometry, crownMaterial);
      crown.position.y = 1.8;
      crown.name = 'victoryCrown';
      myModel.add(crown);
      
      // Remove the crown after the victory ceremony
      setTimeout(() => {
        const crown = myModel.getObjectByName('victoryCrown');
        if (crown) {
          myModel.remove(crown);
        }
      }, 8000);
    }
  }
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

// Example of texture-based mesh creation
function createTexturedMaterial(texturePath) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      texturePath,
      (texture) => {
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 1
        });
        resolve(material);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        reject(error);
      }
    );
  });
}

async function createTexturedMesh() {
  try {
    const material = await createTexturedMaterial('path/to/texture.jpg');
    const geometry = new THREE.PlaneGeometry(10, 5);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
  } catch (error) {
    console.error('Failed to create textured mesh:', error);
  }
}

// Remove player from scene
function removePlayerFromScene(playerId) {
  const model = playerModels[playerId];
  if (model) {
    scene.remove(model);
    delete playerModels[playerId];
  }
}

// Show player emote (optimized)
function showPlayerEmote(playerId, emoteType) {
  const model = playerModels[playerId];
  if (!model) return;

  const emoteBubble = model.getObjectByName('emoteBubble');
  if (!emoteBubble) return;

  if (emoteType) {
    // Show emote
    emoteBubble.visible = true;
    emoteBubble.material.opacity = 1;

    // Clear canvas
    emoteCtx.clearRect(0, 0, 128, 128);

    // Draw emote
    emoteCtx.fillStyle = 'white';
    emoteCtx.fillRect(0, 0, 128, 128);
    emoteCtx.fillStyle = 'black';
    emoteCtx.font = 'bold 80px Arial';
    emoteCtx.textAlign = 'center';
    emoteCtx.textBaseline = 'middle';
    emoteCtx.fillText(emoteType, 64, 64);

    // Reuse texture if possible
    if (!emoteBubble.material.map) {
      emoteBubble.material.map = new THREE.CanvasTexture(emoteCanvas);
    } else {
      emoteBubble.material.map.needsUpdate = true;
    }
  } else {
    // Hide emote
    emoteBubble.visible = false;
    emoteBubble.material.opacity = 0;
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

// Expose necessary functions to global scope
window.removePlayerFromScene = removePlayerFromScene;
window.showPlayerEmote = showPlayerEmote;
window.showPlayerMessage = showPlayerMessage;
window.addPlayerToScene = addPlayerToScene;
window.updatePlayerInScene = updatePlayerInScene;

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

// Simplified camera sequence function
function updateCeremonyCamera(timeRemaining) {
  // Start sequence at 5 seconds remaining
  if (timeRemaining <= 5000 && !ceremonyCameraActive) {
    ceremonyCameraActive = true;
    ceremonyStartTime = Date.now();
    originalCameraPosition = camera.position.clone();
  }

  if (!ceremonyCameraActive) return;

  const elapsedTime = Date.now() - ceremonyStartTime;
  
  // Get all players
  const fighter1 = gameState.fighters[0];
  const fighter2 = gameState.fighters[1];
  const referee = gameState.referee;

  if (!fighter1 || !fighter2 || !referee) {
    ceremonyCameraActive = false;
    return;
  }

  const fighter1Model = playerModels[fighter1.id];
  const fighter2Model = playerModels[fighter2.id];
  const refereeModel = playerModels[referee.id];

  // Calculate camera position for all players
  const allModels = [fighter1Model, fighter2Model, refereeModel];
  const centerPoint = new THREE.Vector3();
  
  allModels.forEach(model => {
    if (model) {
      centerPoint.add(model.position);
    }
  });
  centerPoint.divideScalar(allModels.length);

  // Determine current phase and instantly set camera position
  if (elapsedTime < FIGHTER1_HOLD_TIME) {
    // First fighter
    setInstantCameraPosition(fighter1Model, allModels);
  } else if (elapsedTime < FIGHTER1_HOLD_TIME + FIGHTER2_HOLD_TIME) {
    // Second fighter
    setInstantCameraPosition(fighter2Model, allModels);
  } else if (elapsedTime < FIGHTER1_HOLD_TIME + FIGHTER2_HOLD_TIME + REFEREE_HOLD_TIME) {
    // Referee
    setInstantCameraPosition(refereeModel, allModels);
  } else {
    // Reset camera
    ceremonyCameraActive = false;
    camera.position.copy(originalCameraPosition);
    camera.lookAt(centerPoint);
  }
}

// Helper function to instantly set camera position
function setInstantCameraPosition(targetModel, allModels) {
  if (!targetModel) return;

  // Calculate center point of all models
  const centerPoint = new THREE.Vector3();
  allModels.forEach(model => {
    if (model) {
      centerPoint.add(model.position);
    }
  });
  centerPoint.divideScalar(allModels.length);

  // Calculate direction from center to target
  const modelPosition = targetModel.position.clone();
  const direction = modelPosition.clone().sub(centerPoint).normalize();
  
  // Set camera position to look at target from appropriate angle
  camera.position.copy(modelPosition)
    .add(direction.multiplyScalar(FACE_ZOOM_DISTANCE));
  camera.position.y = modelPosition.y + FACE_ZOOM_HEIGHT;
  
  // Look at the target model's face
  camera.lookAt(modelPosition);

  // Slightly rotate camera to show other players in background
  const targetToCenter = centerPoint.clone().sub(modelPosition).normalize();
  const rightVector = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
  camera.position.add(rightVector.multiplyScalar(0.5)); // Offset camera slightly to side
  camera.lookAt(modelPosition); // Keep looking at target
}