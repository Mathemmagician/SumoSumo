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
  // Create the sumo ring (dohyo)
  const ringGeometry = new THREE.CylinderGeometry(10, 10, 0.5, 32); // Updated radius to 10
  const ringMaterial = new THREE.MeshLambertMaterial({ color: 0xD2B48C }); // Tan color
  ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.y = 0.25; // Half of the height
  scene.add(ring);
  
  // Add a ring border
  const borderGeometry = new THREE.RingGeometry(10, 10.5, 32); // Updated radius to match
  const borderMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x8B4513,
    side: THREE.DoubleSide
  });
  const border = new THREE.Mesh(borderGeometry, borderMaterial);
  border.rotation.x = Math.PI / 2; // Lay flat
  border.position.y = 0.51; // Just above the ring
  scene.add(border);
  
  // Add ring markings (lines)
  const markingsGeometry = new THREE.CircleGeometry(8, 32); // Inner circle
  const markingsMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
  markings.rotation.x = Math.PI / 2; // Lay flat
  markings.position.y = 0.52; // Just above the ring
  scene.add(markings);
  
  // Add the floor around the ring
  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  const floorMaterial = new THREE.MeshLambertMaterial({ 
    color: 0x333333,
    side: THREE.DoubleSide
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = Math.PI / 2; // Lay flat
  floor.position.y = 0; // At the bottom
  scene.add(floor);
}

// Create audience areas
function createAudienceAreas() {
  // Create benches for the audience
  const benchGeometry = new THREE.BoxGeometry(2, 0.5, 1);
  const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brown
  
  // First row of benches - around the ring
  const benchPositions = [
    // Left side (10 benches)
    { x: -15, z: -4 }, { x: -15, z: -2 }, { x: -15, z: 0 }, { x: -15, z: 2 }, { x: -15, z: 4 },
    { x: -15, z: -6 }, { x: -15, z: -8 }, { x: -15, z: 6 }, { x: -15, z: 8 }, { x: -15, z: 10 },
    
    // Right side (10 benches)
    { x: 15, z: -4 }, { x: 15, z: -2 }, { x: 15, z: 0 }, { x: 15, z: 2 }, { x: 15, z: 4 },
    { x: 15, z: -6 }, { x: 15, z: -8 }, { x: 15, z: 6 }, { x: 15, z: 8 }, { x: 15, z: 10 },
    
    // Top side (10 benches)
    { x: -4, z: -15 }, { x: -2, z: -15 }, { x: 0, z: -15 }, { x: 2, z: -15 }, { x: 4, z: -15 },
    { x: -6, z: -15 }, { x: -8, z: -15 }, { x: 6, z: -15 }, { x: 8, z: -15 }, { x: 10, z: -15 }
  ];
  
  // Create first row of benches
  benchPositions.forEach(pos => {
    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
    bench.position.set(pos.x, 0.25, pos.z); // Half the height of the bench
    
    // Rotate benches to face the ring
    if (pos.x === -15) {
      bench.rotation.y = 0; // Left side benches face right
    } else if (pos.x === 15) {
      bench.rotation.y = Math.PI; // Right side benches face left
    } else {
      bench.rotation.y = Math.PI / 2; // Top side benches face down
    }
    
    scene.add(bench);
  });
  
  // Second row of benches - elevated and further back
  const secondRowBenchPositions = [
    // Left side (10 benches)
    { x: -18, z: -4 }, { x: -18, z: -2 }, { x: -18, z: 0 }, { x: -18, z: 2 }, { x: -18, z: 4 },
    { x: -18, z: -6 }, { x: -18, z: -8 }, { x: -18, z: 6 }, { x: -18, z: 8 }, { x: -18, z: 10 },
    
    // Right side (10 benches)
    { x: 18, z: -4 }, { x: 18, z: -2 }, { x: 18, z: 0 }, { x: 18, z: 2 }, { x: 18, z: 4 },
    { x: 18, z: -6 }, { x: 18, z: -8 }, { x: 18, z: 6 }, { x: 18, z: 8 }, { x: 18, z: 10 },
    
    // Top side (10 benches)
    { x: -4, z: -18 }, { x: -2, z: -18 }, { x: 0, z: -18 }, { x: 2, z: -18 }, { x: 4, z: -18 },
    { x: -6, z: -18 }, { x: -8, z: -18 }, { x: 6, z: -18 }, { x: 8, z: -18 }, { x: 10, z: -18 }
  ];
  
  // Create second row of benches (elevated)
  secondRowBenchPositions.forEach(pos => {
    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
    bench.position.set(pos.x, 1.5, pos.z); // Elevated position
    
    // Rotate benches to face the ring
    if (pos.x === -18) {
      bench.rotation.y = 0; // Left side benches face right
    } else if (pos.x === 18) {
      bench.rotation.y = Math.PI; // Right side benches face left
    } else {
      bench.rotation.y = Math.PI / 2; // Top side benches face down
    }
    
    scene.add(bench);
  });
  
  // Add platforms for the second row
  const platformGeometry = new THREE.BoxGeometry(3, 1, 20);
  const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 }); // Dark gray
  
  // Left platform
  const leftPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  leftPlatform.position.set(-18, 0.5, 1); // Position under the left benches
  scene.add(leftPlatform);
  
  // Right platform
  const rightPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  rightPlatform.position.set(18, 0.5, 1); // Position under the right benches
  scene.add(rightPlatform);
  
  // Top platform
  const topPlatform = new THREE.Mesh(platformGeometry, platformMaterial);
  topPlatform.rotation.y = Math.PI / 2; // Rotate to align with top benches
  topPlatform.position.set(1, 0.5, -18); // Position under the top benches
  scene.add(topPlatform);
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
  
  // Position the player based on their role
  if (player.role === 'fighter') {
    // Fighters are on the ring
    model.position.set(player.position.x, 0, player.position.z);
  } else if (player.role === 'referee') {
    // Referee is in the middle of the ring
    model.position.set(0, 0, 0);
    // Make referee smaller
    model.scale.set(0.8, 0.8, 0.8);
  } else {
    // Viewer positioning - now with two rows
    const viewerIndex = gameState.viewers.findIndex(v => v.id === player.id);
    
    if (viewerIndex !== -1) {
      // First 30 viewers go in the first row
      if (viewerIndex < 10) {
        // Left side - first row
        model.position.set(-15, 1, -4 + viewerIndex);
        model.rotation.y = 0; // Face right
      } else if (viewerIndex < 20) {
        // Right side - first row
        model.position.set(15, 1, -4 + (viewerIndex - 10));
        model.rotation.y = Math.PI; // Face left
      } else if (viewerIndex < 30) {
        // Top side - first row
        model.position.set(-4 + (viewerIndex - 20), 1, -15);
        model.rotation.y = Math.PI / 2; // Face down
      } else if (viewerIndex < 40) {
        // Left side - second row (elevated)
        model.position.set(-18, 2.25, -4 + (viewerIndex - 30));
        model.rotation.y = 0; // Face right
      } else if (viewerIndex < 50) {
        // Right side - second row (elevated)
        model.position.set(18, 2.25, -4 + (viewerIndex - 40));
        model.rotation.y = Math.PI; // Face left
      } else {
        // Top side - second row (elevated)
        model.position.set(-4 + (viewerIndex - 50), 2.25, -18);
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
  
  // Find or create an emote bubble for this player
  let emoteBubble = model.getObjectByName('emoteBubble');
  
  if (!emoteBubble) {
    // Create a new emote bubble
    const bubbleGeometry = new THREE.PlaneGeometry(1, 1);
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    emoteBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    emoteBubble.position.set(0, 2, 0);
    emoteBubble.name = 'emoteBubble';
    emoteBubble.visible = false;
    model.add(emoteBubble);
  }
  
  if (emoteType) {
    emoteBubble.visible = true;
    
    // Create a canvas texture for the emote
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw emote
    ctx.fillStyle = 'black';
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let emoteSymbol = '👍';
    switch (emoteType) {
      case 'cheer':
        emoteSymbol = '👏';
        break;
      case 'laugh':
        emoteSymbol = '😂';
        break;
      case 'surprise':
        emoteSymbol = '😮';
        break;
      case 'angry':
        emoteSymbol = '😠';
        break;
    }
    
    ctx.fillText(emoteSymbol, 64, 64);
    
    // Update the texture
    const texture = new THREE.CanvasTexture(canvas);
    emoteBubble.material.map = texture;
    emoteBubble.material.needsUpdate = true;
  } else {
    emoteBubble.visible = false;
  }
}

// Show a message for a player
function showPlayerMessage(playerId, message) {
  const model = playerModels[playerId];
  if (!model) return;
  
  // Find or create a text bubble for this player
  let textBubble = model.getObjectByName('textBubble');
  
  if (!textBubble) {
    // Create a new text bubble
    const bubbleGeometry = new THREE.PlaneGeometry(2, 1);
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    textBubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    textBubble.position.set(0, 2.5, 0);
    textBubble.name = 'textBubble';
    textBubble.visible = false;
    model.add(textBubble);
  }
  
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
    ctx.font = '20px "Sawarabi Mincho", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap the message
    const words = message.split(' ');
    let line = '';
    let y = 64;
    const lineHeight = 24;
    const maxWidth = 230;
    
    if (words.length === 1) {
      // Single word, just center it
      ctx.fillText(message, 128, 64);
    } else {
      // Multiple words, do word wrapping
      let lines = [];
      let currentLine = '';
      
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          lines.push(currentLine);
          currentLine = words[i] + ' ';
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      
      // Calculate starting Y based on number of lines
      const startY = 64 - ((lines.length - 1) * lineHeight / 2);
      
      // Draw each line
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], 128, startY + (i * lineHeight));
      }
    }
    
    // Update the texture
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

// Update fighter ready state
function updateFighterReadyState(fighterId, isReady) {
  const model = playerModels[fighterId];
  if (!model) return;
  
  // Add a visual indicator that the fighter is ready
  if (isReady) {
    // Create a ready indicator (e.g., a glowing aura)
    const readyGeometry = new THREE.RingGeometry(1.5, 1.7, 32);
    const readyMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00FF00,
      transparent: true,
      opacity: 0.7
    });
    const readyIndicator = new THREE.Mesh(readyGeometry, readyMaterial);
    readyIndicator.rotation.x = Math.PI / 2; // Lay flat
    readyIndicator.position.y = 0.1; // Just above the ground
    readyIndicator.name = 'readyIndicator';
    model.add(readyIndicator);
  } else {
    // Remove the ready indicator if it exists
    const readyIndicator = model.getObjectByName('readyIndicator');
    if (readyIndicator) {
      model.remove(readyIndicator);
    }
  }
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