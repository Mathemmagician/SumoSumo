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

const SQUARE_RING_RADIUS = RING_RADIUS + 0.5;
const SQUARE_BOTTOM_RADIUS = SQUARE_RING_RADIUS + 0.7;

// BENCH/MAT constants for audience seats
// (used in createAudienceAreas() with InstancedMesh)
const BENCH_WIDTH = 2.0 * RING_RADIUS / 10; // default seats per first row = 10
const BENCH_HEIGHT = 0.1;
const BENCH_DEPTH = BENCH_WIDTH;
const ROW_SPACING = BENCH_WIDTH; // distance between rows

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
  camera.position.set(-5, 15, 25);
  camera.lookAt(0, 0, 0);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Enhanced lighting setup
  setupLighting();

  // Create texture loader
  textureLoader = new THREE.TextureLoader();

  // Generate face textures dynamically
  generateFaceTextures();

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
  for (let i = 0; i < 10; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Face background color
    ctx.fillStyle = `hsl(${i * 36}, 80%, 80%)`;
    ctx.fillRect(0, 0, 256, 256);

    // Draw eyes
    ctx.fillStyle = 'black';
    const eyeSize = 20 + Math.random() * 15;
    // Left eye
    ctx.beginPath();
    ctx.arc(90, 100, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(166, 100, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(60, 70);
    ctx.lineTo(120, 70 + (Math.random() > 0.5 ? -10 : 10));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(136, 70 + (Math.random() > 0.5 ? -10 : 10));
    ctx.lineTo(196, 70);
    ctx.stroke();

    // Mouth
    ctx.lineWidth = 6;
    const mouthStyle = Math.floor(Math.random() * 4);
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

    // Random details
    if (Math.random() > 0.7) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(
        80 + Math.random() * 100,
        120 + Math.random() * 80,
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
  const ELEVATION_INCREMENT = 0.8;
  const SEATS_PER_FIRST_ROW = 10;
  const SEATS_INCREMENT = 2;
  const FIRST_ROW_DISTANCE = RING_RADIUS * 1.3;

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
  playerModels[player.id] = model;
  updatePlayerInScene(player);
  scene.add(model);
}

// Create sumo model
function createSumoModel(player) {
  const numericId = hashString(player.id);

  const model = new THREE.Group();
  model.userData = {
    id: player.id,
    role: player.role
  };

  // Body
  const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  model.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const headMaterial = new THREE.MeshStandardMaterial({
    map: faceTextures[numericId % faceTextures.length]
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1;
  model.add(head);

  // Face plane
  const faceGeometry = new THREE.PlaneGeometry(1, 1);
  const faceMaterial = new THREE.MeshBasicMaterial({ 
    map: faceTextures[numericId % faceTextures.length],
    transparent: true
  });
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.position.set(0, 1, 0.51);
  model.add(face);

  // Arms
  const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 32);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.8, 0.2, 0);
  leftArm.rotation.z = Math.PI / 4;
  model.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.8, 0.2, 0);
  rightArm.rotation.z = -Math.PI / 4;
  model.add(rightArm);

  // Legs
  const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1, 32);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.4, -0.8, 0);
  model.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.4, -0.8, 0);
  model.add(rightLeg);

  // Emote bubble (hidden)
  const emoteBubbleGeometry = new THREE.PlaneGeometry(1, 1);
  const emoteBubbleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0
  });
  const emoteBubble = new THREE.Mesh(emoteBubbleGeometry, emoteBubbleMaterial);
  emoteBubble.position.set(0, 2, 0);
  emoteBubble.visible = false;
  emoteBubble.name = 'emoteBubble';
  model.add(emoteBubble);

  // Text bubble (hidden)
  const textBubbleGeometry = new THREE.PlaneGeometry(2, 1);
  const textBubbleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffffff,
    transparent: true,
    opacity: 0
  });
  const textBubble = new THREE.Mesh(textBubbleGeometry, textBubbleMaterial);
  textBubble.position.set(0, 2.5, 0);
  textBubble.visible = false;
  textBubble.name = 'textBubble';
  model.add(textBubble);

  // Set initial transform
  model.position.set(player.position.x, player.position.y, player.position.z);
  model.rotation.y = player.rotation || 0;

  return model;
}

// Update player in scene
function updatePlayerInScene(player) {
  const model = playerModels[player.id];
  if (!model) return;

  // Update position & rotation

  if (player.role === 'viewer') {
    const numericId = hashString(player.id);
    positionViewer(model, numericId);
  } else {
    model.position.set(player.position.x, player.position.y, player.position.z);
  }
  model.rotation.y = player.rotation || 0;

  // REMOVED: roleIndicator since we don't actually create it
  // if (roleIndicator) { ... }
}

// REMOVED: updateFighterReadyState(...) entirely

// Position viewer (used by updateScene() in some cases)
// Position viewer
function positionViewer(model, viewerIndex) {
  const NUM_ROWS = 5;
  const ELEVATION_INCREMENT = 0.8;
  const SEATS_PER_FIRST_ROW = 10;
  const SEATS_INCREMENT = 2;
  const FIRST_ROW_DISTANCE = RING_RADIUS * 1.3;
  
  // Calculate total seats per prioritized side (North, West, East)
  let totalSeatsPerSide = 0;
  for (let i = 0; i < NUM_ROWS; i++) {
    totalSeatsPerSide += (SEATS_PER_FIRST_ROW + (i * SEATS_INCREMENT));
  }
  
  // Determine which side and seat
  const sideOrder = [0, 2, 1]; // 0=North, 2=West, 1=East (prioritize these sides)
  const side = sideOrder[Math.floor(viewerIndex / totalSeatsPerSide) % 3];
  const seatInSide = viewerIndex % totalSeatsPerSide;
  
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

  // Optional bobbing for viewers
  Object.values(playerModels).forEach(model => {
    // We can do a mild bob, if role === 'viewer'
    // Must find the player from gameState, or skip
    // If gameState is globally accessible, do:
    const playerId = model.userData.id;
    const player =
      gameState.fighters.find(f => f.id === playerId) ||
      gameState.viewers.find(v => v.id === playerId) ||
      (gameState.referee && gameState.referee.id === playerId ? gameState.referee : null);

    if (player && player.role === 'viewer') {
      // Bob up and down slightly
      // Use a numeric ID approach for offset
      const numericId = parseInt(playerId.substring(0, 8), 16) || 0;
      // FIXED: Add bobbing to the base position instead of replacing it
      const baseY = model.userData.baseY || 0;
      model.position.y = baseY + Math.sin(Date.now() * 0.002 + numericId) * 0.1;
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


function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i); 
    // or any simple hashing approach
    hash |= 0; // force 32-bit
  }
  return Math.abs(hash); // make it positive
}