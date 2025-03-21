class Game {
  constructor() {
    this.socket = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = document.getElementById('game-container');
    this.loadingElement = document.getElementById('loading');
    this.statusElement = document.getElementById('status');
    this.gameInfoElement = document.getElementById('game-info');
    this.emotePanel = document.getElementById('emote-panel');
    
    this.fighters = {};
    this.viewers = {};
    this.referee = null;
    this.ring = null;
    this.playerId = null;
    this.playerRole = 'viewer'; // 'viewer' or 'fighter'
    
    this.ringRadius = 5;
    this.isInitialized = false;
    
    this.init();
  }
  
  init() {
    // Initialize Three.js scene
    this.initScene();
    
    // Initialize socket connection
    this.initSocket();
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Start animation loop
    this.animate();
  }
  
  initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 15;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Create ring
    this.createRing();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  createRing() {
    // Create a traditional sumo dohyo with accurate details
    const ringGroup = new THREE.Group();
    
    // Square foundation platform (dohyo-damari)
    const foundationGeometry = new THREE.BoxGeometry(this.ringRadius * 2.5, this.ringRadius * 2.5, 0.3);
    const foundationMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Dark brown
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.set(0, 0, -0.3);
    ringGroup.add(foundation);
    
    // Add clay layer on top of foundation (slightly smaller square)
    const clayBaseGeometry = new THREE.BoxGeometry(this.ringRadius * 2.2, this.ringRadius * 2.2, 0.1);
    const clayBaseMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C }); // Tan clay color
    const clayBase = new THREE.Mesh(clayBaseGeometry, clayBaseMaterial);
    clayBase.position.set(0, 0, -0.1);
    ringGroup.add(clayBase);
    
    // Main circular clay ring (dohyo)
    const ringGeometry = new THREE.CircleGeometry(this.ringRadius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C }); // Tan clay color
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.position.set(0, 0, -0.05);
    ringGroup.add(this.ring);
    
    // Rice straw border (tawara)
    const borderGeometry = new THREE.RingGeometry(this.ringRadius - 0.2, this.ringRadius, 64);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 }); // Light straw color
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.set(0, 0, -0.04);
    ringGroup.add(border);
    
    // Add the four corner posts (tawara-zumiishi)
    this.createCornerPosts(ringGroup);
    
    // Rice bales markers (around the ring)
    this.createRiceBales(ringGroup);
    
    // Center circle (shikiri-sen)
    const centerCircleGeometry = new THREE.CircleGeometry(0.8, 32);
    const centerCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }); // Silver
    const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
    centerCircle.position.set(0, 0, -0.04);
    ringGroup.add(centerCircle);
    
    // Starting lines
    this.createStartingLines(ringGroup);
    
    // Add texture to the clay
    this.addRingTexture(this.ring);
    
    // Add the entire ring group to the scene
    this.scene.add(ringGroup);
  }
  
  createCornerPosts(ringGroup) {
    // Create the four corner posts (tawara-zumiishi)
    const postSize = 0.4;
    const postGeometry = new THREE.BoxGeometry(postSize, postSize, 0.15);
    const postMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 }); // Light straw color
    
    // Calculate position - slightly inside the square platform corners
    const postDistance = this.ringRadius * 1.05;
    
    // Create four posts at the corners
    const positions = [
      { x: postDistance, y: postDistance },
      { x: -postDistance, y: postDistance },
      { x: -postDistance, y: -postDistance },
      { x: postDistance, y: -postDistance }
    ];
    
    positions.forEach(pos => {
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(pos.x, pos.y, -0.1);
      ringGroup.add(post);
      
      // Add decorative lines on each post
      const lineGeometry = new THREE.PlaneGeometry(postSize - 0.05, 0.03);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
      
      for (let i = 0; i < 3; i++) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, 0.05 - i * 0.05, 0.08);
        post.add(line);
      }
    });
  }
  
  createRiceBales(ringGroup) {
    // Create rice bales (tawara) around the ring
    const baleCount = 20; // Number of bales around the ring
    const baleGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.2);
    const baleMaterial = new THREE.MeshBasicMaterial({ color: 0xF5DEB3 }); // Wheat color
    
    for (let i = 0; i < baleCount; i++) {
      const angle = (i / baleCount) * Math.PI * 2;
      const x = Math.cos(angle) * (this.ringRadius - 0.1);
      const y = Math.sin(angle) * (this.ringRadius - 0.1);
      
      const bale = new THREE.Mesh(baleGeometry, baleMaterial);
      bale.position.set(x, y, -0.05);
      bale.rotation.z = angle + Math.PI/2;
      ringGroup.add(bale);
      
      // Add straw texture lines to the bale
      const lineGeometry = new THREE.PlaneGeometry(0.45, 0.02);
      const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xDAA520 }); // Golden straw
      
      for (let j = 0; j < 3; j++) {
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.set(0, -0.05 + j * 0.05, 0.11);
        bale.add(line);
      }
    }
  }
  
  createStartingLines(ringGroup) {
    // Create starting lines (shikiri-sen)
    const lineGeometry = new THREE.PlaneGeometry(1, 0.1);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Left starting line
    const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
    leftLine.position.set(-1.5, 0, -0.04);
    ringGroup.add(leftLine);
    
    // Right starting line
    const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
    rightLine.position.set(1.5, 0, -0.04);
    ringGroup.add(rightLine);
    
    // Add salt piles near the starting lines
    this.createSaltPiles(ringGroup);
  }
  
  createSaltPiles(ringGroup) {
    // Create small salt piles near the starting lines
    const saltGeometry = new THREE.ConeGeometry(0.2, 0.15, 16);
    const saltMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Left salt pile
    const leftSalt = new THREE.Mesh(saltGeometry, saltMaterial);
    leftSalt.position.set(-2.2, 0, -0.05);
    leftSalt.rotation.x = Math.PI; // Flip the cone
    ringGroup.add(leftSalt);
    
    // Right salt pile
    const rightSalt = new THREE.Mesh(saltGeometry, saltMaterial);
    rightSalt.position.set(2.2, 0, -0.05);
    rightSalt.rotation.x = Math.PI; // Flip the cone
    ringGroup.add(rightSalt);
  }
  
  addRingTexture(ring) {
    // Create a canvas for the texture
    const textureSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const context = canvas.getContext('2d');
    
    // Base color
    context.fillStyle = '#D2B48C';
    context.fillRect(0, 0, textureSize, textureSize);
    
    // Add texture details - small dots and lines for clay texture
    context.fillStyle = '#C2A278';
    
    // Add small dots
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      const size = Math.random() * 2 + 1;
      context.fillRect(x, y, size, size);
    }
    
    // Add some lines to simulate raked clay
    context.strokeStyle = '#C2A278';
    context.lineWidth = 1;
    
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * textureSize;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(textureSize, y);
      context.stroke();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    // Apply texture to the ring
    ring.material.map = texture;
    ring.material.needsUpdate = true;
  }
  
  initSocket() {
    // Connect to the server
    this.socket = io();
    
    // Handle connection
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.playerId = this.socket.id;
    });
    
    // Handle initial game state
    this.socket.on('gameState', (gameState) => {
      this.handleGameState(gameState);
    });
    
    // Handle new viewer
    this.socket.on('newViewer', (viewerData) => {
      this.addViewer(viewerData);
    });
    
    // Handle user left
    this.socket.on('userLeft', (userId) => {
      this.removeUser(userId);
    });
    
    // Handle new fight
    this.socket.on('newFight', (fightData) => {
      this.startNewFight(fightData);
    });
    
    // Handle fight result
    this.socket.on('fightResult', (resultData) => {
      this.handleFightResult(resultData);
    });
    
    // Handle fighters returning to viewers
    this.socket.on('fightersReturnedToViewers', (data) => {
      this.handleFightersReturnedToViewers(data);
    });
    
    // Handle fighter updates
    this.socket.on('fighterUpdated', (fighterData) => {
      this.handleFighterUpdated(fighterData);
    });
    
    // Handle viewer emotes
    this.socket.on('viewerEmote', (emoteData) => {
      this.handleViewerEmote(emoteData);
    });
    
    // Handle viewer chat messages
    this.socket.on('viewerChat', (chatData) => {
      this.handleViewerChat(chatData);
    });
    
    // Handle sumo techniques
    this.socket.on('sumoTechniquePerformed', (data) => {
      this.handleSumoTechnique(data);
    });
    
    this.socket.on('fighterStaggered', (data) => {
      if (this.fighters[data.fighterId]) {
        this.fighters[data.fighterId].getStaggered();
      }
    });
    
    // Handle fighter collisions
    this.socket.on('fighterCollision', (data) => {
      this.handleFighterCollision(data);
    });
  }
  
  initEventListeners() {
    // Handle keyboard input for fighter movement
    document.addEventListener('keydown', (event) => {
      if (this.playerRole !== 'fighter') return;
      
      let direction = null;
      if (event.key === 'ArrowLeft') {
        direction = 'left';
      } else if (event.key === 'ArrowRight') {
        direction = 'right';
      }
      
      if (direction) {
        // Send movement to server
        this.socket.emit('fighterMove', { 
          direction: direction === 'left' ? -1 : 1,
          isStarting: true
        });
        
        // Start local animation immediately for responsive feel
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].startMoving(direction);
        }
      }
    });
    
    // Handle key up to stop movement
    document.addEventListener('keyup', (event) => {
      if (this.playerRole !== 'fighter') return;
      
      let direction = null;
      if (event.key === 'ArrowLeft') {
        direction = 'left';
      } else if (event.key === 'ArrowRight') {
        direction = 'right';
      }
      
      if (direction) {
        // Send stop movement to server
        this.socket.emit('fighterMove', { 
          direction: direction === 'left' ? -1 : 1,
          isStarting: false
        });
        
        // Stop local animation immediately
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].stopMoving(direction);
        }
      }
    });
    
    // Emote buttons for viewers
    const emoteButtons = document.querySelectorAll('.emote-btn');
    emoteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const emote = button.getAttribute('data-emote');
        this.socket.emit('emote', { emote });
        
        // Also show the emote locally
        if (this.viewers[this.playerId]) {
          this.viewers[this.playerId].emote(emote);
        }
      });
    });
    
    // Chat input
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    
    const sendChatMessage = () => {
      const message = chatInput.value.trim();
      if (message) {
        this.socket.emit('chatMessage', { message });
        
        // Show the message for the current player too
        if (this.playerRole === 'viewer' && this.viewers[this.playerId]) {
          this.viewers[this.playerId].chat(message);
        }
        
        // Clear the input
        chatInput.value = '';
      }
    };
    
    chatSendBtn.addEventListener('click', sendChatMessage);
    
    chatInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        sendChatMessage();
      }
    });
    
    // Sumo technique controls
    document.addEventListener('keydown', (event) => {
      if (this.playerRole !== 'fighter' || this.playerRole === 'transitioning') return;
      
      const fighter = this.fighters[this.playerId];
      if (!fighter) return;
      
      switch (event.key) {
        case 'q':
        case 'Q':
          // Shove technique
          fighter.performShove();
          break;
        case 'w':
        case 'W':
          // Slap technique
          fighter.performSlap();
          break;
        case 'e':
        case 'E':
          // Start charging
          fighter.startCharge();
          break;
        case 'r':
        case 'R':
          // Defend
          fighter.startDefending();
          break;
      }
    });
    
    document.addEventListener('keyup', (event) => {
      if (this.playerRole !== 'fighter' || this.playerRole === 'transitioning') return;
      
      const fighter = this.fighters[this.playerId];
      if (!fighter) return;
      
      switch (event.key) {
        case 'e':
        case 'E':
          // Release charge
          fighter.releaseCharge();
          break;
        case 'r':
        case 'R':
          // Stop defending
          fighter.stopDefending();
          break;
      }
    });
  }
  
  handleGameState(gameState) {
    // Create referee
    if (!this.referee) {
      this.referee = new Referee(gameState.referee.position, this.scene);
    }
    
    // Add existing viewers
    gameState.viewers.forEach(viewerData => {
      this.addViewer(viewerData);
    });
    
    // Add existing fighters
    gameState.fighters.forEach(fighterData => {
      this.addFighter(fighterData);
    });
    
    // Show appropriate UI elements
    this.loadingElement.classList.add('hidden');
    this.gameInfoElement.classList.remove('hidden');
    
    if (this.playerRole === 'viewer') {
      this.emotePanel.classList.remove('hidden');
    }
    
    this.isInitialized = true;
    
    // Update status
    this.updateStatus(gameState);
    
    // Show chat input for all players
    document.getElementById('chat-input-container').classList.remove('hidden');
  }
  
  addViewer(viewerData) {
    if (this.viewers[viewerData.id]) return;
    
    const viewer = new Viewer(
      viewerData.id,
      viewerData.position,
      viewerData.color,
      this.scene,
      this.container,
      this.camera
    );
    
    this.viewers[viewerData.id] = viewer;
    
    // Check if this is the current player
    if (viewerData.id === this.playerId) {
      this.playerRole = 'viewer';
      this.emotePanel.classList.remove('hidden');
      
      // Highlight the player's character
      viewer.highlight();
      
      // Add a "You" label to the status
      this.statusElement.innerHTML += '<br><span style="color: #ffff00;">You are a viewer</span>';
    }
  }
  
  addFighter(fighterData) {
    // First, remove the viewer if it exists
    if (this.viewers[fighterData.id]) {
      this.viewers[fighterData.id].remove();
      delete this.viewers[fighterData.id];
    }
    
    // Then check if fighter already exists
    if (this.fighters[fighterData.id]) return;
    
    const fighter = new SumoFighter(
      fighterData.id,
      fighterData.position,
      fighterData.color,
      this.scene
    );
    
    this.fighters[fighterData.id] = fighter;
    
    // Check if this is the current player
    if (fighterData.id === this.playerId) {
      this.playerRole = 'fighter';
      this.emotePanel.classList.add('hidden');
      
      // Highlight the player's character
      fighter.highlight();
      
      // Add a "You" label to the status
      this.statusElement.innerHTML = 'Fight in progress!<br><span style="color: #ffff00;">You are a fighter</span>';
    }
  }
  
  removeUser(userId) {
    // Remove from viewers
    if (this.viewers[userId]) {
      this.viewers[userId].remove();
      delete this.viewers[userId];
    }
    
    // Remove from fighters
    if (this.fighters[userId]) {
      this.fighters[userId].remove();
      delete this.fighters[userId];
    }
  }
  
  startNewFight(fightData) {
    // Add fighters
    this.addFighter(fightData.fighter1);
    this.addFighter(fightData.fighter2);
    
    // Update status
    this.statusElement.textContent = 'New fight starting!';
    
    // Referee animation
    if (this.referee) {
      this.referee.startFight();
    }
    
    // Display technique instructions for fighters
    if (this.playerRole === 'fighter') {
      this.showTechniqueInstructions();
    }
  }
  
  handleFightResult(result) {
    const { winnerId, loserId } = result;
    
    // Update status
    this.statusElement.textContent = `Fight ended! ${winnerId === this.playerId ? 'You won!' : 'Winner: ' + winnerId}`;
    
    // If this player was a fighter, immediately update their role to transitioning
    // This prevents any fighter controls from being active during the transition
    if (this.playerRole === 'fighter') {
      this.playerRole = 'transitioning';
      
      // Disable all fighter controls immediately
      this.disableFighterControls();
    }
    
    // Show victory animation for winner
    if (this.fighters[winnerId]) {
      this.fighters[winnerId].celebrate();
    }
    
    // Show defeat animation for loser
    if (this.fighters[loserId]) {
      this.fighters[loserId].defeat();
    }
  }
  
  handleFighterUpdated(fighterData) {
    if (this.fighters[fighterData.id]) {
      // Update the fighter's position
      this.fighters[fighterData.id].setPosition(fighterData.position);
      
      // Update movement state if needed
      if (fighterData.isMovingLeft !== undefined) {
        this.fighters[fighterData.id].isMovingLeft = fighterData.isMovingLeft;
      }
      if (fighterData.isMovingRight !== undefined) {
        this.fighters[fighterData.id].isMovingRight = fighterData.isMovingRight;
      }
    }
  }
  
  handleViewerEmote(emoteData) {
    const { viewerId, emote } = emoteData;
    
    if (this.viewers[viewerId] && viewerId !== this.playerId) {
      this.viewers[viewerId].emote(emote);
    }
  }
  
  updateStatus(gameState) {
    let statusText = '';
    
    if (gameState.currentFight) {
      statusText = 'Fight in progress!';
    } else if (gameState.viewers.length < 2) {
      statusText = 'Waiting for more players...';
    } else {
      statusText = 'Selecting fighters...';
    }
    
    this.statusElement.innerHTML = statusText;
    
    // Add player role indicator
    if (this.playerRole === 'viewer') {
      this.statusElement.innerHTML += '<br><span style="color: #ffff00;">You are a viewer</span>';
    } else if (this.playerRole === 'fighter') {
      this.statusElement.innerHTML += '<br><span style="color: #ffff00;">You are a fighter</span>';
    }
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update fighters
    Object.values(this.fighters).forEach(fighter => {
      fighter.update();
    });
    
    // Update viewers
    Object.values(this.viewers).forEach(viewer => {
      viewer.update();
    });
    
    // Update referee
    if (this.referee) {
      this.referee.update();
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  handleFightersReturnedToViewers(data) {
    // Update status
    this.statusElement.textContent = 'Selecting new fighters...';
    
    // Clear fighters from the scene
    Object.keys(this.fighters).forEach(fighterId => {
      this.fighters[fighterId].remove();
      delete this.fighters[fighterId];
    });
    
    // If this player was transitioning from fighter, update their role to viewer
    if (this.playerRole === 'transitioning' || this.playerRole === 'fighter') {
      this.playerRole = 'viewer';
      this.emotePanel.classList.remove('hidden');
    }
    
    // Add the returned fighters as viewers
    if (data.newViewers && Array.isArray(data.newViewers)) {
      data.newViewers.forEach(viewerData => {
        this.addViewer(viewerData);
      });
    }
  }
  
  handleViewerChat(chatData) {
    const { viewerId, message } = chatData;
    
    // Don't show the message for the sender (they already see it)
    if (viewerId !== this.playerId && this.viewers[viewerId]) {
      this.viewers[viewerId].chat(message);
    }
  }
  
  handleSumoTechnique(data) {
    const { fighterId, technique, targetId } = data;
    
    // If this is the player who performed the technique, we already animated it
    if (fighterId === this.playerId) return;
    
    // Otherwise, show the opponent performing the technique
    const fighter = this.fighters[fighterId];
    if (!fighter) return;
    
    switch (technique) {
      case 'shove':
        fighter.performShove();
        break;
      case 'slap':
        fighter.performSlap();
        break;
      case 'charge':
        // For charges from other players, we just show the result
        fighter.releaseCharge();
        break;
    }
  }
  
  showTechniqueInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'technique-instructions';
    instructions.innerHTML = `
      <h3>Sumo Techniques:</h3>
      <ul>
        <li><strong>Q</strong>: Shove (Oshi-dashi)</li>
        <li><strong>W</strong>: Slap (Harite)</li>
        <li><strong>E</strong>: Charge (Tachi-ai) - Hold to charge, release to attack</li>
        <li><strong>R</strong>: Defend - Hold to maintain defensive stance</li>
        <li><strong>←/→</strong>: Move left/right</li>
      </ul>
    `;
    
    this.container.appendChild(instructions);
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (this.container.contains(instructions)) {
        this.container.removeChild(instructions);
      }
    }, 10000);
  }
  
  handleFighterCollision(data) {
    const { fighter1Id, fighter2Id, intensity } = data;
    
    // Play collision sound
    this.playCollisionSound(intensity);
    
    // Visual feedback for collision
    if (this.fighters[fighter1Id]) {
      this.fighters[fighter1Id].collide(intensity);
    }
    
    if (this.fighters[fighter2Id]) {
      this.fighters[fighter2Id].collide(intensity);
    }
    
    // Camera shake effect for intense collisions
    if (intensity > 0.5) {
      this.shakeCamera(intensity);
    }
  }
  
  playCollisionSound(intensity) {
    // Create audio context if it doesn't exist
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create oscillator for collision sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    // Set sound properties based on intensity
    oscillator.type = 'sine';
    oscillator.frequency.value = 100 + intensity * 100; // Higher pitch for stronger hits
    
    gainNode.gain.value = Math.min(0.2, intensity * 0.3); // Limit volume
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Play sound
    oscillator.start();
    
    // Quick fade out
    gainNode.gain.exponentialRampToValueAtTime(
      0.001, this.audioContext.currentTime + 0.2
    );
    
    // Stop after fade out
    setTimeout(() => {
      oscillator.stop();
    }, 200);
  }
  
  shakeCamera(intensity) {
    // Save original camera position
    const originalPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };
    
    // Shake duration and max offset
    const duration = 300; // ms
    const maxOffset = intensity * 0.3;
    const startTime = Date.now();
    
    // Shake animation
    const shakeAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        // Random offset that decreases over time
        const factor = (1 - progress);
        const offsetX = (Math.random() * 2 - 1) * maxOffset * factor;
        const offsetY = (Math.random() * 2 - 1) * maxOffset * factor;
        
        // Apply shake
        this.camera.position.x = originalPosition.x + offsetX;
        this.camera.position.y = originalPosition.y + offsetY;
        
        // Continue animation
        requestAnimationFrame(shakeAnimation);
      } else {
        // Reset to original position
        this.camera.position.x = originalPosition.x;
        this.camera.position.y = originalPosition.y;
        this.camera.position.z = originalPosition.z;
      }
    };
    
    // Start shake animation
    shakeAnimation();
  }
  
  disableFighterControls() {
    // Remove any technique instructions that might be showing
    const instructionsElement = document.querySelector('.technique-instructions');
    if (instructionsElement && instructionsElement.parentNode) {
      instructionsElement.parentNode.removeChild(instructionsElement);
    }
    
    // Reset any active techniques or states
    const fighter = this.fighters[this.playerId];
    if (fighter) {
      if (fighter.isCharging) fighter.releaseCharge();
      if (fighter.isDefending) fighter.stopDefending();
    }
  }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
  new Game();
}); 