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
    // Create a traditional sumo dohyo
    const ringGroup = new THREE.Group();
    
    // Base platform (slightly larger than the ring)
    const baseGeometry = new THREE.CircleGeometry(this.ringRadius + 1, 64);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 }); // Dark brown
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, 0, -0.2);
    ringGroup.add(base);
    
    // Main clay ring
    const ringGeometry = new THREE.CircleGeometry(this.ringRadius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xD2B48C }); // Tan clay color
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.position.set(0, 0, -0.1);
    ringGroup.add(this.ring);
    
    // Rice straw border (tawara)
    const borderGeometry = new THREE.RingGeometry(this.ringRadius - 0.2, this.ringRadius, 64);
    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 }); // Light straw color
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.set(0, 0, -0.05);
    ringGroup.add(border);
    
    // Rice bales markers (around the ring)
    this.createRiceBales(ringGroup);
    
    // Center circle (shikiri-sen)
    const centerCircleGeometry = new THREE.CircleGeometry(0.8, 32);
    const centerCircleMaterial = new THREE.MeshBasicMaterial({ color: 0xC0C0C0 }); // Silver
    const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
    centerCircle.position.set(0, 0, -0.09);
    ringGroup.add(centerCircle);
    
    // Starting lines
    this.createStartingLines(ringGroup);
    
    // Add texture to the clay
    this.addRingTexture(this.ring);
    
    // Add the entire ring group to the scene
    this.scene.add(ringGroup);
  }
  
  createRiceBales(ringGroup) {
    // Create rice bales (tawara) around the ring
    const baleCount = 20; // Number of bales around the ring
    const baleGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.2);
    const baleMaterial = new THREE.MeshBasicMaterial({ color: 0xF5DEB3 }); // Wheat color
    
    for (let i = 0; i < baleCount; i++) {
      const angle = (i / baleCount) * Math.PI * 2;
      const x = Math.cos(angle) * (this.ringRadius + 0.1);
      const y = Math.sin(angle) * (this.ringRadius + 0.1);
      
      const bale = new THREE.Mesh(baleGeometry, baleMaterial);
      bale.position.set(x, y, -0.1);
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
    leftLine.position.set(-1.5, 0, -0.08);
    ringGroup.add(leftLine);
    
    // Right starting line
    const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
    rightLine.position.set(1.5, 0, -0.08);
    ringGroup.add(rightLine);
  }
  
  addRingTexture(ring) {
    // Add a subtle texture to the clay surface
    const textureSize = 100;
    const canvas = document.createElement('canvas');
    canvas.width = textureSize;
    canvas.height = textureSize;
    const context = canvas.getContext('2d');
    
    // Fill with base color
    context.fillStyle = '#D2B48C';
    context.fillRect(0, 0, textureSize, textureSize);
    
    // Add subtle grain texture
    context.fillStyle = '#C2A478';
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * textureSize;
      const y = Math.random() * textureSize;
      const size = Math.random() * 2 + 1;
      context.fillRect(x, y, size, size);
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
      this.updateFighter(fighterData);
    });
    
    // Handle viewer emotes
    this.socket.on('viewerEmote', (emoteData) => {
      this.handleViewerEmote(emoteData);
    });
    
    // Handle viewer chat messages
    this.socket.on('viewerChat', (chatData) => {
      this.handleViewerChat(chatData);
    });
  }
  
  initEventListeners() {
    // Keyboard controls for fighters
    document.addEventListener('keydown', (event) => {
      if (this.playerRole !== 'fighter') return;
      
      if (event.key === 'ArrowLeft') {
        this.socket.emit('fighterMove', { direction: -1 });
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].startMoving('left');
        }
      } else if (event.key === 'ArrowRight') {
        this.socket.emit('fighterMove', { direction: 1 });
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].startMoving('right');
        }
      }
    });
    
    document.addEventListener('keyup', (event) => {
      if (this.playerRole !== 'fighter') return;
      
      if (event.key === 'ArrowLeft') {
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].stopMoving('left');
        }
      } else if (event.key === 'ArrowRight') {
        if (this.fighters[this.playerId]) {
          this.fighters[this.playerId].stopMoving('right');
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
  }
  
  handleFightResult(resultData) {
    const { winnerId, loserId } = resultData;
    
    // Update status
    this.statusElement.textContent = `Fighter ${winnerId.substring(0, 4)} wins!`;
    
    // Winner celebration
    if (this.fighters[winnerId]) {
      this.fighters[winnerId].celebrate();
    }
    
    // Referee animation
    if (this.referee) {
      this.referee.declareFightResult(winnerId);
    }
  }
  
  updateFighter(fighterData) {
    if (this.fighters[fighterData.id]) {
      this.fighters[fighterData.id].setPosition(fighterData.position);
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
    
    // If this player was a fighter, update their role to viewer
    if (this.playerRole === 'fighter') {
      this.playerRole = 'viewer';
      this.emotePanel.classList.remove('hidden');
      
      // The player will be added back as a viewer by the server
      // We'll highlight them when they're added in the addViewer method
    }
  }
  
  handleViewerChat(chatData) {
    const { viewerId, message } = chatData;
    
    // Don't show the message for the sender (they already see it)
    if (viewerId !== this.playerId && this.viewers[viewerId]) {
      this.viewers[viewerId].chat(message);
    }
  }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
  new Game();
}); 