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

// Add at the top with other state
const socketStats = {
  connect: 0,
  gameState: 0,
  stageChange: 0,
  playerJoined: 0,
  playerLeft: 0,
  playerMoved: 0,
  playerEmote: 0,
  playerMessage: 0,
  fightersSelected: 0,
  preCeremonyStart: 0,
  sponsorBanner: 0,
  matchStart: 0,
  matchEnd: 0,
  matchDraw: 0,
  newReferee: 0,
  gameStateReset: 0,
  playerRoleChanged: 0
};

// Game stage display names
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
    socketStats.connect++;
    updateSocketStats(socketStats);
    console.log('Connected to server with ID:', socket.id);
    gameState.myId = socket.id;
    updateUI();
  });

  // Receive initial game state
  socket.on('gameState', (state) => {
    socketStats.gameState++;
    updateSocketStats(socketStats);
    console.log('Received game state:', state);

    // Clean up all existing models first
    if (typeof cleanupAllModels === 'function') {
      cleanupAllModels();
    }

    // Replace our local state with the server state
    gameState.fighters = state.fighters || [];
    gameState.viewers = state.viewers || [];
    gameState.referee = state.referee || null;
    gameState.stage = state.currentStage;
    gameState.stageTimeRemaining = state.stageTimeRemaining;

    // Determine my role
    determineMyRole();

    // Initialize the 3D scene with the game state
    if (!sceneInitialized) {
      initScene(gameState);
    } else {
      // Add all players to the scene with correct models
      gameState.fighters.forEach(fighter => addPlayerToScene(fighter));
      gameState.viewers.forEach(viewer => addPlayerToScene(viewer));
      if (gameState.referee) {
        addPlayerToScene(gameState.referee);
      }
    }

    updateUI();
    updateStageDisplay();

    // Start the stage timer if needed
    if (gameState.stageTimeRemaining > 0) {
      startStageTimer(gameState.stageTimeRemaining);
    }

    logPlayerCounts("After gameState event");
  });

  // Handle stage change
  socket.on('stageChange', (data) => {
    socketStats.stageChange++;
    updateSocketStats(socketStats);
    console.log('Stage changed:', data);
    
    const oldStage = gameState.stage;
    gameState.stage = data.stage;
    gameState.stageTimeRemaining = data.duration;

    // Clean up models when transitioning to certain stages
    if (data.stage === 'FIGHTER_SELECTION' || data.stage === 'WAITING_FOR_PLAYERS') {
      cleanupAllModels();
      // Re-add all current players with correct models
      gameState.fighters.forEach(fighter => addPlayerToScene(fighter));
      gameState.viewers.forEach(viewer => addPlayerToScene(viewer));
      if (gameState.referee) {
        addPlayerToScene(gameState.referee);
      }
    }

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

    handleStageChange(data.stage);
  });

  // New player joined
  socket.on('playerJoined', (player) => {
    socketStats.playerJoined++;
    updateSocketStats(socketStats);
    console.log('Player joined:', player);

    // Avoid double-adding ourselves
    if (player.id === gameState.myId) {
      console.log('Ignoring playerJoined for myself');
      return;
    }

    // Add to the appropriate array based on role
    if (player.role === 'fighter') {
      if (!gameState.fighters.some(f => f.id === player.id)) {
        gameState.fighters.push(player);
      }
    } else if (player.role === 'referee') {
      gameState.referee = player;
    } else {
      if (!gameState.viewers.some(v => v.id === player.id)) {
        gameState.viewers.push(player);
      }
    }

    addPlayerToScene(player);
    updateUI();
    logPlayerCounts("After playerJoined event");
  });

  // Player left
  socket.on('playerLeft', (playerId) => {
    socketStats.playerLeft++;
    updateSocketStats(socketStats);
    console.log('Player left:', playerId);

    // Remove from all arrays
    gameState.fighters = gameState.fighters.filter(f => f.id !== playerId);
    if (gameState.referee && gameState.referee.id === playerId) {
      gameState.referee = null;
    }
    gameState.viewers = gameState.viewers.filter(v => v.id !== playerId);

    removePlayerFromScene(playerId);
    updateUI();
    logPlayerCounts("After playerLeft event");
  });

  // Player moved
  socket.on('playerMoved', (data) => {
    socketStats.playerMoved++;
    updateSocketStats(socketStats);
    console.log('Player moved:', data);
    updatePlayerPosition(data.id, data.position, data.rotation);
  });

  // Player emote
  socket.on('playerEmote', (data) => {
    socketStats.playerEmote++;
    updateSocketStats(socketStats);
    showPlayerEmote(data.id, data.emote);
    
    // Dispatch custom event for chat history
    const emoteEvent = new CustomEvent('playerEmoteReceived', {
      detail: {
        id: data.id,
        emote: data.emote,
        username: findPlayerUsername(data.id)
      }
    });
    window.dispatchEvent(emoteEvent);
  });

  // Player message
  socket.on('playerMessage', (data) => {
    socketStats.playerMessage++;
    updateSocketStats(socketStats);
    showPlayerMessage(data.id, data.message);
    
    // Dispatch custom event for chat history
    const messageEvent = new CustomEvent('playerMessageReceived', {
      detail: {
        id: data.id,
        message: data.message,
        username: findPlayerUsername(data.id)
      }
    });
    window.dispatchEvent(messageEvent);
  });

  // Fighters selected
  socket.on('fightersSelected', (data) => {
    socketStats.fightersSelected++;
    updateSocketStats(socketStats);
    console.log('Fighters selected:', data);

    // Remove old fighter models first
    gameState.fighters.forEach(fighter => {
      removePlayerFromScene(fighter.id);
    });

    // Update game state with new fighters
    gameState.fighters = [data.fighter1, data.fighter2];
    
    // Remove old referee model if exists
    if (gameState.referee) {
      removePlayerFromScene(gameState.referee.id);
    }
    gameState.referee = data.referee;

    // Add new models with correct roles
    gameState.fighters.forEach(fighter => {
      addPlayerToScene(fighter);
    });
    if (gameState.referee) {
      addPlayerToScene(gameState.referee);
    }

    determineMyRole();
    updateUI();
  });

  // Pre-ceremony start
  socket.on('preCeremonyStart', (data) => {
    socketStats.preCeremonyStart++;
    updateSocketStats(socketStats);
    console.log('Pre-ceremony started:', data);
  });

  // REMOVED: fighterReady event
  // (since the server no longer sends 'fighterReady')

  // Sponsor banner
  socket.on('sponsorBanner', (data) => {
    socketStats.sponsorBanner++;
    updateSocketStats(socketStats);
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
    socketStats.matchStart++;
    updateSocketStats(socketStats);
    console.log('Match started:', data);
    showMatchStart();
  });

  // Match end
  socket.on('matchEnd', (data) => {
    socketStats.matchEnd++;
    updateSocketStats(socketStats);
    console.log('Match ended. Winner:', data.winnerId, 'Loser:', data.loserId);
    showMatchEnd(data.winnerId, data.loserId, data.reason);
  });

  // Match draw
  socket.on('matchDraw', (data) => {
    socketStats.matchDraw++;
    updateSocketStats(socketStats);
    console.log('Match ended in a draw');
    showMatchDraw();
  });

  // New referee
  socket.on('newReferee', (referee) => {
    socketStats.newReferee++;
    updateSocketStats(socketStats);
    console.log('New referee:', referee);
    gameState.referee = referee;
    updateScene();
    updateUI();
  });

  // Handle game state reset
  socket.on('gameStateReset', () => {
    socketStats.gameStateReset++;
    updateSocketStats(socketStats);
    console.log('Game state reset received');

    // Clean up all models
    cleanupAllModels();

    const allPlayers = [
      ...gameState.fighters,
      ...gameState.viewers
    ];
    if (gameState.referee) {
      allPlayers.push(gameState.referee);
    }

    gameState.fighters = [];
    gameState.referee = null;
    gameState.viewers = allPlayers.map(player => {
      player.role = 'viewer';
      return player;
    });

    // Re-add all players as viewers
    gameState.viewers.forEach(viewer => addPlayerToScene(viewer));

    gameState.myRole = 'viewer';
    updateUI();
    updateStageDisplay();
  });

  // Player role changed
  socket.on('playerRoleChanged', (data) => {
    socketStats.playerRoleChanged++;
    updateSocketStats(socketStats);
    console.log('Player role changed:', data);
    const { id, role } = data;

    // Find the player in any role
    const player = findPlayerInGameState(id);
    if (!player) {
      console.error('Could not find player for role change:', id);
      return;
    }

    // Remove from current arrays and model
    removePlayerFromScene(id);
    gameState.fighters = gameState.fighters.filter(f => f.id !== id);
    gameState.viewers = gameState.viewers.filter(v => v.id !== id);
    if (gameState.referee?.id === id) {
      gameState.referee = null;
    }

    // Update player's role and add to correct array
    player.role = role;
    switch (role) {
      case 'fighter':
        gameState.fighters.push(player);
        break;
      case 'referee':
        gameState.referee = player;
        break;
      case 'viewer':
        gameState.viewers.push(player);
        break;
    }

    // Add new model with updated role
    addPlayerToScene(player);

    if (id === gameState.myId) {
      gameState.myRole = role;
    }

    updateUI();
  });

  // Viewer only updated
  socket.on('viewerOnlyUpdated', (isViewerOnly) => {
    // Update the checkbox state
    const checkbox = document.getElementById('viewer-only-toggle');
    if (checkbox) {
      checkbox.checked = isViewerOnly;
    }
  });
}

// Determine my role
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

// Update the UI
function updateUI() {
  // Update role display
  const playerRole = gameState.myRole;
  uiManager.updateRoleBadge(playerRole);
  
  // Update player count
  const playerIds = new Set();
  gameState.fighters.forEach(f => playerIds.add(f.id));
  if (gameState.referee) playerIds.add(gameState.referee.id);
  gameState.viewers.forEach(v => playerIds.add(v.id));
  
  uiManager.updatePlayerCount(playerIds.size);
}

// Update the stage display
function updateStageDisplay() {
  const displayName = STAGE_DISPLAY_NAMES[gameState.stage] || gameState.stage;
  const seconds = Math.ceil(gameState.stageTimeRemaining / 1000);
  
  uiManager.updateMatchStatus(displayName, seconds);
}

// Start the stage timer
function startStageTimer(duration) {
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
  switch (stage) {
    case 'PRE_MATCH_CEREMONY':
      // Nothing special now that readiness is removed
      break;
    case 'MATCH_IN_PROGRESS':
      showMatchStart();
      break;
  }
}

// Fighter movement
function sendMovement(direction) {
  if (gameState.myRole === 'fighter' && gameState.stage === 'MATCH_IN_PROGRESS') {
    socket.emit('move', direction);
  }
}

// REMOVED: sendRitualReady()

// Send emote
function sendEmote(emoteType) {
  socket.emit('emote', emoteType);
}

// Send message
function sendMessage() {
  const messageInput = document.getElementById('chat-input');
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('message', message);
    messageInput.value = '';
  }
}

// Match animation stubs
function showMatchStart() {
  if (typeof showMatchStartAnimation === 'function') {
    showMatchStartAnimation();
  }
}
function showMatchEnd(winnerId, loserId, reason) {
  if (typeof showMatchEndAnimation === 'function') {
    showMatchEndAnimation(winnerId, loserId, reason);
  }
}
function showMatchDraw() {
  if (typeof showMatchDrawAnimation === 'function') {
    showMatchDrawAnimation();
  }
}

// Player updates
function findPlayerInGameState(id) {
  const fighter = gameState.fighters.find(f => f.id === id);
  if (fighter) return fighter;

  if (gameState.referee && gameState.referee.id === id) {
    return gameState.referee;
  }

  const viewer = gameState.viewers.find(v => v.id === id);
  return viewer || null;
}

function updateScene() {
  [...gameState.fighters, ...gameState.viewers].forEach(player => {
    updatePlayerInScene(player);
  });
  if (gameState.referee) {
    updatePlayerInScene(gameState.referee);
  }
}

// Example of the updatePlayerPosition function
function updatePlayerPosition(playerId, position, rotation) {
  const playerModel = playerModels[playerId];
  if (!playerModel) return;
  playerModel.position.set(position.x, position.y, position.z);
  playerModel.rotation.y = rotation;
}

// Keyboard input
window.addEventListener('keydown', (e) => {
  if (gameState.myRole !== 'fighter' || gameState.stage !== 'MATCH_IN_PROGRESS') return;
  
  if (e.key === 'ArrowUp' || e.key === 'w') {
    sendMovement('forward');
  } else if (e.key === 'ArrowDown' || e.key === 's') {
    sendMovement('backward');
  } else if (e.key === 'ArrowLeft' || e.key === 'a') {
    sendMovement('left');
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    sendMovement('right');
  }
});

// Debug
function logPlayerCounts(context) {
  const totalPlayers = gameState.fighters.length
    + gameState.viewers.length
    + (gameState.referee ? 1 : 0);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize connection
window.addEventListener('load', connectToServer);

// Expose functions to the global scope
window.sendPlayerEmoteToServer = sendEmote;
window.sendPlayerMessageToServer = function(message) {
  if (message) {
    socket.emit('message', message);
  }
};

// Helper function to get username from player ID
function findPlayerUsername(id) {
  const player = findPlayerInGameState(id);
  if (player) {
    // If there's a name property, use it, otherwise use a short ID
    return player.name || id.substring(0, 6);
  }
  return id.substring(0, 6);
}

// Add this function to handle the toggle
function toggleViewerOnly(checkbox) {
  socket.emit('toggleViewerOnly', checkbox.checked);
}
