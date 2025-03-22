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
    
    // Replace our local state with the server state
    gameState.fighters = state.fighters || [];
    gameState.viewers = state.viewers || [];
    gameState.referee = state.referee || null;
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
    
    // Debug log
    logPlayerCounts("After gameState event");
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
    
    // Don't add myself again (I'm already in the gameState from the initial state)
    if (player.id === gameState.myId) {
      console.log('Ignoring playerJoined for myself');
      return;
    }
    
    // Add to the appropriate array based on role
    if (player.role === 'fighter') {
      // Make sure not already in fighters array
      if (!gameState.fighters.some(f => f.id === player.id)) {
        gameState.fighters.push(player);
      }
    } else if (player.role === 'referee') {
      gameState.referee = player;
    } else {
      // Make sure not already in viewers array
      if (!gameState.viewers.some(v => v.id === player.id)) {
        gameState.viewers.push(player);
      }
    }
    
    // Add to scene
    addPlayerToScene(player);
    updateUI();
    
    // Debug log
    logPlayerCounts("After playerJoined event");
  });
  
  // Player left
  socket.on('playerLeft', (playerId) => {
    console.log('Player left:', playerId);
    
    // Remove from all arrays
    gameState.fighters = gameState.fighters.filter(f => f.id !== playerId);
    if (gameState.referee && gameState.referee.id === playerId) {
      gameState.referee = null;
    }
    gameState.viewers = gameState.viewers.filter(v => v.id !== playerId);
    
    // Remove from scene
    removePlayerFromScene(playerId);
    updateUI();
    
    // Debug log
    logPlayerCounts("After playerLeft event");
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
  
  // Handle game state reset
  socket.on('gameStateReset', () => {
    console.log('Game state reset received');
    
    // Keep track of all players
    const allPlayers = [
      ...gameState.fighters,
      ...gameState.viewers
    ];
    
    if (gameState.referee) {
      allPlayers.push(gameState.referee);
    }
    
    // Reset arrays
    gameState.fighters = [];
    gameState.referee = null;
    
    // All players become viewers
    gameState.viewers = allPlayers.map(player => {
      player.role = 'viewer';
      return player;
    });
    
    // Update my role
    gameState.myRole = 'viewer';
    
    // Update UI and scene
    updateUI();
    updateStageDisplay();
    updateScene();
  });
  
  // Update the fightersReset handler
  socket.on('fightersReset', () => {
    console.log('Fighters reset');
    
    // Update our local game state
    gameState.fighters = [];
    
    // If I was a fighter, I'm now a viewer
    if (gameState.myRole === 'fighter') {
      gameState.myRole = 'viewer';
    }
    
    // Update UI
    updateUI();
  });

  // Add a playerRoleChanged event handler
  socket.on('playerRoleChanged', (data) => {
    console.log('Player role changed:', data);
    
    const { id, role } = data;
    
    // Update local game state based on role change
    if (role === 'fighter') {
      // Remove from other arrays if present
      gameState.viewers = gameState.viewers.filter(v => v.id !== id);
      if (gameState.referee && gameState.referee.id === id) {
        gameState.referee = null;
      }
      
      // Check if already in fighters array
      if (!gameState.fighters.some(f => f.id === id)) {
        // Find the player in our local state
        const player = findPlayerInGameState(id);
        if (player) {
          player.role = 'fighter';
          gameState.fighters.push(player);
        }
      }
    } else if (role === 'referee') {
      // Remove from other arrays if present
      gameState.fighters = gameState.fighters.filter(f => f.id !== id);
      gameState.viewers = gameState.viewers.filter(v => v.id !== id);
      
      // Find the player in our local state
      const player = findPlayerInGameState(id);
      if (player) {
        player.role = 'referee';
        gameState.referee = player;
      }
    } else if (role === 'viewer') {
      // Remove from other arrays if present
      gameState.fighters = gameState.fighters.filter(f => f.id !== id);
      if (gameState.referee && gameState.referee.id === id) {
        gameState.referee = null;
      }
      
      // Check if already in viewers array
      if (!gameState.viewers.some(v => v.id === id)) {
        // Find the player in our local state
        const player = findPlayerInGameState(id);
        if (player) {
          player.role = 'viewer';
          gameState.viewers.push(player);
        }
      }
    }
    
    // If this is me, update my role
    if (id === gameState.myId) {
      gameState.myRole = role;
    }
    
    // Update UI and scene
    updateUI();
    updateScene();
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
  // Update role display
  const roleDisplay = document.getElementById('role-display');
  if (roleDisplay) {
    roleDisplay.textContent = `Your Role: ${gameState.myRole.charAt(0).toUpperCase() + gameState.myRole.slice(1)}`;
  }
  
  // Update player count - ensure we don't double-count players
  const playersCount = document.getElementById('players-count');
  if (playersCount) {
    // Get unique player IDs to avoid counting duplicates
    const playerIds = new Set();
    
    // Add fighter IDs
    gameState.fighters.forEach(fighter => playerIds.add(fighter.id));
    
    // Add referee ID if exists
    if (gameState.referee) {
      playerIds.add(gameState.referee.id);
    }
    
    // Add viewer IDs
    gameState.viewers.forEach(viewer => playerIds.add(viewer.id));
    
    // Count unique players
    const totalPlayers = playerIds.size;
    
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
  // No need to reset ritual ready button display
  
  switch (stage) {
    case 'PRE_MATCH_CEREMONY':
      // Removed ritual ready button code
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
  // Function removed or emptied
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

// Helper function to find a player in any array
function findPlayerInGameState(id) {
  // Check fighters
  const fighter = gameState.fighters.find(f => f.id === id);
  if (fighter) return fighter;
  
  // Check referee
  if (gameState.referee && gameState.referee.id === id) {
    return gameState.referee;
  }
  
  // Check viewers
  const viewer = gameState.viewers.find(v => v.id === id);
  if (viewer) return viewer;
  
  return null;
}

// Add a function to update the scene based on current game state
function updateScene() {
  // Update all player positions and roles in the scene
  [...gameState.fighters, ...gameState.viewers].forEach(player => {
    updatePlayerInScene(player);
  });
  
  if (gameState.referee) {
    updatePlayerInScene(gameState.referee);
  }
}

// Update a player in the scene
function updatePlayerInScene(player) {
  // If player already exists in scene, update it
  if (playerModels[player.id]) {
    // Update position and role
    updatePlayerPosition(player.id, player.position, player.rotation);
    
    // If role changed, we need to reposition
    const model = playerModels[player.id];
    if (model.userData.role !== player.role) {
      model.userData.role = player.role;
      
      // Reposition based on new role
      if (player.role === 'fighter') {
        // Fighter position is already handled by server
      } else if (player.role === 'referee') {
        model.position.set(0, RING_HEIGHT + 0.5, 0);
        model.scale.set(0.8, 0.8, 0.8);
      } else {
        // Viewer - use deterministic positioning
        const idNumber = parseInt(player.id.substring(0, 8), 16);
        const viewerIndex = idNumber % 60;
        positionViewer(model, viewerIndex);
      }
    }
  } else {
    // Player doesn't exist in scene, add it
    addPlayerToScene(player);
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

// Add a helper function for debugging
function logPlayerCounts(context) {
  const totalPlayers = gameState.fighters.length + gameState.viewers.length + (gameState.referee ? 1 : 0);
  console.log(`${context} - Total players: ${totalPlayers}`);
  console.log(`Fighters: ${gameState.fighters.length}, Viewers: ${gameState.viewers.length}, Referee: ${gameState.referee ? 1 : 0}`);
  
  // Log all player IDs for debugging
  console.log("Fighter IDs:", gameState.fighters.map(f => f.id));
  console.log("Viewer IDs:", gameState.viewers.map(v => v.id));
  console.log("Referee ID:", gameState.referee ? gameState.referee.id : "none");
} 