const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Game state
const gameState = {
  fighters: [], // Current fighters (max 2)
  referee: null, // Current referee
  viewers: [], // Current viewers
  queue: [], // Queue of players waiting to fight
  ringRadius: 5, // Ring radius in Three.js units
};

// When a client connects
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Create a new player
  const player = {
    id: socket.id,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    faceTexture: Math.floor(Math.random() * 10), // Random face texture (0-9)
    role: 'viewer', // Start as viewer
    emote: null,
    message: null,
  };
  
  // Add to viewers initially
  gameState.viewers.push(player);
  
  // Send initial game state to the new player
  socket.emit('gameState', gameState);
  
  // Broadcast new player to everyone else
  socket.broadcast.emit('playerJoined', player);
  
  // Handle player movement
  socket.on('move', (direction) => {
    // Only fighters can move
    if (player.role !== 'fighter') return;
    
    const fighter = gameState.fighters.find(f => f.id === socket.id);
    if (!fighter) return;
    
    // Update position based on direction (left/right)
    if (direction === 'left') {
      fighter.position.x -= 0.2;
      fighter.rotation = Math.PI / 2; // Face left
    } else if (direction === 'right') {
      fighter.position.x += 0.2;
      fighter.rotation = -Math.PI / 2; // Face right
    }
    
    // Check for ring boundary
    if (Math.abs(fighter.position.x) > gameState.ringRadius) {
      // Player fell out of the ring
      endRound(fighter.id);
    }
    
    // Broadcast updated position
    io.emit('playerMoved', {
      id: fighter.id,
      position: fighter.position,
      rotation: fighter.rotation
    });
  });
  
  // Handle player emote
  socket.on('emote', (emoteType) => {
    player.emote = emoteType;
    io.emit('playerEmote', {
      id: player.id,
      emote: emoteType
    });
    
    // Clear emote after a few seconds
    setTimeout(() => {
      player.emote = null;
      io.emit('playerEmote', {
        id: player.id,
        emote: null
      });
    }, 3000);
  });
  
  // Handle player message
  socket.on('message', (message) => {
    // Simple validation
    if (message.length > 50) message = message.substring(0, 50);
    
    player.message = message;
    io.emit('playerMessage', {
      id: player.id,
      message
    });
    
    // Clear message after a few seconds
    setTimeout(() => {
      player.message = null;
      io.emit('playerMessage', {
        id: player.id,
        message: null
      });
    }, 5000);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from appropriate array
    if (player.role === 'fighter') {
      gameState.fighters = gameState.fighters.filter(f => f.id !== socket.id);
      // If a fighter leaves, end the round
      if (gameState.fighters.length < 2) {
        startNewRound();
      }
    } else if (player.role === 'referee') {
      gameState.referee = null;
      // Select new referee if needed
      if (gameState.viewers.length > 0) {
        const newRefereeIndex = Math.floor(Math.random() * gameState.viewers.length);
        gameState.referee = gameState.viewers[newRefereeIndex];
        gameState.viewers.splice(newRefereeIndex, 1);
        gameState.referee.role = 'referee';
      }
    } else {
      gameState.viewers = gameState.viewers.filter(v => v.id !== socket.id);
    }
    
    // Remove from queue if present
    gameState.queue = gameState.queue.filter(id => id !== socket.id);
    
    // Broadcast player left
    io.emit('playerLeft', socket.id);
    
    // Check if we need to start a new round
    if (gameState.fighters.length < 2 && gameState.viewers.length > 1) {
      startNewRound();
    }
  });
});

// Function to end a round
function endRound(loserId) {
  // Find the loser
  const loser = gameState.fighters.find(f => f.id === loserId);
  if (!loser) return;
  
  // Find the winner (the other fighter)
  const winner = gameState.fighters.find(f => f.id !== loserId);
  
  // Announce the winner
  io.emit('roundEnd', {
    winnerId: winner ? winner.id : null,
    loserId
  });
  
  // Move fighters back to viewers
  gameState.fighters.forEach(fighter => {
    fighter.role = 'viewer';
    fighter.position = { x: 0, y: 0, z: 0 };
    gameState.viewers.push(fighter);
  });
  
  // Clear fighters array
  gameState.fighters = [];
  
  // Start a new round after a delay
  setTimeout(startNewRound, 3000);
}

// Function to start a new round
function startNewRound() {
  // Need at least 2 viewers to start a round
  if (gameState.viewers.length < 2) return;
  
  // Select 2 random viewers to be fighters
  const fighter1Index = Math.floor(Math.random() * gameState.viewers.length);
  const fighter1 = gameState.viewers[fighter1Index];
  gameState.viewers.splice(fighter1Index, 1);
  
  const fighter2Index = Math.floor(Math.random() * gameState.viewers.length);
  const fighter2 = gameState.viewers[fighter2Index];
  gameState.viewers.splice(fighter2Index, 1);
  
  // Set their roles and positions
  fighter1.role = 'fighter';
  fighter1.position = { x: -2, y: 0, z: 0 };
  fighter1.rotation = -Math.PI / 2; // Face right
  
  fighter2.role = 'fighter';
  fighter2.position = { x: 2, y: 0, z: 0 };
  fighter2.rotation = Math.PI / 2; // Face left
  
  // Add them to fighters array
  gameState.fighters = [fighter1, fighter2];
  
  // If no referee, select one
  if (!gameState.referee && gameState.viewers.length > 0) {
    const refereeIndex = Math.floor(Math.random() * gameState.viewers.length);
    gameState.referee = gameState.viewers[refereeIndex];
    gameState.viewers.splice(refereeIndex, 1);
    gameState.referee.role = 'referee';
    gameState.referee.position = { x: 0, y: 0, z: 0 };
  }
  
  // Announce new round
  io.emit('roundStart', {
    fighter1: fighter1,
    fighter2: fighter2,
    referee: gameState.referee
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the first round after a delay
  setTimeout(startNewRound, 5000);
}); 