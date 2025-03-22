// Three.js renderer code
let scene, camera, renderer;
let ring, playerModels = {};
let textureLoader;
let faceTextures = [];

// Initialize the 3D scene
function initScene(initialGameState) {
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Sky blue background
  
  // Create camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 15);
  camera.lookAt(0, 0, 0);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('game-container').appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);
  
  // Create texture loader
  textureLoader = new THREE.TextureLoader();
  
  // Load face textures
  for (let i = 0; i < 10; i++) {
    const texture = textureLoader.load(`/assets/face${i}.png`, () => {}, 
      () => {
        // If loading fails, create a fallback texture
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = `hsl(${i * 36}, 100%, 50%)`;
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = 'black';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i, 64, 64);
        
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        faceTextures[i] = fallbackTexture;
      }
    );
    faceTextures[i] = texture;
  }
  
  // Create the sumo ring
  createRing();
  
  // Create the audience areas
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

// Create the sumo ring
function createRing() {
  const ringGeometry = new THREE.CylinderGeometry(5, 5, 0.5, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({ color: 0xD2B48C }); // Tan color
  ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = -0.25; // Half of the height
  scene.add(ring);
  
  // Add ring border
  const borderGeometry = new THREE.TorusGeometry(5, 0.2, 16, 100);
  const borderMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown color
  const border = new THREE.Mesh(borderGeometry, borderMaterial);
  border.position.y = 0;
  border.rotation.x = Math.PI / 2;
  scene.add(border);
  
  // Add ring markings
  const markingsGeometry = new THREE.CircleGeometry(4, 32);
  const markingsMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.3
  });
  const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
  markings.position.y = 0.01;
  markings.rotation.x = -Math.PI / 2;
  scene.add(markings);
}

// Create audience areas
function createAudienceAreas() {
  // Left audience area
  const leftAreaGeometry = new THREE.BoxGeometry(2, 0.5, 10);
  const leftAreaMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4 }); // Steel blue
  const leftArea = new THREE.Mesh(leftAreaGeometry, leftAreaMaterial);
  leftArea.position.set(-8, -0.25, 0);
  scene.add(leftArea);
  
  // Right audience area
  const rightAreaGeometry = new THREE.BoxGeometry(2, 0.5, 10);
  const rightAreaMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4 });
  const rightArea = new THREE.Mesh(rightAreaGeometry, rightAreaMaterial);
  rightArea.position.set(8, -0.25, 0);
  scene.add(rightArea);
  
  // Top audience area
  const topAreaGeometry = new THREE.BoxGeometry(10, 0.5, 2);
  const topAreaMaterial = new THREE.MeshStandardMaterial({ color: 0x4682B4 });
  const topArea = new THREE.Mesh(topAreaGeometry, topAreaMaterial);
  topArea.position.set(0, -0.25, -8);
  scene.add(topArea);
}

// Create a sumo wrestler model
function createSumoModel(player) {
  const group = new THREE.Group();
  
  // Body (sphere)
  const bodyGeometry = new THREE.SphereGeometry(1, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Gold color for the sumo mawashi
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);
  
  // Head (smaller sphere)
  const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4C4 }); // Bisque color
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1;
  group.add(head);
  
  // Face (use texture)
  const faceGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  const faceMaterial = new THREE.MeshBasicMaterial({ 
    map: faceTextures[player.faceTexture] || faceTextures[0],
    transparent: true
  });
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.position.set(0, 1, 0.51); // Slightly in front of the head
  group.add(face);
  
  // Arms
  const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 16);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4C4 });
  
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.8, 0.2, 0);
  leftArm.rotation.z = Math.PI / 4;
  group.add(leftArm);
  
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.8, 0.2, 0);
  rightArm.rotation.z = -Math.PI / 4;
  group.add(rightArm);
  
  // Legs
  const legGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0xFFE4C4 });
  
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.4, -0.8, 0);
  group.add(leftLeg);
  
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.4, -0.8, 0);
  group.add(rightLeg);
  
  // Add emote bubble (hidden by default)
  const bubbleGeometry = new THREE.SphereGeometry(0.4, 16, 16);
  const bubbleMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.8
  });
  const emoteBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
  emoteBubble.position.set(0, 2, 0);
  emoteBubble.visible = false;
  emoteBubble.name = 'emoteBubble';
  group.add(emoteBubble);
  
  // Add text bubble (hidden by default)
  const textBubbleGeometry = new THREE.PlaneGeometry(2, 0.8);
  const textBubbleMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.8
  });
  const textBubble = new THREE.Mesh(textBubbleGeometry, textBubbleMaterial);
  textBubble.position.set(0, 2.2, 0);
  textBubble.visible = false;
  textBubble.name = 'textBubble';
  group.add(textBubble);
  
  // Set initial position and rotation
  group.position.set(
    player.position.x,
    player.position.y,
    player.position.z
  );
  group.rotation.y = player.rotation || 0;
  
  // Add role indicator
  let roleMaterial;
  if (player.role === 'fighter') {
    roleMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 }); // Red for fighters
  } else if (player.role === 'referee') {
    roleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black for referee
  } else {
    roleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF }); // Blue for viewers
  }
  
  const roleIndicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 16),
    roleMaterial
  );
  roleIndicator.position.y = 2;
  roleIndicator.name = 'roleIndicator';
  group.add(roleIndicator);
  
  return group;
}

// Add a player to the scene
function addPlayerToScene(player) {
  const model = createSumoModel(player);
  
  // Position based on role
  if (player.role === 'fighter') {
    // Fighters are on the ring
    model.position.set(player.position.x, 0, player.position.z);
  } else if (player.role === 'referee') {
    // Referee is in the middle of the ring
    model.position.set(0, 0, 0);
    // Make referee smaller
    model.scale.set(0.8, 0.8, 0.8);
  } else {
    // Viewers are positioned around the ring
    const viewerCount = gameState.viewers.length;
    const viewerIndex = gameState.viewers.findIndex(v => v.id === player.id);
    
    if (viewerIndex !== -1) {
      // Position viewers in a circle around the ring
      if (viewerIndex < 10) {
        // Left side
        model.position.set(-8, 0, -4 + viewerIndex);
        model.rotation.y = 0; // Face right
      } else if (viewerIndex < 20) {
        // Right side
        model.position.set(8, 0, -4 + (viewerIndex - 10));
        model.rotation.y = Math.PI; // Face left
      } else {
        // Top side
        model.position.set(-4 + (viewerIndex - 20), 0, -8);
        model.rotation.y = Math.PI / 2; // Face down
      }
    }
  }
  
  scene.add(model);
  playerModels[player.id] = model;
}

// Remove a player from the scene
function removePlayerFromScene(playerId) {
  const model = playerModels[playerId];
  if (model) {
    scene.remove(model);
    delete playerModels[playerId];
  }
}

// Update a player's position and rotation
function updatePlayerPosition(playerId, position, rotation) {
  const model = playerModels[playerId];
  if (model) {
    model.position.x = position.x;
    model.position.y = position.y;
    model.position.z = position.z;
    
    if (rotation !== undefined) {
      model.rotation.y = rotation;
    }
  }
}

// Show an emote for a player
function showPlayerEmote(playerId, emoteType) {
  const model = playerModels[playerId];
  if (!model) return;
  
  const emoteBubble = model.getObjectByName('emoteBubble');
  if (!emoteBubble) return;
  
  if (emoteType) {
    emoteBubble.visible = true;
    
    // Change color based on emote type
    const material = emoteBubble.material;
    switch (emoteType) {
      case 'cheer':
        material.color.set(0xFFFF00); // Yellow
        break;
      case 'laugh':
        material.color.set(0x00FF00); // Green
        break;
      case 'surprise':
        material.color.set(0xFF00FF); // Purple
        break;
      case 'angry':
        material.color.set(0xFF0000); // Red
        break;
      default:
        material.color.set(0xFFFFFF); // White
    }
  } else {
    emoteBubble.visible = false;
  }
}

// Show a message for a player
function showPlayerMessage(playerId, message) {
  const model = playerModels[playerId];
  if (!model) return;
  
  const textBubble = model.getObjectByName('textBubble');
  if (!textBubble) return;
  
  if (message) {
    textBubble.visible = true;
    
    // Create a canvas texture for the text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    roundRect(ctx, 5, 5, 246, 118, 10, true, true);
    
    // Draw text
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap the text
    const words = message.split(' ');
    let line = '';
    let y = 40;
    const maxWidth = 230;
    const lineHeight = 24;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, 128, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 128, y);
    
    // Apply the canvas as a texture
    const texture = new THREE.CanvasTexture(canvas);
    textBubble.material.map = texture;
    textBubble.material.needsUpdate = true;
  } else {
    textBubble.visible = false;
  }
}

// Helper function to draw rounded rectangles
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

// Show round start animation
function showRoundStart(fighter1, fighter2) {
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
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROUND START!', 256, 80);
  
  ctx.font = '30px Arial';
  ctx.fillText(`${fighter1.id.substring(0, 6)} VS ${fighter2.id.substring(0, 6)}`, 256, 150);
  
  // Create a plane to display the text
  const geometry = new THREE.PlaneGeometry(10, 5);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });
  
  const roundStartPlane = new THREE.Mesh(geometry, material);
  roundStartPlane.position.set(0, 5, 0);
  roundStartPlane.name = 'roundStartPlane';
  scene.add(roundStartPlane);
  
  // Remove after a few seconds
  setTimeout(() => {
    scene.remove(roundStartPlane);
  }, 3000);
}

// Show round end animation
function showRoundEnd(winnerId, loserId) {
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
  ctx.font = 'bold 40px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ROUND OVER!', 256, 80);
  
  ctx.font = '30px Arial';
  if (winnerId) {
    ctx.fillText(`Winner: ${winnerId.substring(0, 6)}`, 256, 150);
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
  
  const roundEndPlane = new THREE.Mesh(geometry, material);
  roundEndPlane.position.set(0, 5, 0);
  roundEndPlane.name = 'roundEndPlane';
  scene.add(roundEndPlane);
  
  // Remove after a few seconds
  setTimeout(() => {
    scene.remove(roundEndPlane);
  }, 3000);
}

// Update the scene when roles change
function updateScene() {
  // Remove all existing player models
  Object.keys(playerModels).forEach(id => {
    scene.remove(playerModels[id]);
    delete playerModels[id];
  });
  
  // Add fighters
  gameState.fighters.forEach(fighter => {
    addPlayerToScene(fighter);
  });
  
  // Add referee
  if (gameState.referee) {
    addPlayerToScene(gameState.referee);
  }
  
  // Add viewers
  gameState.viewers.forEach(viewer => {
    addPlayerToScene(viewer);
  });
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Add any animations here (e.g., subtle movements for viewers)
  Object.values(playerModels).forEach(model => {
    // Find the player data for this model
    const playerId = Object.keys(playerModels).find(key => playerModels[key] === model);
    const player = gameState.fighters.find(f => f.id === playerId) || 
                  gameState.viewers.find(v => v.id === playerId) ||
                  (gameState.referee && gameState.referee.id === playerId ? gameState.referee : null);
    
    if (player && player.role === 'viewer') {
      // Make viewers bob up and down slightly
      model.position.y = Math.sin(Date.now() * 0.002 + parseInt(playerId.substring(0, 8), 16)) * 0.1;
    }
    
    // Make emote bubbles float and pulse
    const emoteBubble = model.getObjectByName('emoteBubble');
    if (emoteBubble && emoteBubble.visible) {
      emoteBubble.position.y = 2 + Math.sin(Date.now() * 0.003) * 0.1;
      emoteBubble.scale.set(
        1 + Math.sin(Date.now() * 0.006) * 0.1,
        1 + Math.sin(Date.now() * 0.006) * 0.1,
        1 + Math.sin(Date.now() * 0.006) * 0.1
      );
    }
  });
  
  renderer.render(scene, camera);
} 