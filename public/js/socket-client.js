// Socket.io client code
let socket;
let gameState = {
  fighters: [],
  referee: null,
  viewers: [],
  myRole: 'viewer',
  myId: null,
  stage: 'WAITING_FOR_PLAYERS',
  stageTimer: null,
  stageTimeRemaining: 0
};

// Game stage display names (more user-friendly)
const STAGE_DISPLAY_NAMES = {
  'WAITING_FOR_PLAYERS': 'Waiting for Players',
  'FIGHTER_SELECTION': 'Selecting Fighters',
  'PRE_MATCH_CEREMONY': 'Pre-Match Ceremony',
  'MATCH_IN_PROGRESS': 'Match in Progress',
  'VICTORY_CEREMONY': 'Victory Ceremony',
  'POST_MATCH_COOLDOWN': 'Post-Match Cooldown'
};

// Connect to the server
function connectToServer() {
  socket = io();
  
  // When connected
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
    gameState.myId = socket.id;
    updateUI();
  });
  
  // Receive initial game state
  socket.on('gameState', (state) => {
    console.log('Received game state:', state);
    gameState.fighters = state.fighters;
    gameState.referee = state.referee;
    gameState.viewers = state.viewers;
    gameState.stage = state.currentStage;
    gameState.stageTimeRemaining = state.stageTimeRemaining;
    
    // Determine my role
    determineMyRole();
    
    // Initialize the 3D scene with the game state
    initScene(gameState);
    updateUI();
    updateStageDisplay();
    
    // Start the stage timer if needed
    if (gameState.stageTimeRemaining > 0) {
      startStageTimer(gameState.stageTimeRemaining);
    }
  });
  
  // Handle stage change
  socket.on('stageChange', (data) => {
    console.log('Stage changed:', data);
    gameState.stage = data.stage;
    gameState.stageTimeRemaining = data.duration;
    
    updateStageDisplay();
    
    // Clear any existing timer
    if (gameState.stageTimer) {
      clearInterval(gameState.stageTimer);
      gameState.stageTimer = null;
    }
    
    // Start a new timer if needed
    if (data.duration > 0) {
      startStageTimer(data.duration);
    }
    
    // Handle stage-specific UI updates
    handleStageChange(data.stage);
  });
  
  // New player joined
  socket.on('playerJoined', (player) => {
    console.log('Player joined:', player);
    
    if (player.role === 'fighter') {
      gameState.fighters.push(player);
    } else if (player.role === 'referee') {
      gameState.referee = player;
    } else {
      gameState.viewers.push(player);
    }
    
    // Add the player to the scene
    addPlayerToScene(player);
    updateUI();
  });
  
  // Player left
  socket.on('playerLeft', (playerId) => {
    console.log('Player left:', playerId);
    
    // Remove from appropriate array
    gameState.fighters = gameState.fighters.filter(f => f.id !== playerId);
    if (gameState.referee && gameState.referee.id === playerId) {
      gameState.referee = null;
    }
    gameState.viewers = gameState.viewers.filter(v => v.id !== playerId);
    
    // Remove from scene
    removePlayerFromScene(playerId);
    updateUI();
  });
  
  // Player moved
  socket.on('playerMoved', (data) => {
    updatePlayerPosition(data.id, data.position, data.rotation);
  });
  
  // Player emote
  socket.on('playerEmote', (data) => {
    showPlayerEmote(data.id, data.emote);
  });
  
  // Player message
  socket.on('playerMessage', (data) => {
    showPlayerMessage(data.id, data.message);
  });
  
  // Fighters selected
  socket.on('fightersSelected', (data) => {
    console.log('Fighters selected:', data);
    
    gameState.fighters = [data.fighter1, data.fighter2];
    gameState.referee = data.referee;
    
    // Determine my role
    determineMyRole();
    
    // Update the scene
    updateScene();
    updateUI();
  });
  
  // Pre-ceremony start
  socket.on('preCeremonyStart', (data) => {
    console.log('Pre-ceremony started:', data);
    
    // Show ritual ready button if I'm a fighter
    if (gameState.myRole === 'fighter') {
      document.getElementById('ritual-ready-button').style.display = 'block';
    }
  });
  
  // Fighter ready
  socket.on('fighterReady', (data) => {
    console.log('Fighter ready:', data.id);
    
    // Update fighter model to show they're ready
    const fighter = gameState.fighters.find(f => f.id === data.id);
    if (fighter) {
      fighter.ready = true;
      updateFighterReadyState(data.id, true);
    }
  });
  
  // Sponsor banner
  socket.on('sponsorBanner', (data) => {
    console.log('Sponsor banner:', data);
    
    const bannerElement = document.getElementById('sponsor-banner');
    bannerElement.textContent = data.sponsor;
    bannerElement.style.display = 'block';
    
    setTimeout(() => {
      bannerElement.style.display = 'none';
    }, data.duration);
  });
  
  // Match start
  socket.on('matchStart', (data) => {
    console.log('Match started:', data);
    
    // Hide ritual ready button
    document.getElementById('ritual-ready-button').style.display = 'none';
    
    // Show match start animation
    showMatchStart();
  });
  
  // Match end
  socket.on('matchEnd', (data) => {
    console.log('Match ended. Winner:', data.winnerId, 'Loser:', data.loserId);
    
    // Show match end animation
    showMatchEnd(data.winnerId, data.loserId, data.reason);
  });
  
  // Match draw
  socket.on('matchDraw', (data) => {
    console.log('Match ended in a draw');
    
    // Show match draw animation
    showMatchDraw();
  });
  
  // New referee
  socket.on('newReferee', (referee) => {
    console.log('New referee:', referee);
    
    gameState.referee = referee;
    
    // Update the scene
    updateScene();
    updateUI();
  });
}

// Determine my role based on the game state
function determineMyRole() {
  const myId = socket.id;
  
  if (gameState.fighters.some(f => f.id === myId)) {
    gameState.myRole = 'fighter';
  } else if (gameState.referee && gameState.referee.id === myId) {
    gameState.myRole = 'referee';
  } else {
    gameState.myRole = 'viewer';
  }
}

// Update the UI based on the current game state
function updateUI() {
  const roleDisplay = document.getElementById('role-display');
  const playersCount = document.getElementById('players-count');
  
  if (roleDisplay) {
    roleDisplay.textContent = `Your role: ${gameState.myRole.toUpperCase()}`;
  }
  
  if (playersCount) {
    const totalPlayers = gameState.fighters.length + 
                         (gameState.referee ? 1 : 0) + 
                         gameState.viewers.length;
    playersCount.textContent = `Players: ${totalPlayers}`;
  }
}

// Update the stage display
function updateStageDisplay() {
  const stageNameElement = document.getElementById('stage-name');
  const stageTimerElement = document.getElementById('stage-timer');
  
  if (stageNameElement) {
    const displayName = STAGE_DISPLAY_NAMES[gameState.stage] || gameState.stage;
    stageNameElement.textContent = displayName;
  }
  
  if (stageTimerElement) {
    if (gameState.stageTimeRemaining > 0) {
      const seconds = Math.ceil(gameState.stageTimeRemaining / 1000);
      stageTimerElement.textContent = `${seconds}s`;
    } else {
      stageTimerElement.textContent = '';
    }
  }
}

// Start the stage timer
function startStageTimer(duration) {
  // Clear any existing timer
  if (gameState.stageTimer) {
    clearInterval(gameState.stageTimer);
  }
  
  gameState.stageTimeRemaining = duration;
  const startTime = Date.now();
  
  gameState.stageTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    gameState.stageTimeRemaining = Math.max(0, duration - elapsed);
    
    updateStageDisplay();
    
    if (gameState.stageTimeRemaining <= 0) {
      clearInterval(gameState.stageTimer);
      gameState.stageTimer = null;
    }
  }, 1000);
}

// Handle stage-specific UI updates
function handleStageChange(stage) {
  // Reset UI elements
  document.getElementById('ritual-ready-button').style.display = 'none';
  
  switch (stage) {
    case 'PRE_MATCH_CEREMONY':
      if (gameState.myRole === 'fighter') {
        document.getElementById('ritual-ready-button').style.display = 'block';
      }
      break;
      
    case 'MATCH_IN_PROGRESS':
      // Show match start animation
      showMatchStart();
      break;
  }
}

// Send movement command to the server
function sendMovement(direction) {
  if (gameState.myRole === 'fighter' && gameState.stage === 'MATCH_IN_PROGRESS') {
    socket.emit('move', direction);
  }
}

// Send ritual ready signal to the server
function sendRitualReady() {
  if (gameState.myRole === 'fighter' && gameState.stage === 'PRE_MATCH_CEREMONY') {
    socket.emit('ritualReady');
    document.getElementById('ritual-ready-button').style.display = 'none';
  }
}

// Send emote to the server
function sendEmote(emoteType) {
  socket.emit('emote', emoteType);
}

// Send message to the server
function sendMessage() {
  const messageInput = document.getElementById('message-text');
  const message = messageInput.value.trim();
  
  if (message) {
    socket.emit('message', message);
    messageInput.value = '';
  }
}

// Show match start animation
function showMatchStart() {
  // This will be implemented in renderer.js
  if (typeof showMatchStartAnimation === 'function') {
    showMatchStartAnimation();
  }
}

// Show match end animation
function showMatchEnd(winnerId, loserId, reason) {
  // This will be implemented in renderer.js
  if (typeof showMatchEndAnimation === 'function') {
    showMatchEndAnimation(winnerId, loserId, reason);
  }
}

// Show match draw animation
function showMatchDraw() {
  // This will be implemented in renderer.js
  if (typeof showMatchDrawAnimation === 'function') {
    showMatchDrawAnimation();
  }
}

// Initialize the connection when the page loads
window.addEventListener('load', connectToServer);

// Handle keyboard input for fighter movement
window.addEventListener('keydown', (e) => {
  if (gameState.myRole !== 'fighter' || gameState.stage !== 'MATCH_IN_PROGRESS') return;
  
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    sendMovement('left');
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    sendMovement('right');
  }
}); 