const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const gameLogic = require('./game-logic');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Game state
const gameState = {
  fighters: [], // Current fighters
  viewers: [], // Current viewers
  referee: null, // The referee
  roundInProgress: false
};

// Socket.IO events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Add new player as a viewer
  gameLogic.addViewer(gameState, socket.id);
  
  // Send current game state to the new player
  socket.emit('gameState', gameState);
  
  // Update all clients about the new viewer
  io.emit('viewerJoined', { id: socket.id });
  
  // Check if we need to start a new round
  if (!gameState.roundInProgress && gameState.viewers.length >= 2) {
    gameLogic.startNewRound(gameState);
    io.emit('newRound', { 
      fighters: gameState.fighters,
      referee: gameState.referee
    });
  }
  
  // Handle movement
  socket.on('move', (data) => {
    // Only process movement for current fighters
    if (gameState.fighters.includes(socket.id)) {
      const fighterIndex = gameState.fighters.indexOf(socket.id);
      gameLogic.moveFighter(gameState, fighterIndex, data.direction);
      io.emit('fighterMoved', { 
        fighter: socket.id, 
        position: gameLogic.getFighterPosition(gameState, fighterIndex) 
      });
    }
  });
  
  // Handle emotes
  socket.on('emote', (data) => {
    io.emit('emoteReceived', { 
      from: socket.id, 
      emote: data.emote 
    });
  });
  
  // Handle chat messages
  socket.on('chat', (data) => {
    io.emit('chatReceived', { 
      from: socket.id, 
      message: data.message 
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    gameLogic.removePlayer(gameState, socket.id);
    io.emit('playerLeft', { id: socket.id });
    
    // If a fighter left, end the round and start a new one
    if (gameState.fighters.includes(socket.id)) {
      gameLogic.endRound(gameState);
      if (gameState.viewers.length >= 2) {
        gameLogic.startNewRound(gameState);
        io.emit('newRound', { 
          fighters: gameState.fighters,
          referee: gameState.referee
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 