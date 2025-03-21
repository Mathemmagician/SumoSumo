const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const gameState = {
  ring: {
    radius: 5,
    position: { x: 0, y: 0, z: 0 }
  },
  fighters: [],
  viewers: [],
  referee: {
    position: { x: 0, y: 1.5, z: 0 }
  },
  currentFight: null
};

// Handle socket connections
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Add new user as a viewer
  const newViewer = {
    id: socket.id,
    position: getRandomViewerPosition(),
    color: getRandomColor()
  };
  
  gameState.viewers.push(newViewer);
  
  // Emit current game state to the new user
  socket.emit('gameState', gameState);
  
  // Broadcast the new viewer to all other users
  socket.broadcast.emit('newViewer', newViewer);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove user from viewers or fighters
    removeUser(socket.id);
    
    // Broadcast updated game state
    io.emit('userLeft', socket.id);
  });
  
  // Handle viewer emotes
  socket.on('emote', (emoteData) => {
    io.emit('viewerEmote', {
      viewerId: socket.id,
      emote: emoteData.emote
    });
  });
  
  // Handle fighter movements
  socket.on('fighterMove', (moveData) => {
    if (isFighter(socket.id)) {
      updateFighterPosition(socket.id, moveData);
      io.emit('fighterUpdated', getFighterById(socket.id));
    }
  });
  
  // Handle chat messages
  socket.on('chatMessage', (messageData) => {
    io.emit('viewerChat', {
      viewerId: socket.id,
      message: messageData.message.substring(0, 30) // Limit message length
    });
  });
});

// Helper functions
function getRandomViewerPosition() {
  // Randomly place viewers on left, right, or top
  const area = Math.floor(Math.random() * 3); // 0: left, 1: right, 2: top
  
  let x, y, z;
  
  switch (area) {
    case 0: // left
      x = -10;
      y = Math.random() * 6 - 3;
      z = 0;
      break;
    case 1: // right
      x = 10;
      y = Math.random() * 6 - 3;
      z = 0;
      break;
    case 2: // top
      x = Math.random() * 16 - 8;
      y = 7;
      z = 0;
      break;
  }
  
  return { x, y, z };
}

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function removeUser(userId) {
  // Remove from viewers
  gameState.viewers = gameState.viewers.filter(viewer => viewer.id !== userId);
  
  // Remove from fighters
  gameState.fighters = gameState.fighters.filter(fighter => fighter.id !== userId);
  
  // If a fighter left, select new fighters
  if (gameState.fighters.length < 2 && gameState.currentFight) {
    endCurrentFight();
    if (gameState.viewers.length >= 2) {
      selectNewFighters();
    }
  }
}

function isFighter(userId) {
  return gameState.fighters.some(fighter => fighter.id === userId);
}

function getFighterById(userId) {
  return gameState.fighters.find(fighter => fighter.id === userId);
}

function updateFighterPosition(fighterId, moveData) {
  const fighter = getFighterById(fighterId);
  if (fighter) {
    fighter.position.x += moveData.direction * 0.1;
    
    // Keep fighter within the ring
    const maxX = gameState.ring.radius - 1;
    fighter.position.x = Math.max(-maxX, Math.min(maxX, fighter.position.x));
    
    // Check for ring out
    if (Math.abs(fighter.position.x) >= maxX) {
      const loserId = fighterId;
      const winnerId = gameState.fighters.find(f => f.id !== loserId)?.id;
      
      if (winnerId) {
        endFight(winnerId, loserId);
      }
    }
  }
}

function selectNewFighters() {
  if (gameState.viewers.length < 2) return;
  
  // Select two random viewers to become fighters
  const randomIndices = [];
  while (randomIndices.length < 2) {
    const idx = Math.floor(Math.random() * gameState.viewers.length);
    if (!randomIndices.includes(idx)) {
      randomIndices.push(idx);
    }
  }
  
  const fighter1 = gameState.viewers[randomIndices[0]];
  const fighter2 = gameState.viewers[randomIndices[1]];
  
  // Remove selected viewers
  gameState.viewers = gameState.viewers.filter((_, idx) => !randomIndices.includes(idx));
  
  // Add as fighters
  const newFighter1 = {
    ...fighter1,
    position: { x: -3, y: 0, z: 0 },
    score: 0
  };
  
  const newFighter2 = {
    ...fighter2,
    position: { x: 3, y: 0, z: 0 },
    score: 0
  };
  
  gameState.fighters = [newFighter1, newFighter2];
  gameState.currentFight = {
    startTime: Date.now(),
    fighters: [newFighter1.id, newFighter2.id]
  };
  
  // Notify all clients about the new fight
  io.emit('newFight', {
    fighter1: newFighter1,
    fighter2: newFighter2
  });
}

function endFight(winnerId, loserId) {
  // Update winner's score
  const winner = getFighterById(winnerId);
  if (winner) {
    winner.score += 1;
  }
  
  // Notify all clients about the fight result
  io.emit('fightResult', {
    winnerId,
    loserId
  });
  
  // End current fight
  endCurrentFight();
  
  // After a short delay, return fighters to viewers and select new fighters
  setTimeout(() => {
    // Return fighters to viewers
    const fighter1 = gameState.fighters[0];
    const fighter2 = gameState.fighters[1];
    
    if (fighter1) {
      gameState.viewers.push({
        id: fighter1.id,
        position: getRandomViewerPosition(),
        color: fighter1.color
      });
    }
    
    if (fighter2) {
      gameState.viewers.push({
        id: fighter2.id,
        position: getRandomViewerPosition(),
        color: fighter2.color
      });
    }
    
    // Clear the fighters array
    gameState.fighters = [];
    
    // Notify clients that fighters have returned to viewers
    io.emit('fightersReturnedToViewers', {
      fighter1Id: fighter1 ? fighter1.id : null,
      fighter2Id: fighter2 ? fighter2.id : null
    });
    
    // After another short delay, select new fighters
    setTimeout(() => {
      if (gameState.viewers.length >= 2) {
        selectNewFighters();
      }
    }, 1500);
  }, 2000);
}

function endCurrentFight() {
  gameState.currentFight = null;
}

// Start a new fight if we have enough viewers
function startInitialFight() {
  if (gameState.viewers.length >= 2 && gameState.fighters.length === 0 && !gameState.currentFight) {
    selectNewFighters();
  }
}

// Check for new fights every 10 seconds if no fight is happening
setInterval(() => {
  if (!gameState.currentFight && gameState.viewers.length >= 2) {
    selectNewFighters();
  }
}, 10000);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 