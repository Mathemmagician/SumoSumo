// Socket.io client code
let socket;
let gameState = {
  fighters: [],
  referee: null,
  viewers: [],
  myRole: 'viewer',
  myId: null
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
    
    // Determine my role
    determineMyRole();
    
    // Initialize the 3D scene with the game state
    initScene(gameState);
    updateUI();
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
  
  // Round start
  socket.on('roundStart', (data) => {
    console.log('Round started:', data);
    
    // Update fighters and referee
    gameState.fighters = [data.fighter1, data.fighter2];
    gameState.referee = data.referee;
    
    // Determine my role
    determineMyRole();
    
    // Update the scene
    updateScene();
    updateUI();
    
    // Show round start animation/message
    showRoundStart(data.fighter1, data.fighter2);
  });
  
  // Round end
  socket.on('roundEnd', (data) => {
    console.log('Round ended. Winner:', data.winnerId, 'Loser:', data.loserId);
    
    // Show round end animation/message
    showRoundEnd(data.winnerId, data.loserId);
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

// Send movement command to the server
function sendMovement(direction) {
  if (gameState.myRole === 'fighter') {
    socket.emit('move', direction);
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

// Initialize the connection when the page loads
window.addEventListener('load', connectToServer);

// Handle keyboard input for fighter movement
window.addEventListener('keydown', (e) => {
  if (gameState.myRole !== 'fighter') return;
  
  if (e.key === 'ArrowLeft' || e.key === 'a') {
    sendMovement('left');
  } else if (e.key === 'ArrowRight' || e.key === 'd') {
    sendMovement('right');
  }
}); 