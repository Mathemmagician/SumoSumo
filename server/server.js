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
  fighters: [], // (max 2)
  referee: null,
  viewers: [],
  ringRadius: 7,
  stage: 'WAITING_FOR_PLAYERS',
  stageTimer: null,
  stageStartTime: null,
  stageDuration: 0,

  // Track sponsor timeouts so we can clear them if ceremony ends early
  sponsorTimeouts: []
};

// Game stage constants
const GAME_STAGES = {
  WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
  FIGHTER_SELECTION: 'FIGHTER_SELECTION',
  PRE_MATCH_CEREMONY: 'PRE_MATCH_CEREMONY',
  MATCH_IN_PROGRESS: 'MATCH_IN_PROGRESS',
  VICTORY_CEREMONY: 'VICTORY_CEREMONY',
  POST_MATCH_COOLDOWN: 'POST_MATCH_COOLDOWN'
};

// Stage durations in milliseconds
const STAGE_DURATIONS = {
  [GAME_STAGES.WAITING_FOR_PLAYERS]: 0,      // Indefinite until enough players
  [GAME_STAGES.FIGHTER_SELECTION]: 5000,
  [GAME_STAGES.PRE_MATCH_CEREMONY]: 10000,
  [GAME_STAGES.MATCH_IN_PROGRESS]: 30000,
  [GAME_STAGES.VICTORY_CEREMONY]: 8000,
  [GAME_STAGES.POST_MATCH_COOLDOWN]: 5000
};

// Add near the top with other state variables
const FAKE_USERS = {
  count: 0,
  users: new Map(), // Store fake user data
  intervals: new Map(), // Store intervals for each fake user
  targetCount: 50,
  disconnectInterval: null,
  reconnectInterval: null
};

// Function to change the game stage
function changeGameStage(newStage) {
  // Clear any existing stage timer
  if (gameState.stageTimer) {
    clearTimeout(gameState.stageTimer);
    gameState.stageTimer = null;
  }

  // If we are leaving PRE_MATCH_CEREMONY, clear sponsor timeouts
  if (gameState.stage === GAME_STAGES.PRE_MATCH_CEREMONY) {
    if (gameState.sponsorTimeouts && gameState.sponsorTimeouts.length > 0) {
      for (const t of gameState.sponsorTimeouts) {
        clearTimeout(t);
      }
      gameState.sponsorTimeouts = [];
    }
  }

  const oldStage = gameState.stage;
  gameState.stage = newStage;
  gameState.stageStartTime = Date.now();
  gameState.stageDuration = STAGE_DURATIONS[newStage];

  console.log(`Game stage changed: ${oldStage} -> ${newStage}`);

  // Broadcast stage change to all clients
  io.emit('stageChange', {
    stage: newStage,
    duration: gameState.stageDuration
  });

  // Handle stage-specific logic
  switch (newStage) {
    case GAME_STAGES.WAITING_FOR_PLAYERS:
      // Reset game state when waiting for players
      resetGameState();
      break;

    case GAME_STAGES.FIGHTER_SELECTION:
      selectFighters();
      break;

    case GAME_STAGES.PRE_MATCH_CEREMONY:
      startPreMatchCeremony();
      break;

    case GAME_STAGES.MATCH_IN_PROGRESS:
      startMatch();
      break;

    case GAME_STAGES.VICTORY_CEREMONY:
      // This is triggered by match end, not by timer
      break;

    case GAME_STAGES.POST_MATCH_COOLDOWN:
      resetGameState();
      break;
  }

  // Set timer for next stage if this stage has a duration
  if (gameState.stageDuration > 0) {
    gameState.stageTimer = setTimeout(() => {
      progressToNextStage(newStage);
    }, gameState.stageDuration);
  }
}

// Function to determine and progress to the next stage
function progressToNextStage(currentStage) {
  switch (currentStage) {
    case GAME_STAGES.WAITING_FOR_PLAYERS:
      // Need at least 3 viewers to proceed
      if (gameState.viewers.length >= 3) {
        changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
      }
      break;

    case GAME_STAGES.FIGHTER_SELECTION:
      changeGameStage(GAME_STAGES.PRE_MATCH_CEREMONY);
      break;

    case GAME_STAGES.PRE_MATCH_CEREMONY:
      changeGameStage(GAME_STAGES.MATCH_IN_PROGRESS);
      break;

    case GAME_STAGES.MATCH_IN_PROGRESS:
      // If time runs out, declare a draw
      declareDraw();
      break;

    case GAME_STAGES.VICTORY_CEREMONY:
      changeGameStage(GAME_STAGES.POST_MATCH_COOLDOWN);
      break;

    case GAME_STAGES.POST_MATCH_COOLDOWN:
      // Start a new round if we still have at least 3 viewers
      if (gameState.viewers.length >= 3) {
        changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
      } else {
        changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
      }
      break;
  }
}

// Select fighters AND a referee from viewers
function selectFighters() {
  // Always start with empty fighters array
  gameState.fighters = [];

  // Filter out viewer-only players
  const eligibleViewers = gameState.viewers.filter(viewer => !viewer.viewerOnly);

  // Require at least 3 eligible viewers to pick 2 fighters + 1 referee
  if (eligibleViewers.length < 3) {
    console.log("Not enough eligible viewers to select fighters + referee");
    changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
    return;
  }

  // Move existing referee back to viewers if we have one
  if (gameState.referee) {
    gameState.referee.role = 'viewer';
    gameState.viewers.push(gameState.referee);
    gameState.referee = null;
  }

  // Select 2 random eligible viewers to be fighters
  const fighter1Index = Math.floor(Math.random() * eligibleViewers.length);
  const fighter1 = eligibleViewers.splice(fighter1Index, 1)[0];
  
  // Remove fighter1 from viewers array
  gameState.viewers = gameState.viewers.filter(v => v.id !== fighter1.id);

  const fighter2Index = Math.floor(Math.random() * eligibleViewers.length);
  const fighter2 = eligibleViewers.splice(fighter2Index, 1)[0];
  
  // Remove fighter2 from viewers array
  gameState.viewers = gameState.viewers.filter(v => v.id !== fighter2.id);

  // Set their roles & positions with Z coordinate
  fighter1.role = 'fighter';
  fighter1.position = { x: -3, y: 2, z: 0 };
  fighter1.rotation = Math.PI / 2;

  fighter2.role = 'fighter';
  fighter2.position = { x: 3, y: 2, z: 0 };
  fighter2.rotation = -Math.PI / 2;

  // Add them to the fighters array
  gameState.fighters.push(fighter1);
  gameState.fighters.push(fighter2);

  // Select a referee from the remaining eligible viewers
  const eligibleForReferee = eligibleViewers.filter(v => !v.viewerOnly);
  if (eligibleForReferee.length > 0) {
    const refereeIndex = Math.floor(Math.random() * eligibleForReferee.length);
    gameState.referee = eligibleForReferee.splice(refereeIndex, 1)[0];
    // Remove referee from viewers array
    gameState.viewers = gameState.viewers.filter(v => v.id !== gameState.referee.id);
    gameState.referee.role = 'referee';
    gameState.referee.position = { x: 0, y: 2, z: -2 }; // Place referee at north side
  } else {
    console.log("No eligible viewers for referee role");
    changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
    return;
  }

  // Announce fighter selection
  io.emit('fightersSelected', {
    fighter1: sanitizeForSocketIO(fighter1),
    fighter2: sanitizeForSocketIO(fighter2),
    referee: sanitizeForSocketIO(gameState.referee)
  });
}

// Start pre-match ceremony
function startPreMatchCeremony() {
  // Check if we have enough fighters
  if (gameState.fighters.length < 2) {
    console.log("Not enough fighters for ceremony, returning to fighter selection");
    changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
    return;
  }

  // Clear out any leftover sponsor timeouts, just in case
  if (gameState.sponsorTimeouts && gameState.sponsorTimeouts.length > 0) {
    for (const t of gameState.sponsorTimeouts) {
      clearTimeout(t);
    }
    gameState.sponsorTimeouts = [];
  }

  // Broadcast pre-match ceremony start
  io.emit('preCeremonyStart', {
    fighters: sanitizeForSocketIO(gameState.fighters),
    referee: sanitizeForSocketIO(gameState.referee)
  });

  // Move fighters slightly apart and up in the air
  gameState.fighters[0].position = { x: -5, y: 2, z: 0 };
  gameState.fighters[1].position = { x: 5, y: 2, z: 0 };

  // Broadcast updated positions
  gameState.fighters.forEach(fighter => {
    io.emit('playerMoved', {
      id: fighter.id,
      position: fighter.position,
      rotation: fighter.rotation
    });
  });

  // Schedule sponsor banners
  const t1 = setTimeout(() => {
    if (gameState.stage === GAME_STAGES.PRE_MATCH_CEREMONY) {
      io.emit('sponsorBanner', {
        sponsor: 'SumoEnergy Drinks',
        duration: 3000
      });
    }
  }, 2000);
  gameState.sponsorTimeouts.push(t1);

  const t2 = setTimeout(() => {
    if (gameState.stage === GAME_STAGES.PRE_MATCH_CEREMONY) {
      io.emit('sponsorBanner', {
        sponsor: 'MegaSumo Protein',
        duration: 3000
      });
    }
  }, 6000);
  gameState.sponsorTimeouts.push(t2);
}

// Start the actual match
function startMatch() {
  // Check if we have enough fighters
  if (gameState.fighters.length < 2) {
    console.log("Not enough fighters for match, returning to fighter selection");
    changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
    return;
  }

  // Reset fighter positions - place them on opposite sides of the ring
  gameState.fighters[0].position = { x: -3, y: 2, z: 0 };
  gameState.fighters[0].rotation = Math.PI / 2; // Face right/east
  
  gameState.fighters[1].position = { x: 3, y: 2, z: 0 };
  gameState.fighters[1].rotation = -Math.PI / 2; // Face left/west

  // Broadcast match start
  io.emit('matchStart', {
    fighters: sanitizeForSocketIO(gameState.fighters)
  });

  // Broadcast updated positions
  gameState.fighters.forEach(fighter => {
    io.emit('playerMoved', {
      id: fighter.id,
      position: fighter.position,
      rotation: fighter.rotation
    });
  });
}

// Declare a draw (if time runs out)
function declareDraw() {
  io.emit('matchDraw', {
    fighters: gameState.fighters
  });
  changeGameStage(GAME_STAGES.VICTORY_CEREMONY);
}

// End a round with a winner and loser
function endRound(loserId) {
  // Find the loser
  const loser = gameState.fighters.find(f => f.id === loserId);
  if (!loser) return;

  // Find the winner (the other fighter)
  const winner = gameState.fighters.find(f => f.id !== loserId);

  // Announce the winner
  io.emit('matchEnd', {
    winnerId: winner ? winner.id : null,
    loserId
  });

  // Change to victory ceremony stage
  changeGameStage(GAME_STAGES.VICTORY_CEREMONY);
}


function sanitizeForSocketIO(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForSocketIO(item));
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] !== 'function' && key !== 'socket') {
        newObj[key] = sanitizeForSocketIO(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

// When a client connects
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new player
  const player = {
    id: socket.id,
    role: 'viewer',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    faceId: Math.floor(Math.random() * 10),  // 0-9 inclusive
    colorId: Math.floor(Math.random() * 10), // 0-9 inclusive
    seed: Math.floor(Math.random() * 1000000), // Random seed for any future randomization needs
    viewerOnly: false  // New field, default false
  };

  // Add to viewers
  gameState.viewers.push(player);

  // Debug info
  console.log(
    `Server player counts - Fighters: ${gameState.fighters.length}, Viewers: ${gameState.viewers.length}, Referee: ${gameState.referee ? 1 : 0}`
  );

  // Send initial game state to the new player
  socket.emit('gameState', {
    fighters: sanitizeForSocketIO(gameState.fighters),
    referee: sanitizeForSocketIO(gameState.referee),
    viewers: sanitizeForSocketIO(gameState.viewers),
    currentStage: gameState.stage,
    stageTimeRemaining: gameState.stageDuration > 0
      ? gameState.stageDuration - (Date.now() - gameState.stageStartTime)
      : 0
  });

  // Broadcast new player to everyone else
  socket.broadcast.emit('playerJoined', sanitizeForSocketIO(player));

  // Check if we should start the game
  if (gameState.stage === GAME_STAGES.WAITING_FOR_PLAYERS && gameState.viewers.length >= 3) {
    changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
  }

  // Handle player movement
  socket.on('move', (direction) => {
    // Only fighters can move during the match
    if (player.role !== 'fighter' || gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) return;

    const fighter = gameState.fighters.find(f => f.id === socket.id);
    if (!fighter) return;

    // Get the other fighter for reference
    const otherFighter = gameState.fighters.find(f => f.id !== socket.id);
    if (!otherFighter) return;
    
    // Calculate direction vector to opponent
    const dirToOpponent = {
      x: otherFighter.position.x - fighter.position.x,
      z: otherFighter.position.z - fighter.position.z
    };
    
    // Normalize the direction vector
    const length = Math.sqrt(dirToOpponent.x * dirToOpponent.x + dirToOpponent.z * dirToOpponent.z);
    if (length > 0) {
      dirToOpponent.x /= length;
      dirToOpponent.z /= length;
    }
    
    // Movement speed
    const moveSpeed = 0.2;
    
    // Calculate movement based on direction relative to opponent
    switch(direction) {
      case 'forward': // Move toward opponent
        fighter.position.x += dirToOpponent.x * moveSpeed;
        fighter.position.z += dirToOpponent.z * moveSpeed;
        // Set rotation to face opponent
        fighter.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
        break;
        
      case 'backward': // Move away from opponent
        fighter.position.x -= dirToOpponent.x * moveSpeed;
        fighter.position.z -= dirToOpponent.z * moveSpeed;
        // Still face the opponent
        fighter.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
        break;
        
      case 'left': // Move left relative to opponent
        // Calculate perpendicular vector (left of direction to opponent)
        fighter.position.x += -dirToOpponent.z * moveSpeed;
        fighter.position.z += dirToOpponent.x * moveSpeed;
        // Update rotation
        fighter.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
        break;
        
      case 'right': // Move right relative to opponent
        // Calculate perpendicular vector (right of direction to opponent)
        fighter.position.x += dirToOpponent.z * moveSpeed;
        fighter.position.z += -dirToOpponent.x * moveSpeed;
        // Update rotation
        fighter.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
        break;
    }

    // Boundary check - full 2D circle boundary now
    const distanceFromCenter = Math.sqrt(
      fighter.position.x * fighter.position.x + 
      fighter.position.z * fighter.position.z
    );
    
    if (distanceFromCenter > gameState.ringRadius) {
      // Player fell out of the ring
      endRound(fighter.id);
      return;
    }

    // Check for collision with other fighter
    if (otherFighter) {
      const distance = Math.sqrt(
        Math.pow(fighter.position.x - otherFighter.position.x, 2) + 
        Math.pow(fighter.position.z - otherFighter.position.z, 2)
      );
      
      if (distance < 1.5) {
        // Simple pushing mechanic - push in direction of impact
        const pushDir = {
          x: otherFighter.position.x - fighter.position.x,
          z: otherFighter.position.z - fighter.position.z
        };
        
        // Normalize push direction
        const pushLength = Math.sqrt(pushDir.x * pushDir.x + pushDir.z * pushDir.z);
        if (pushLength > 0) {
          pushDir.x /= pushLength;
          pushDir.z /= pushLength;
        }
        
        // Push strength is higher when moving toward opponent
        const pushStrength = direction === 'forward' ? 0.25 : 0.15;
        
        otherFighter.position.x += pushDir.x * pushStrength;
        otherFighter.position.z += pushDir.z * pushStrength;

        // Check if pushed fighter is out of the ring
        const otherDistanceFromCenter = Math.sqrt(
          otherFighter.position.x * otherFighter.position.x + 
          otherFighter.position.z * otherFighter.position.z
        );
        
        if (otherDistanceFromCenter > gameState.ringRadius) {
          endRound(otherFighter.id);
          return;
        }

        // Broadcast other fighter's position update
        io.emit('playerMoved', {
          id: otherFighter.id,
          position: otherFighter.position,
          rotation: otherFighter.rotation
        });
      }
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
    if (message.length > 50) {
      message = message.substring(0, 50);
    }

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

    let playerRole = null;

    // Determine the player's role before removing them
    if (gameState.fighters.some(f => f.id === socket.id)) {
      playerRole = 'fighter';
    } else if (gameState.referee && gameState.referee.id === socket.id) {
      playerRole = 'referee';
    } else if (gameState.viewers.some(v => v.id === socket.id)) {
      playerRole = 'viewer';
    }

    // Remove player from appropriate array
    if (playerRole === 'fighter') {
      gameState.fighters = gameState.fighters.filter(f => f.id !== socket.id);

      // If a fighter leaves during the match, the other fighter wins automatically
      if (gameState.stage === GAME_STAGES.MATCH_IN_PROGRESS && gameState.fighters.length < 2) {
        const remainingFighter = gameState.fighters[0];
        if (remainingFighter) {
          io.emit('matchEnd', {
            winnerId: remainingFighter.id,
            loserId: socket.id,
            reason: 'disconnect'
          });
          changeGameStage(GAME_STAGES.VICTORY_CEREMONY);
        } else {
          // No fighters left
          changeGameStage(GAME_STAGES.POST_MATCH_COOLDOWN);
        }
      }

      // If a fighter leaves during PRE_MATCH_CEREMONY
      if (gameState.stage === GAME_STAGES.PRE_MATCH_CEREMONY && gameState.fighters.length < 2) {
        console.log("A fighter left during PRE_MATCH_CEREMONY.");
        // Decide where to revert: if we still have at least 3 viewers, do FIGHTER_SELECTION; else WAITING
        if (gameState.viewers.length >= 3) {
          changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
        } else {
          changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
        }
      }

    } else if (playerRole === 'referee') {
      gameState.referee = null;
      // We do NOT reassign a referee immediately here—it's chosen at next FIGHTER_SELECTION
    } else if (playerRole === 'viewer') {
      gameState.viewers = gameState.viewers.filter(v => v.id !== socket.id);
    }

    // Broadcast player left
    io.emit('playerLeft', socket.id);

    // Check if we need to return to WAITING_FOR_PLAYERS
    if ((gameState.viewers.length + gameState.fighters.length) < 2) {
      changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
    }
  });

  // Add a new socket event handler for toggling viewer-only status
  socket.on('toggleViewerOnly', (value) => {
    // Find the player in any of the possible arrays
    let player = gameState.viewers.find(v => v.id === socket.id) ||
                 gameState.fighters.find(f => f.id === socket.id) ||
                 (gameState.referee && gameState.referee.id === socket.id ? gameState.referee : null);

    if (player) {
      player.viewerOnly = !!value; // Convert to boolean
      // Notify the client that the change was successful
      socket.emit('viewerOnlyUpdated', player.viewerOnly);
    }
  });
});

// Initialize the game state
function initGameState() {
  gameState.stage = GAME_STAGES.WAITING_FOR_PLAYERS;
  gameState.stageStartTime = Date.now();
  gameState.stageDuration = STAGE_DURATIONS[GAME_STAGES.WAITING_FOR_PLAYERS];
}

// Completely reset the game state
function resetGameState() {
  // Move all fighters to viewers
  gameState.fighters.forEach(fighter => {
    fighter.role = 'viewer';
    gameState.viewers.push(fighter);
    io.emit('playerRoleChanged', { id: fighter.id, role: 'viewer' });
  });

  // Move referee to viewers if exists
  if (gameState.referee) {
    gameState.referee.role = 'viewer';
    gameState.viewers.push(gameState.referee);
    io.emit('playerRoleChanged', { id: gameState.referee.id, role: 'viewer' });
  }

  // Clear arrays AFTER moving players
  gameState.fighters = [];
  gameState.referee = null;

  // Broadcast the reset
  io.emit('gameStateReset');
}

// Add these new functions after the other initialization functions
function startFakeUserSystem() {
  // Initially add 20 fake users
  while (FAKE_USERS.count < FAKE_USERS.targetCount) {
    addFakeUser();
  }

  // Periodically disconnect random fake users
  FAKE_USERS.disconnectInterval = setInterval(() => {
    if (FAKE_USERS.users.size > 0) {
      const numToDisconnect = Math.floor(Math.random() * 3) + 1; // Disconnect 1-3 users
      const fakeUserIds = Array.from(FAKE_USERS.users.keys());
      
      for (let i = 0; i < numToDisconnect && i < fakeUserIds.length; i++) {
        const randomIndex = Math.floor(Math.random() * fakeUserIds.length);
        const userId = fakeUserIds[randomIndex];
        disconnectFakeUser(userId);
        fakeUserIds.splice(randomIndex, 1);
      }
    }
  }, 15000); // Every 15 seconds

  // Periodically reconnect or add new fake users to maintain target count
  FAKE_USERS.reconnectInterval = setInterval(() => {
    const currentTotal = FAKE_USERS.users.size;
    if (currentTotal < FAKE_USERS.targetCount) {
      const numToAdd = FAKE_USERS.targetCount - currentTotal;
      for (let i = 0; i < numToAdd; i++) {
        addFakeUser();
      }
    }
  }, 10000); // Every 10 seconds
}

function addFakeUser() {
  const fakeId = `fake-${FAKE_USERS.count++}`;
  
  // Create fake user with random properties
  const fakeUser = {
    id: fakeId,
    role: 'viewer',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    faceId: Math.floor(Math.random() * 10),
    colorId: Math.floor(Math.random() * 10),
    seed: Math.floor(Math.random() * 1000000)
  };

  // Store fake user
  FAKE_USERS.users.set(fakeId, fakeUser);

  // Add to game state
  gameState.viewers.push(fakeUser);

  // Broadcast new player to all clients
  io.emit('playerJoined', sanitizeForSocketIO(fakeUser));

  // Set up intervals for fake user behavior
  const intervals = [];

  // Random emotes
  intervals.push(setInterval(() => {
    if (Math.random() < 0.3) {
      const emotes = ['👋', '👍', '🎉', '❤️', '😊'];
      const emote = emotes[Math.floor(Math.random() * emotes.length)];
      
      io.emit('playerEmote', {
        id: fakeId,
        emote: emote
      });

      // Clear emote after 2-4 seconds
      setTimeout(() => {
        io.emit('playerEmote', {
          id: fakeId,
          emote: null
        });
      }, 2000 + Math.random() * 2000);
    }
  }, 5000));

  // Random messages
  intervals.push(setInterval(() => {
    if (Math.random() < 0.2) {
      const messages = [
        'Go fighters!',
        'Amazing match!',
        'You can do it!',
        'What a move!',
        'This is exciting!',
        'Great technique!'
      ];
      const message = messages[Math.floor(Math.random() * messages.length)];
      
      io.emit('playerMessage', {
        id: fakeId,
        message: message
      });

      // Clear message after 3-5 seconds
      setTimeout(() => {
        io.emit('playerMessage', {
          id: fakeId,
          message: null
        });
      }, 3000 + Math.random() * 2000);
    }
  }, 8000));

  // Store intervals for cleanup
  FAKE_USERS.intervals.set(fakeId, intervals);

  // Check if we should start the game
  if (gameState.stage === GAME_STAGES.WAITING_FOR_PLAYERS && gameState.viewers.length >= 3) {
    changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
  }
}

function disconnectFakeUser(fakeId) {
  // Clear intervals
  const intervals = FAKE_USERS.intervals.get(fakeId);
  if (intervals) {
    intervals.forEach(interval => clearInterval(interval));
    FAKE_USERS.intervals.delete(fakeId);
  }

  // Remove from game state
  gameState.viewers = gameState.viewers.filter(v => v.id !== fakeId);
  gameState.fighters = gameState.fighters.filter(f => f.id !== fakeId);
  if (gameState.referee && gameState.referee.id === fakeId) {
    gameState.referee = null;
  }

  // Remove from fake users map
  FAKE_USERS.users.delete(fakeId);

  // Broadcast disconnect
  io.emit('playerLeft', fakeId);

  // Check if we need to return to WAITING_FOR_PLAYERS
  if ((gameState.viewers.length + gameState.fighters.length) < 2) {
    changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
  }
}

function stopFakeUserSystem() {
  // Clear main intervals
  if (FAKE_USERS.disconnectInterval) {
    clearInterval(FAKE_USERS.disconnectInterval);
    FAKE_USERS.disconnectInterval = null;
  }
  if (FAKE_USERS.reconnectInterval) {
    clearInterval(FAKE_USERS.reconnectInterval);
    FAKE_USERS.reconnectInterval = null;
  }

  // Disconnect all fake users
  for (const fakeId of FAKE_USERS.users.keys()) {
    disconnectFakeUser(fakeId);
  }

  // Reset counters
  FAKE_USERS.count = 0;
}

// Modify the server startup to include fake users
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initGameState();
  startFakeUserSystem(); // Start the fake user system
});
