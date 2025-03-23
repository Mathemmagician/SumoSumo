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
    console.log('Player moved:', data);
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

    determineMyRole();
    updateScene();
    updateUI();
  });

  // Pre-ceremony start
  socket.on('preCeremonyStart', (data) => {
    console.log('Pre-ceremony started:', data);
  });

  // REMOVED: fighterReady event
  // (since the server no longer sends 'fighterReady')

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
    showMatchStart();
  });

  // Match end
  socket.on('matchEnd', (data) => {
    console.log('Match ended. Winner:', data.winnerId, 'Loser:', data.loserId);
    showMatchEnd(data.winnerId, data.loserId, data.reason);
  });

  // Match draw
  socket.on('matchDraw', (data) => {
    console.log('Match ended in a draw');
    showMatchDraw();
  });

  // New referee
  socket.on('newReferee', (referee) => {
    console.log('New referee:', referee);
    gameState.referee = referee;
    updateScene();
    updateUI();
  });

  // Handle game state reset
  socket.on('gameStateReset', () => {
    console.log('Game state reset received');

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

    gameState.myRole = 'viewer';
    updateUI();
    updateStageDisplay();
    updateScene();
  });

  // Fighters reset
  socket.on('fightersReset', () => {
    console.log('Fighters reset');
    gameState.fighters = [];

    if (gameState.myRole === 'fighter') {
      gameState.myRole = 'viewer';
    }

    gameState.viewers.forEach(viewer => {
      updatePlayerInScene(viewer);
    });
    updateUI();
  });

  // Player role changed
  socket.on('playerRoleChanged', (data) => {
    console.log('Player role changed:', data);
    const { id, role } = data;

    // Remove from any existing arrays
    if (role === 'fighter') {
      gameState.viewers = gameState.viewers.filter(v => v.id !== id);
      if (gameState.referee && gameState.referee.id === id) {
        gameState.referee = null;
      }
      // Add to fighters if not present
      if (!gameState.fighters.some(f => f.id === id)) {
        const player = findPlayerInGameState(id);
        if (player) {
          player.role = 'fighter';
          gameState.fighters.push(player);
        }
      }
    } else if (role === 'referee') {
      gameState.fighters = gameState.fighters.filter(f => f.id !== id);
      gameState.viewers = gameState.viewers.filter(v => v.id !== id);

      const player = findPlayerInGameState(id);
      if (player) {
        player.role = 'referee';
        gameState.referee = player;
      }
    } else {
      // role === 'viewer'
      gameState.fighters = gameState.fighters.filter(f => f.id !== id);
      if (gameState.referee && gameState.referee.id === id) {
        gameState.referee = null;
      }
      if (!gameState.viewers.some(v => v.id === id)) {
        const player = findPlayerInGameState(id);
        if (player) {
          player.role = 'viewer';
          gameState.viewers.push(player);
        }
      }
    }

    if (id === gameState.myId) {
      gameState.myRole = role;
    }

    updateUI();
    updateScene();
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
  const roleDisplay = document.getElementById('role-display');
  if (roleDisplay) {
    roleDisplay.textContent = `Your Role: ${capitalize(gameState.myRole)}`;
  }

  const playersCount = document.getElementById('players-count');
  if (playersCount) {
    // Use a Set to avoid duplicates
    const playerIds = new Set();
    gameState.fighters.forEach(f => playerIds.add(f.id));
    if (gameState.referee) playerIds.add(gameState.referee.id);
    gameState.viewers.forEach(v => playerIds.add(v.id));

    playersCount.textContent = `Players: ${playerIds.size}`;
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
  const messageInput = document.getElementById('message-text');
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

function updatePlayerInScene(player) {
  // If playerModels is a global object, ensure it's defined: let playerModels = {};
  if (playerModels[player.id]) {
    updatePlayerPosition(player.id, player.position, player.rotation);

    // If role changed, reposition accordingly
    const model = playerModels[player.id];
    if (model.userData.role !== player.role) {
      model.userData.role = player.role;
      if (player.role === 'referee') {
        // Example: a special position for referees
        model.position.set(0, RING_HEIGHT + 0.5, 0);
        model.scale.set(0.8, 0.8, 0.8);
      } else if (player.role === 'viewer') {
        // positionViewer is presumably your custom function
        const idNumber = parseInt(player.id.substring(0, 8), 16);
        const viewerIndex = idNumber % 60;
        positionViewer(model, viewerIndex);
      }
    }
  } else {
    // The model doesn't exist yet
    addPlayerToScene(player);
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
  if (e.key === 'ArrowLeft' || e.key === 'a') {
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
  console.log(`${context} - Total players: ${totalPlayers}`);
  console.log(`Fighters: ${gameState.fighters.length}, Viewers: ${gameState.viewers.length}, Referee: ${gameState.referee ? 1 : 0}`);
  console.log("Fighter IDs:", gameState.fighters.map(f => f.id));
  console.log("Viewer IDs:", gameState.viewers.map(v => v.id));
  console.log("Referee ID:", gameState.referee ? gameState.referee.id : "none");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize connection
window.addEventListener('load', connectToServer);
