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
    position: { x: 0, y: 3, z: 0 }
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
      const fighter = getFighterById(socket.id);
      if (fighter) {
        // Update movement state
        if (moveData.direction < 0) {
          fighter.isMovingLeft = moveData.isStarting;
        } else {
          fighter.isMovingRight = moveData.isStarting;
        }
        
        // Broadcast the updated fighter state to all clients
        io.emit('fighterUpdated', fighter);
      }
    }
  });
  
  // Handle chat messages
  socket.on('chatMessage', (messageData) => {
    io.emit('viewerChat', {
      viewerId: socket.id,
      message: messageData.message.substring(0, 30) // Limit message length
    });
  });
  
  // Handle sumo techniques
  socket.on('sumoTechnique', (techniqueData) => {
    if (isFighter(socket.id)) {
      const fighter = getFighterById(socket.id);
      if (!fighter) return;
      
      // Find opponent
      const opponent = gameState.fighters.find(f => f.id !== socket.id);
      if (!opponent) return;
      
      // Process the technique
      processSumoTechnique(fighter, opponent, techniqueData);
      
      // Broadcast the technique to all clients
      io.emit('sumoTechniquePerformed', {
        fighterId: fighter.id,
        technique: techniqueData.technique,
        targetId: opponent.id
      });
    }
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
  
  // IMPORTANT: Check that we don't already have fighters
  if (gameState.fighters.length > 0) {
    console.log("Cannot select new fighters: there are already fighters in the ring");
    return;
  }
  
  // Select two random viewers
  const randomIndices = [];
  while (randomIndices.length < 2) {
    const randomIndex = Math.floor(Math.random() * gameState.viewers.length);
    if (!randomIndices.includes(randomIndex)) {
      randomIndices.push(randomIndex);
    }
  }
  
  const fighter1 = gameState.viewers[randomIndices[0]];
  const fighter2 = gameState.viewers[randomIndices[1]];
  
  // Remove selected viewers (in reverse order to avoid index issues)
  const sortedIndices = [...randomIndices].sort((a, b) => b - a);
  sortedIndices.forEach(idx => {
    gameState.viewers.splice(idx, 1);
  });
  
  // Add as fighters
  const newFighter1 = {
    ...fighter1,
    position: { x: -3, y: 0, z: 0 },
    score: 0,
    isMovingLeft: false,
    isMovingRight: false,
    momentum: 0,
    isDefending: false,
    isCharging: false
  };
  
  const newFighter2 = {
    ...fighter2,
    position: { x: 3, y: 0, z: 0 },
    score: 0,
    isMovingLeft: false,
    isMovingRight: false,
    momentum: 0,
    isDefending: false,
    isCharging: false
  };
  
  gameState.fighters = [newFighter1, newFighter2];
  
  // Start a new fight
  gameState.currentFight = {
    startTime: Date.now(),
    fighter1Id: newFighter1.id,
    fighter2Id: newFighter2.id
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
  
  // Notify all clients about the fight result BEFORE changing any state
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
    
    // IMPORTANT: Clear the fighters array BEFORE adding them back as viewers
    // This prevents race conditions where a fighter might be selected again
    const tempFighters = [...gameState.fighters]; // Make a copy
    gameState.fighters = []; // Clear the array
    
    // Create an array to store the new viewers
    const newViewers = [];
    
    // Now add the fighters back as viewers
    tempFighters.forEach(fighter => {
      if (fighter) {
        const newViewer = {
          id: fighter.id,
          position: getRandomViewerPosition(),
          color: fighter.color
        };
        
        gameState.viewers.push(newViewer);
        newViewers.push(newViewer);
      }
    });
    
    // Notify clients that fighters have returned to viewers
    io.emit('fightersReturnedToViewers', {
      fighter1Id: fighter1 ? fighter1.id : null,
      fighter2Id: fighter2 ? fighter2.id : null,
      newViewers: newViewers // Send the new viewer objects to all clients
    });
    
    // After another short delay, select new fighters
    setTimeout(() => {
      if (gameState.viewers.length >= 2) {
        selectNewFighters();
      }
    }, 2000); // Increased delay to ensure proper transition
  }, 2000); // Increased delay to ensure proper transition
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

// Add this to the game loop that runs on the server
function updateGameState() {
  // Update fighter positions based on their movement state
  if (gameState.fighters.length === 2) { // Only process if we have exactly 2 fighters
    // First update positions based on movement input
    gameState.fighters.forEach(fighter => {
      if (!fighter) return; // Skip if fighter is undefined
      
      let movementX = 0;
      if (fighter.isMovingLeft) movementX -= 0.1;
      if (fighter.isMovingRight) movementX += 0.1;
      
      if (movementX !== 0) {
        fighter.position.x += movementX;
      }
    });
    
    // Then check for collisions between fighters
    if (gameState.fighters[0] && gameState.fighters[1]) {
      handleFighterCollision(gameState.fighters[0], gameState.fighters[1]);
    }
    
    // Finally, check boundaries and broadcast updates
    gameState.fighters.forEach(fighter => {
      if (!fighter) return;
      
      // Keep fighter within the ring
      const maxX = gameState.ring.radius - 1;
      fighter.position.x = Math.max(-maxX, Math.min(maxX, fighter.position.x));
      
      // Check for ring out
      if (Math.abs(fighter.position.x) >= maxX) {
        const loserId = fighter.id;
        const winnerId = gameState.fighters.find(f => f && f.id !== loserId)?.id;
        
        if (winnerId) {
          endFight(winnerId, loserId);
          return; // Exit early if fight ended
        }
      }
      
      // Broadcast position update
      io.emit('fighterUpdated', fighter);
    });
  }
  
  // Schedule next update
  setTimeout(updateGameState, 16); // ~60fps
}

// Start the game loop
updateGameState();

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function processSumoTechnique(attacker, defender, techniqueData) {
  // Calculate distance between fighters
  const distance = Math.abs(attacker.position.x - defender.position.x);
  const inRange = distance < 2.5; // Within striking distance
  
  if (!inRange) return; // Too far to hit
  
  let pushPower = 0;
  let knockoutChance = 0;
  
  switch (techniqueData.technique) {
    case 'shove':
      pushPower = 0.5 * techniqueData.power;
      knockoutChance = 0.1 * techniqueData.power;
      break;
    case 'slap':
      pushPower = 0.3 * techniqueData.power;
      knockoutChance = 0.05 * techniqueData.power;
      break;
    case 'charge':
      pushPower = 0.8 * techniqueData.power;
      knockoutChance = 0.2 * techniqueData.power;
      break;
  }
  
  // Reduce push power if defender is defending
  if (defender.isDefending) {
    pushPower *= 0.5;
    knockoutChance *= 0.3;
  }
  
  // Defender is pushed back
  const direction = attacker.position.x < defender.position.x ? 1 : -1;
  defender.position.x += direction * pushPower;
  
  // Attacker gets pushed back slightly (recoil)
  attacker.position.x -= direction * (pushPower * 0.2);
  
  // Check for ring out
  const maxX = gameState.ring.radius - 1;
  if (Math.abs(defender.position.x) >= maxX) {
    // Ring out - attacker wins
    endFight(attacker.id, defender.id);
    return;
  }
  
  // Check for knockout
  if (Math.random() < knockoutChance) {
    // Knockout - attacker wins
    endFight(attacker.id, defender.id);
    return;
  }
  
  // Update both fighters' positions
  io.emit('fighterUpdated', defender);
  io.emit('fighterUpdated', attacker);
  
  // Emit stagger effect if powerful hit
  if (pushPower > 0.5 && !defender.isDefending) {
    io.emit('fighterStaggered', {
      fighterId: defender.id,
      duration: Math.floor(pushPower * 1000) // Stagger duration based on power
    });
  }
}

// Add this new function for collision handling
function handleFighterCollision(fighter1, fighter2) {
  // Calculate distance between fighters
  const distance = Math.abs(fighter1.position.x - fighter2.position.x);
  const collisionThreshold = 2.0; // Minimum distance before collision occurs
  
  if (distance < collisionThreshold) {
    // Collision detected!
    
    // Calculate collision response
    const overlap = collisionThreshold - distance;
    const direction = fighter1.position.x < fighter2.position.x ? 1 : -1;
    
    // Calculate push force based on momentum and weight
    const fighter1Momentum = fighter1.momentum || 0;
    const fighter2Momentum = fighter2.momentum || 0;
    
    // Default weights if not specified
    const fighter1Weight = fighter1.isHeavy ? 1.3 : 1.0;
    const fighter2Weight = fighter2.isHeavy ? 1.3 : 1.0;
    
    // Calculate push factors
    const totalForce = fighter1Momentum + fighter2Momentum;
    let fighter1PushFactor = 0.5; // Default to equal push
    let fighter2PushFactor = 0.5;
    
    if (totalForce > 0) {
      // Adjust push based on momentum
      fighter1PushFactor = fighter2Momentum / totalForce;
      fighter2PushFactor = fighter1Momentum / totalForce;
    }
    
    // Adjust for weight
    fighter1PushFactor *= (fighter2Weight / fighter1Weight);
    fighter2PushFactor *= (fighter1Weight / fighter2Weight);
    
    // Normalize factors
    const totalFactor = fighter1PushFactor + fighter2PushFactor;
    fighter1PushFactor /= totalFactor;
    fighter2PushFactor /= totalFactor;
    
    // Apply push to both fighters
    fighter1.position.x -= overlap * fighter1PushFactor * direction;
    fighter2.position.x += overlap * fighter2PushFactor * direction;
    
    // Collision feedback - reduce momentum
    if (fighter1.momentum !== undefined) {
      fighter1.momentum = Math.max(0, fighter1.momentum - 0.2);
    }
    if (fighter2.momentum !== undefined) {
      fighter2.momentum = Math.max(0, fighter2.momentum - 0.2);
    }
    
    // Emit collision event to clients for visual/audio feedback
    io.emit('fighterCollision', {
      fighter1Id: fighter1.id,
      fighter2Id: fighter2.id,
      intensity: overlap * Math.max(fighter1Momentum, fighter2Momentum)
    });
  }
} 