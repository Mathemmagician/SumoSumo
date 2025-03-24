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
      resetFighters();
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

  // Require at least 3 watchers to pick 2 fighters + 1 referee
  if (gameState.viewers.length < 3) {
    console.log("Not enough viewers to select fighters + referee");
    changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
    return;
  }

  // Move existing referee back to viewers if we have one
  if (gameState.referee) {
    gameState.referee.role = 'viewer';
    gameState.viewers.push(gameState.referee);
    gameState.referee = null;
  }

  // Select 2 random viewers to be fighters
  const fighter1Index = Math.floor(Math.random() * gameState.viewers.length);
  const fighter1 = gameState.viewers.splice(fighter1Index, 1)[0];

  const fighter2Index = Math.floor(Math.random() * gameState.viewers.length);
  const fighter2 = gameState.viewers.splice(fighter2Index, 1)[0];

  // Set their roles & positions (no more .ready here)
  fighter1.role = 'fighter';
  fighter1.position = { x: -3, y: 0, z: 0 };
  fighter1.rotation = -Math.PI / 2;

  fighter2.role = 'fighter';
  fighter2.position = { x: 3, y: 0, z: 0 };
  fighter2.rotation = Math.PI / 2;

  // Add them to the fighters array
  gameState.fighters.push(fighter1);
  gameState.fighters.push(fighter2);

  // Select a referee from the remaining viewers
  const refereeIndex = Math.floor(Math.random() * gameState.viewers.length);
  gameState.referee = gameState.viewers.splice(refereeIndex, 1)[0];
  gameState.referee.role = 'referee';
  gameState.referee.position = { x: 0, y: 2, z: 0 };

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

  // Move fighters slightly apart
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

  // Reset fighter positions
  gameState.fighters[0].position = { x: -3, y: 0, z: 0 };
  gameState.fighters[1].position = { x: 3, y: 0, z: 0 };

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

// Reset fighters after a match
function resetFighters() {
  // Move all current fighters to viewers
  gameState.fighters.forEach(fighter => {
    fighter.role = 'viewer';
    gameState.viewers.push(fighter);

    // Broadcast role change
    io.emit('playerRoleChanged', {
      id: fighter.id,
      role: 'viewer'
    });
  });

  // Clear the fighters array
  gameState.fighters = [];

  // Broadcast that the fighters have been reset
  io.emit('fightersReset');
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
    seed: Math.floor(Math.random() * 1000000) // Random seed for any future randomization needs
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

    // Update position based on direction (left/right)
    if (direction === 'left') {
      fighter.position.x -= 0.2;
      fighter.rotation = Math.PI / 2;  // Face left
    } else if (direction === 'right') {
      fighter.position.x += 0.2;
      fighter.rotation = -Math.PI / 2; // Face right
    }

    // Simple 1D boundary check (only X-axis)
    if (Math.abs(fighter.position.x) > gameState.ringRadius) {
      // Player fell out of the ring
      endRound(fighter.id);
      return;
    }

    // Check for collision with other fighter
    const otherFighter = gameState.fighters.find(f => f.id !== socket.id);
    if (otherFighter) {
      const distance = Math.abs(fighter.position.x - otherFighter.position.x);
      if (distance < 1.5) {
        // Simple pushing mechanic
        const pushDirection = fighter.position.x < otherFighter.position.x ? 1 : -1;
        otherFighter.position.x += pushDirection * 0.15;

        // Check if pushed fighter is out of the ring
        if (Math.abs(otherFighter.position.x) > gameState.ringRadius) {
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

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initGameState();
});
