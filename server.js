import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create server instances
const app = express();
const server = createServer(app);

// Set up CORS for Socket.io (needed for development when frontend is on a different port)
const io = new Server(server, {
  cors: {
    origin: "*", // WARNING: Only use this in development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Add CORS middleware for HTTP requests
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));

// Store the last 5 messages
const messageHistory = [];
const MAX_MESSAGE_HISTORY = 5;

// Bot configuration
const BOT_TYPES = {
  FIGHTER: 'fighter-bot',
  REFEREE: 'referee-bot'
};

const BOT_CONFIG = {
  moveInterval: 30,     // How often bot makes movement decisions (ms) - reduced for smoother movement
  movementChangeInterval: 200, // How often bot changes direction (ms)
  botMovementIntervals: new Map(), // Store bot movement intervals
  botDirections: new Map() // Store current direction for each bot
};

// List of Japanese names for players
const JAPANESE_FIRST_NAMES = [
  "Mighty", "Fat", "Nimble", "Infamous", "Thunderous",
  "Featherlight", "Gigantic", "Whispering", "Shimmering", "Rumbling",
  "Voracious", "Bold", "Steadfast", "Sneaky", "Jolly",
  "Grandiose", "Glistening", "Oblivious", "Nomadic", "Savage",
  "Wise", "Cunning", "Fierce", "Ruthless", "Hilarious",
  "Glorious", "Silent", "Merciless", "Stormy", "Stalwart",
  "Devious", "Eager", "Playful", "Fearless", "Swift",
  "Ancient", "Eccentric", "Harmonious", "Enigmatic", "Haunted"
];

const JAPANESE_LAST_NAMES = [
  "Tanaka", "Suzuki", "Sato", "Watanabe", "Ito",
  "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Yoshida",
  "Yamada", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue",
  "Kimura", "Hayashi", "Shimizu", "Saito", "Nakajima",
  "Fujimoto", "Hoshino", "Shibata", "Abe", "Ueno",
  "Takeda", "Morita", "Okada", "Kawasaki", "Fukuda",
  "Ono", "Ishikawa", "Hirano", "Takagi", "Kubo",
  "Endo", "Miyamoto", "Noguchi", "Ota", "Imai"
];


// Keep track of used names
const usedNames = new Set();

// Function to get a random unused name
function getRandomName() {
  // If all possible combinations are used, reset the used names
  if (usedNames.size >= JAPANESE_FIRST_NAMES.length * JAPANESE_LAST_NAMES.length) {
    usedNames.clear();
  }
  
  // Find an unused full name
  let firstName, lastName, fullName;
  do {
    firstName = JAPANESE_FIRST_NAMES[Math.floor(Math.random() * JAPANESE_FIRST_NAMES.length)];
    lastName = JAPANESE_LAST_NAMES[Math.floor(Math.random() * JAPANESE_LAST_NAMES.length)];
    fullName = `${firstName} ${lastName}`;
  } while (usedNames.has(fullName));
  
  // Mark this name as used
  usedNames.add(fullName);
  return fullName;
}

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
  sponsorTimeouts: [],
  botPool: {   // Pool of bots to reuse
    fighters: [],
    referees: []
  }
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
  targetCount: 20, // Set the target count for fake users
  disconnectInterval: null,
  reconnectInterval: null,
  messageTimeouts: new Map(),
  emoteTimeouts: new Map()
};

// Add near the top with other state variables (after FAKE_USERS declaration)
const playerCountState = {
  lastCounts: {
    realUsers: 0,
    botFighters: 0,
    botReferee: 0
  }
};

// Initialize Stripe with your secret key (make sure this is not exposed in client-side code)
const stripe = Stripe('sk_test_your_secret_key');

// Add throttling to broadcastPlayerCount to prevent rapid successive calls
let lastBroadcastTime = 0;
const BROADCAST_THROTTLE = 1000; // Minimum 1 second between broadcasts

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

  // Stop bot movements when leaving the match stage
  if (gameState.stage === GAME_STAGES.MATCH_IN_PROGRESS) {
    stopBotMovement();
  }
  
  // Special handling for transitioning from VICTORY_CEREMONY
  if (gameState.stage === GAME_STAGES.VICTORY_CEREMONY && newStage === GAME_STAGES.POST_MATCH_COOLDOWN) {
    console.log('Transitioning from Victory Ceremony to Post Match Cooldown - preparing bots for next match');
    // Make sure to stop any remaining bot movements
    stopBotMovement();
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
      // Stop bot movement when victory is declared
      stopBotMovement();
      break;

    case GAME_STAGES.POST_MATCH_COOLDOWN:
      // Reset the game state and return all bots to the pool
      resetGameState();
      
      // Get current real user count after reset
      const currentRealUserCount = gameState.viewers.filter(viewer => !viewer.id.startsWith('npc-')).length;
      
      console.log(`POST_MATCH_COOLDOWN: Real user count = ${currentRealUserCount}`);
      
      // Start a new round if we have at least 1 viewer to proceed
      // The selectFighters function will handle bot allocation based on real user count
      if (currentRealUserCount >= 1) {
        // We'll allocate bots as needed in selectFighters function
        changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
      } else {
        changeGameStage(GAME_STAGES.WAITING_FOR_PLAYERS);
      }
      break;
  }

  // Set timer for next stage if this stage has a duration
  if (gameState.stageDuration > 0) {
    gameState.stageTimer = setTimeout(() => {
      progressToNextStage(newStage);
    }, gameState.stageDuration);
  }
  
  // Broadcast updated player count after stage change
  broadcastPlayerCount();
}

// Function to determine and progress to the next stage
function progressToNextStage(currentStage) {
  switch (currentStage) {
    case GAME_STAGES.WAITING_FOR_PLAYERS:
      // Get count of real users (non-NPC players)
      const realUserCount = gameState.viewers.filter(viewer => !viewer.id.startsWith('npc-')).length;
      
      // Need at least 1 viewer to proceed (we'll use bots to fill in the rest)
      if (realUserCount >= 1) {
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
      // Reset the game state and return all bots to the pool
      resetGameState();
      
      // Get current real user count after reset
      const currentRealUserCount = gameState.viewers.filter(viewer => !viewer.id.startsWith('npc-')).length;
      
      console.log(`POST_MATCH_COOLDOWN: Real user count = ${currentRealUserCount}`);
      
      // Start a new round if we have at least 1 viewer to proceed
      // The selectFighters function will handle bot allocation based on real user count
      if (currentRealUserCount >= 1) {
        // We'll allocate bots as needed in selectFighters function
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

  // Get count of real users (non-NPC players)
  const realUserCount = gameState.viewers.filter(viewer => !viewer.id.startsWith('npc-')).length;
  console.log(`Real user count: ${realUserCount}`);

  // Clean up any existing bot movement intervals
  if (BOT_CONFIG.botMovementIntervals.size > 0) {
    for (const intervals of BOT_CONFIG.botMovementIntervals.values()) {
      for (const interval of intervals) {
        clearInterval(interval);
      }
    }
    BOT_CONFIG.botMovementIntervals.clear();
  }

  // Move existing referee back to viewers if we have one
  if (gameState.referee) {
    gameState.referee.role = 'viewer';
    gameState.viewers.push(gameState.referee);
    gameState.referee = null;
  }

  // Bot allocation based on real user count
  if (realUserCount === 0) {
    // If no real users, use 2 bot fighters and 1 bot referee
    const fighter1 = createBot(BOT_TYPES.FIGHTER, 'fighter');
    const fighter2 = createBot(BOT_TYPES.FIGHTER, 'fighter');
    const referee = createBot(BOT_TYPES.REFEREE, 'referee');

    fighter1.position = { x: -3, y: 3, z: 0 };
    fighter1.rotation = Math.PI / 2;
    
    fighter2.position = { x: 3, y: 3, z: 0 };
    fighter2.rotation = -Math.PI / 2;
    
    referee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
    
    // Calculate midpoint and set rotation
    const midpoint = {
      x: (fighter1.position.x + fighter2.position.x) / 2,
      z: (fighter1.position.z + fighter2.position.z) / 2
    };
    referee.rotation = Math.atan2(midpoint.x - referee.position.x, midpoint.z - referee.position.z);

    gameState.fighters.push(fighter1);
    gameState.fighters.push(fighter2);
    gameState.referee = referee;
  } 
  else if (realUserCount === 1) {
    // If 1 real user, make them a fighter + 1 bot fighter + 1 bot referee
    const realViewer = gameState.viewers.find(viewer => !viewer.id.startsWith('npc-'));
    
    if (realViewer) {
      // Remove real user from viewers
      gameState.viewers = gameState.viewers.filter(v => v.id !== realViewer.id);

      // Make real user a fighter
      realViewer.role = 'fighter';
      realViewer.position = { x: -3, y: 3, z: 0 };
      realViewer.rotation = Math.PI / 2;
      gameState.fighters.push(realViewer);

      // Add bot fighter
      const botFighter = createBot(BOT_TYPES.FIGHTER, 'fighter');
      botFighter.position = { x: 3, y: 3, z: 0 };
      botFighter.rotation = -Math.PI / 2;
      gameState.fighters.push(botFighter);

      // Add bot referee
      const botReferee = createBot(BOT_TYPES.REFEREE, 'referee');
      botReferee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
      
      // Calculate midpoint and set rotation
      const midpoint = {
        x: (realViewer.position.x + botFighter.position.x) / 2,
        z: (realViewer.position.z + botFighter.position.z) / 2
      };
      botReferee.rotation = Math.atan2(midpoint.x - botReferee.position.x, midpoint.z - botReferee.position.z);
      
      gameState.referee = botReferee;
    }
  }
  else if (realUserCount === 2) {
    // If 2 real users, make both fighters + 1 bot referee
    const realViewers = gameState.viewers.filter(viewer => !viewer.id.startsWith('npc-')).slice(0, 2);

    if (realViewers.length === 2) {
      // Set up first real fighter
      const fighter1 = realViewers[0];
      gameState.viewers = gameState.viewers.filter(v => v.id !== fighter1.id);
      fighter1.role = 'fighter';
      fighter1.position = { x: -3, y: 3, z: 0 };
      fighter1.rotation = Math.PI / 2;
      gameState.fighters.push(fighter1);

      // Set up second real fighter
      const fighter2 = realViewers[1];
      gameState.viewers = gameState.viewers.filter(v => v.id !== fighter2.id);
      fighter2.role = 'fighter';
      fighter2.position = { x: 3, y: 3, z: 0 };
      fighter2.rotation = -Math.PI / 2;
      gameState.fighters.push(fighter2);

      // Add bot referee
      const botReferee = createBot(BOT_TYPES.REFEREE, 'referee');
      botReferee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
      
      // Calculate midpoint and set rotation
      const midpoint = {
        x: (fighter1.position.x + fighter2.position.x) / 2,
        z: (fighter1.position.z + fighter2.position.z) / 2
      };
      botReferee.rotation = Math.atan2(midpoint.x - botReferee.position.x, midpoint.z - botReferee.position.z);
      
      gameState.referee = botReferee;
    }
  }
  else {
    // For 3+ real users, use only real users (no bots)
    const eligibleRealViewers = gameState.viewers.filter(
      viewer => !viewer.viewerOnly && !viewer.id.startsWith('npc-')
    );
    
    if (eligibleRealViewers.length >= 3) {
      // We have enough real users for fighters and referee
      
      // Select 2 random fighters
      const fighter1Index = Math.floor(Math.random() * eligibleRealViewers.length);
      const fighter1 = eligibleRealViewers.splice(fighter1Index, 1)[0];
      
      // Remove fighter1 from viewers
      gameState.viewers = gameState.viewers.filter(v => v.id !== fighter1.id);
      
      const fighter2Index = Math.floor(Math.random() * eligibleRealViewers.length);
      const fighter2 = eligibleRealViewers.splice(fighter2Index, 1)[0];
      
      // Remove fighter2 from viewers
      gameState.viewers = gameState.viewers.filter(v => v.id !== fighter2.id);
      
      // Set roles and positions
      fighter1.role = 'fighter';
      fighter1.position = { x: -3, y: 3, z: 0 };
      fighter1.rotation = Math.PI / 2;
      
      fighter2.role = 'fighter';
      fighter2.position = { x: 3, y: 3, z: 0 };
      fighter2.rotation = -Math.PI / 2;
      
      // Add to fighters array
      gameState.fighters.push(fighter1);
      gameState.fighters.push(fighter2);
      
      // Select referee from remaining users
      const refereeIndex = Math.floor(Math.random() * eligibleRealViewers.length);
      const referee = eligibleRealViewers.splice(refereeIndex, 1)[0];
      
      // Remove referee from viewers
      gameState.viewers = gameState.viewers.filter(v => v.id !== referee.id);
      
      // Set referee role and position
      referee.role = 'referee';
      referee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
      
      // Calculate midpoint and set rotation
      const midpoint = {
        x: (fighter1.position.x + fighter2.position.x) / 2,
        z: (fighter1.position.z + fighter2.position.z) / 2
      };
      referee.rotation = Math.atan2(midpoint.x - referee.position.x, midpoint.z - referee.position.z);
      
      gameState.referee = referee;
    } else {
      // Not enough eligible real users, need to use some bots
      const availableRealUsers = [...eligibleRealViewers];
      
      // Assign fighters first (up to 2)
      if (availableRealUsers.length >= 1) {
        // At least one real fighter
        const fighter1 = availableRealUsers.shift();
        gameState.viewers = gameState.viewers.filter(v => v.id !== fighter1.id);
        fighter1.role = 'fighter';
        fighter1.position = { x: -3, y: 3, z: 0 };
        fighter1.rotation = Math.PI / 2;
        gameState.fighters.push(fighter1);
        
        if (availableRealUsers.length >= 1) {
          // Second real fighter
          const fighter2 = availableRealUsers.shift();
          gameState.viewers = gameState.viewers.filter(v => v.id !== fighter2.id);
          fighter2.role = 'fighter';
          fighter2.position = { x: 3, y: 3, z: 0 };
          fighter2.rotation = -Math.PI / 2;
          gameState.fighters.push(fighter2);
        } else {
          // Need bot for second fighter
          const botFighter = createBot(BOT_TYPES.FIGHTER, 'fighter');
          botFighter.position = { x: 3, y: 3, z: 0 };
          botFighter.rotation = -Math.PI / 2;
          gameState.fighters.push(botFighter);
        }
      } else {
        // Need two bot fighters
        const fighter1 = createBot(BOT_TYPES.FIGHTER, 'fighter');
        fighter1.position = { x: -3, y: 3, z: 0 };
        fighter1.rotation = Math.PI / 2;
        gameState.fighters.push(fighter1);
        
        const fighter2 = createBot(BOT_TYPES.FIGHTER, 'fighter');
        fighter2.position = { x: 3, y: 3, z: 0 };
        fighter2.rotation = -Math.PI / 2;
        gameState.fighters.push(fighter2);
      }
      
      // Assign referee from remaining real users or use bot
      if (availableRealUsers.length >= 1) {
        // Use real referee
        const referee = availableRealUsers.shift();
        gameState.viewers = gameState.viewers.filter(v => v.id !== referee.id);
        referee.role = 'referee';
        referee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
        
        // Calculate midpoint and set rotation
        const midpoint = {
          x: (fighter1.position.x + fighter2.position.x) / 2,
          z: (fighter1.position.z + fighter2.position.z) / 2
        };
        referee.rotation = Math.atan2(midpoint.x - referee.position.x, midpoint.z - referee.position.z);
        
        gameState.referee = referee;
      } else {
        // Use bot referee
        const botReferee = createBot(BOT_TYPES.REFEREE, 'referee');
        botReferee.position = { x: 0, y: 3, z: -4 }; // Position on opposite side (-z)
        
        // Calculate midpoint and set rotation
        const midpoint = {
          x: (fighter1.position.x + fighter2.position.x) / 2,
          z: (fighter1.position.z + fighter2.position.z) / 2
        };
        botReferee.rotation = Math.atan2(midpoint.x - botReferee.position.x, midpoint.z - botReferee.position.z);
        
        gameState.referee = botReferee;
      }
    }
  }

  // Start bot movement if we have bot fighters
  startBotMovement();

  // Announce fighter selection
  io.emit('fightersSelected', {
    fighter1: sanitizeForSocketIO(gameState.fighters[0]),
    fighter2: sanitizeForSocketIO(gameState.fighters[1]),
    referee: sanitizeForSocketIO(gameState.referee)
  });
  
  // Update player count after fighter selection
  broadcastPlayerCount();
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
  gameState.fighters[0].position = { x: -5, y: 3, z: 0 };
  gameState.fighters[1].position = { x: 5, y: 3, z: 0 };
  
  // Ensure the referee is looking at the center of the ring
  if (gameState.referee) {
    // Calculate angle to face the center (0,0,0) from referee's position
    const dx = 0 - gameState.referee.position.x;
    const dz = 0 - gameState.referee.position.z;
    gameState.referee.rotation = Math.atan2(dx, dz);
    
    // Also broadcast referee's updated rotation
    io.emit('playerMoved', {
      id: gameState.referee.id,
      position: gameState.referee.position,
      rotation: gameState.referee.rotation
    });
  }

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

  // Store original positions for validation
  gameState.fighters.forEach(fighter => {
    fighter.originalPosition = {
      x: fighter.position.x,
      y: fighter.position.y,
      z: fighter.position.z
    };
  });

  // Reset fighter positions - place them on opposite sides of the ring
  gameState.fighters[0].position = { x: -3, y: 3, z: 0 };
  gameState.fighters[0].rotation = Math.PI / 2; // Face right/east
  
  gameState.fighters[1].position = { x: 3, y: 3, z: 0 };
  gameState.fighters[1].rotation = -Math.PI / 2; // Face left/west

  // Position referee at a good starting position, looking at the center
  if (gameState.referee) {
    gameState.referee.position = { x: 0, y: 3, z: -4 }; // Position referee on the -z side (opposite side of ring)
    
    // Calculate midpoint between fighters
    const midpoint = {
      x: (gameState.fighters[0].position.x + gameState.fighters[1].position.x) / 2,
      z: (gameState.fighters[0].position.z + gameState.fighters[1].position.z) / 2
    };
    
    // Set rotation to face the midpoint
    gameState.referee.rotation = Math.atan2(midpoint.x - gameState.referee.position.x, midpoint.z - gameState.referee.position.z);
    
    // Broadcast referee position
    io.emit('playerMoved', {
      id: gameState.referee.id,
      position: gameState.referee.position,
      rotation: gameState.referee.rotation
    });
  }

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
  
  // Start bot movement if needed
  startBotMovement();
}

// End a round with a winner and loser
function endRound(loserId) {
  // Find the loser
  const loser = gameState.fighters.find(f => f.id === loserId);
  if (!loser) return;

  // Find the winner (the other fighter)
  const winner = gameState.fighters.find(f => f.id !== loserId);

  // Make referee announce the winner
  if (gameState.referee) {
    const winnerName = winner ? winner.name : "Unknown";
    const announcement = `${winnerName} wins!`;
    
    // Send referee message
    io.emit('playerMessage', {
      id: gameState.referee.id,
      message: announcement,
      isAnnouncement: true
    });
  }

  // Announce the winner
  io.emit('matchEnd', {
    winnerId: winner ? winner.id : null,
    loserId
  });

  // Change to victory ceremony
  changeGameStage(GAME_STAGES.VICTORY_CEREMONY);
  
  // Update player count
  broadcastPlayerCount();
}

// Declare a draw (if time runs out)
function declareDraw() {
  // Make referee announce the draw
  if (gameState.referee) {
    const announcement = "It's a draw!";
    
    // Send referee message
    io.emit('playerMessage', {
      id: gameState.referee.id,
      message: announcement,
      isAnnouncement: true
    });
  }

  io.emit('matchDraw', {
    fighters: gameState.fighters
  });
  changeGameStage(GAME_STAGES.VICTORY_CEREMONY);
}

// Create a bot player
function createBot(botType, role) {
  // Check if we have a bot of this type in the pool
  let bot = null;
  
  if (botType === BOT_TYPES.FIGHTER && gameState.botPool.fighters.length > 0) {
    // Reuse a fighter bot from the pool
    bot = gameState.botPool.fighters.pop();
    console.log(`Reusing fighter bot ${bot.id}`);
  } else if (botType === BOT_TYPES.REFEREE && gameState.botPool.referees.length > 0) {
    // Reuse a referee bot from the pool
    bot = gameState.botPool.referees.pop();
    console.log(`Reusing referee bot ${bot.id}`);
  }
  
  // If no bot found in pool, create a new one
  if (!bot) {
    const botId = `${botType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create bot with properties
    bot = {
      id: botId,
      name: getRandomName(),
      role: role,
      position: { x: 0, y: 3, z: 0 },
      rotation: 0,
      faceId: Math.floor(Math.random() * 10),
      colorId: Math.floor(Math.random() * 10),
      seed: Math.floor(Math.random() * 1000000),
      isBot: true,
      botType: botType
    };
    
    console.log(`Created new ${botType} with ID ${botId}`);
  }
  
  // Set the bot's role
  bot.role = role;
  
  return bot;
}

// Start bot movement for any bot fighters
function startBotMovement() {
  // Clear any existing bot movement intervals
  if (BOT_CONFIG.botMovementIntervals.size > 0) {
    for (const intervals of BOT_CONFIG.botMovementIntervals.values()) {
      for (const interval of intervals) {
        clearInterval(interval);
      }
    }
    BOT_CONFIG.botMovementIntervals.clear();
  }
  
  // Clear direction change timers
  BOT_CONFIG.botDirections.clear();

  // Find any bot fighters
  const botFighters = gameState.fighters.filter(fighter => fighter.isBot && fighter.botType === BOT_TYPES.FIGHTER);
  
  // Set up movement for each bot fighter
  botFighters.forEach(bot => {
    // Initialize bot direction
    const initialDirection = chooseMovementDirection();
    BOT_CONFIG.botDirections.set(bot.id, initialDirection);
    
    // Set interval for changing movement direction (strategy)
    const directionInterval = setInterval(() => {
      // Only update direction during match
      if (gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) {
        return;
      }
      
      BOT_CONFIG.botDirections.set(bot.id, chooseMovementDirection());
    }, BOT_CONFIG.movementChangeInterval);
    
    // Set interval for actual movement (much more frequent for smoothness)
    const moveInterval = setInterval(() => {
      // Only move bots during match
      if (gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) {
        return;
      }

      // Get the opponent of this bot
      const opponent = gameState.fighters.find(f => f.id !== bot.id);
      if (!opponent) return;
      
      // Store current position before updating
      const prevPosition = {
        x: bot.position.x,
        y: bot.position.y,
        z: bot.position.z
      };
      
      // Get current direction from stored bot directions
      const direction = BOT_CONFIG.botDirections.get(bot.id);
      if (!direction) return;

      // Process bot movement (similar to socket.on('move') logic)
      if (bot.role !== 'fighter' || gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) return;
    
      // Calculate direction vector to opponent
      const dirToOpponent = {
        x: opponent.position.x - bot.position.x,
        z: opponent.position.z - bot.position.z
      };
      
      // Normalize the direction vector
      const length = Math.sqrt(dirToOpponent.x * dirToOpponent.x + dirToOpponent.z * dirToOpponent.z);
      if (length > 0) {
        dirToOpponent.x /= length;
        dirToOpponent.z /= length;
      }
      
      // Calculate direction to ring center (to avoid falling out)
      const dirToCenter = {
        x: -bot.position.x,
        z: -bot.position.z
      };
      
      // Normalize the direction to center
      const centerLength = Math.sqrt(dirToCenter.x * dirToCenter.x + dirToCenter.z * dirToCenter.z);
      if (centerLength > 0) {
        dirToCenter.x /= centerLength;
        dirToCenter.z /= centerLength;
      }
      
      // Check if bot is close to the edge of the ring
      const distanceFromCenter = Math.sqrt(
        bot.position.x * bot.position.x + 
        bot.position.z * bot.position.z
      );
      
      // Ring edge awareness factor (0 when in center, 1 when at edge)
      const edgeFactor = Math.min(1, Math.max(0, (distanceFromCenter - gameState.ringRadius * 0.6) / (gameState.ringRadius * 0.4)));
      
      // Base movement speed (units per second)
      const baseSpeed = 4.5;
      
      // Calculate actual movement using a fixed delta time
      const moveSpeed = baseSpeed * (BOT_CONFIG.moveInterval / 1000);
      
      // Vector to use for movement calculation
      let moveVector = {x: 0, z: 0};
      
      // Is opponent near the edge?
      const opponentDistanceFromCenter = Math.sqrt(
        opponent.position.x * opponent.position.x + 
        opponent.position.z * opponent.position.z
      );
      
      const opponentNearEdge = opponentDistanceFromCenter > gameState.ringRadius * 0.7;
      
      // Calculate movement based on direction and ring awareness
      switch(direction) {
        case 'forward': 
          if (edgeFactor > 0.7 && !opponentNearEdge) {
            // If bot is too close to edge and opponent is not - blend with center direction
            moveVector.x = dirToOpponent.x * (1 - edgeFactor) + dirToCenter.x * edgeFactor;
            moveVector.z = dirToOpponent.z * (1 - edgeFactor) + dirToCenter.z * edgeFactor;
          } else if (opponentNearEdge) {
            // If opponent is near edge, be more aggressive to push them out
            moveVector.x = dirToOpponent.x;
            moveVector.z = dirToOpponent.z;
          } else {
            // Normal forward movement
            moveVector.x = dirToOpponent.x;
            moveVector.z = dirToOpponent.z;
          }
          // Normalize the movement vector
          const mvLength = Math.sqrt(moveVector.x * moveVector.x + moveVector.z * moveVector.z);
          if (mvLength > 0) {
            moveVector.x /= mvLength;
            moveVector.z /= mvLength;
          }
          
          bot.position.x += moveVector.x * moveSpeed;
          bot.position.z += moveVector.z * moveSpeed;
          // Set rotation to face opponent
          bot.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
          break;
          
        case 'backward': 
          // Only go backward if not already near edge
          if (edgeFactor > 0.5) {
            // If near edge, move towards center instead of backward
            moveVector.x = dirToCenter.x;
            moveVector.z = dirToCenter.z;
          } else {
            // Normal backward movement
            moveVector.x = -dirToOpponent.x;
            moveVector.z = -dirToOpponent.z;
          }
          
          // Normalize the movement vector
          const bkLength = Math.sqrt(moveVector.x * moveVector.x + moveVector.z * moveVector.z);
          if (bkLength > 0) {
            moveVector.x /= bkLength;
            moveVector.z /= bkLength;
          }
          
          bot.position.x += moveVector.x * moveSpeed;
          bot.position.z += moveVector.z * moveSpeed;
          // Still face the opponent
          bot.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
          break;
          
        case 'left': 
          // Calculate perpendicular vector (left of direction to opponent)
          moveVector.x = -dirToOpponent.z;
          moveVector.z = dirToOpponent.x;
          
          // If near edge, blend with center direction
          if (edgeFactor > 0.5) {
            moveVector.x = moveVector.x * (1 - edgeFactor) + dirToCenter.x * edgeFactor;
            moveVector.z = moveVector.z * (1 - edgeFactor) + dirToCenter.z * edgeFactor;
          }
          
          // Normalize the movement vector
          const lftLength = Math.sqrt(moveVector.x * moveVector.x + moveVector.z * moveVector.z);
          if (lftLength > 0) {
            moveVector.x /= lftLength;
            moveVector.z /= lftLength;
          }
          
          bot.position.x += moveVector.x * moveSpeed;
          bot.position.z += moveVector.z * moveSpeed;
          // Update rotation
          bot.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
          break;
          
        case 'right': 
          // Calculate perpendicular vector (right of direction to opponent)
          moveVector.x = dirToOpponent.z;
          moveVector.z = -dirToOpponent.x;
          
          // If near edge, blend with center direction
          if (edgeFactor > 0.5) {
            moveVector.x = moveVector.x * (1 - edgeFactor) + dirToCenter.x * edgeFactor;
            moveVector.z = moveVector.z * (1 - edgeFactor) + dirToCenter.z * edgeFactor;
          }
          
          // Normalize the movement vector
          const rtLength = Math.sqrt(moveVector.x * moveVector.x + moveVector.z * moveVector.z);
          if (rtLength > 0) {
            moveVector.x /= rtLength;
            moveVector.z /= rtLength;
          }
          
          bot.position.x += moveVector.x * moveSpeed;
          bot.position.z += moveVector.z * moveSpeed;
          // Update rotation
          bot.rotation = Math.atan2(dirToOpponent.x, dirToOpponent.z);
          break;
      }

      // Safety check - enforce ring boundary
      const newDistanceFromCenter = Math.sqrt(
        bot.position.x * bot.position.x + 
        bot.position.z * bot.position.z
      );
      
      // Detect unreasonable movement (potential teleport)
      const moveDelta = Math.sqrt(
        Math.pow(bot.position.x - prevPosition.x, 2) + 
        Math.pow(bot.position.z - prevPosition.z, 2)
      );
      
      // If movement is too large (exceeding what's possible in a single frame), reject it
      const maxReasonableMovement = baseSpeed * (BOT_CONFIG.moveInterval / 1000) * 1.5; // Add a 50% buffer
      if (moveDelta > maxReasonableMovement) {
        console.log(`Rejected suspicious bot movement from ${bot.id}: ${moveDelta.toFixed(2)} units`);
        // Revert to previous valid position
        bot.position.x = prevPosition.x;
        bot.position.z = prevPosition.z;
      }
      
      if (newDistanceFromCenter > gameState.ringRadius) {
        // Push back toward ring center
        const pushVector = {
          x: -bot.position.x,
          z: -bot.position.z
        };
        
        // Normalize push vector
        const pushLength = Math.sqrt(pushVector.x * pushVector.x + pushVector.z * pushVector.z);
        if (pushLength > 0) {
          pushVector.x /= pushLength;
          pushVector.z /= pushLength;
        }
        
        // Move back to just inside the ring
        const overshoot = newDistanceFromCenter - gameState.ringRadius + 0.1;
        bot.position.x += pushVector.x * overshoot;
        bot.position.z += pushVector.z * overshoot;
      }

      // Check for collision with opponent
      const distance = Math.sqrt(
        Math.pow(bot.position.x - opponent.position.x, 2) + 
        Math.pow(bot.position.z - opponent.position.z, 2)
      );
      
      if (distance < 1.5) {
        // Simple pushing mechanic - push in direction of impact
        const pushDir = {
          x: opponent.position.x - bot.position.x,
          z: opponent.position.z - bot.position.z
        };
        
        // Normalize push direction
        const pushLength = Math.sqrt(pushDir.x * pushDir.x + pushDir.z * pushDir.z);
        if (pushLength > 0) {
          pushDir.x /= pushLength;
          pushDir.z /= pushLength;
        }
        
        // Push strength is higher when moving toward opponent
        const pushStrength = direction === 'forward' ? 0.25 : 0.15;
        
        opponent.position.x += pushDir.x * pushStrength;
        opponent.position.z += pushDir.z * pushStrength;

        // Check if pushed opponent is out of the ring
        const opponentDistanceFromCenter = Math.sqrt(
          opponent.position.x * opponent.position.x + 
          opponent.position.z * opponent.position.z
        );
        
        if (opponentDistanceFromCenter > gameState.ringRadius) {
          endRound(opponent.id);
          return;
        }

        // Broadcast opponent's position update
        io.emit('playerMoved', {
          id: opponent.id,
          position: opponent.position,
          rotation: opponent.rotation
        });
      }

      // Broadcast bot's updated position
      io.emit('playerMoved', {
        id: bot.id,
        position: bot.position,
        rotation: bot.rotation
      });
      
      // Update referee rotation to face the new midpoint between fighters
      updateRefereeRotation();
    }, BOT_CONFIG.moveInterval);

    // Store interval references for cleanup
    BOT_CONFIG.botMovementIntervals.set(bot.id, [moveInterval, directionInterval]);
  });
}

// Helper function to choose a movement direction based on weighted probabilities
function chooseMovementDirection() {
  const movementChoices = ['forward', 'left', 'right', 'backward'];
  
  // More aggressive behavior - heavily favor forward movement to push opponents
  const weights = [0.7, 0.15, 0.15, 0]; // 70% forward, 15% left, 15% right, 0% backward
  
  // Choose a direction based on weights
  let randomValue = Math.random();
  let direction;
  
  let cumulativeWeight = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulativeWeight += weights[i];
    if (randomValue <= cumulativeWeight) {
      direction = movementChoices[i];
      break;
    }
  }
  
  return direction;
}

// Helper function to stop all bot movement
function stopBotMovement() {
  if (BOT_CONFIG.botMovementIntervals.size > 0) {
    for (const intervals of BOT_CONFIG.botMovementIntervals.values()) {
      for (const interval of intervals) {
        clearInterval(interval);
      }
    }
    BOT_CONFIG.botMovementIntervals.clear();
    BOT_CONFIG.botDirections.clear();
  }
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

// Add this new function after sanitizeForSocketIO
function updateRefereeRotation() {
  // Only proceed if we have a referee and 2 fighters during match
  if (!gameState.referee || gameState.fighters.length < 2 || gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) {
    return;
  }
  
  // Calculate midpoint between fighters
  const fighter1 = gameState.fighters[0];
  const fighter2 = gameState.fighters[1];
  
  const midpoint = {
    x: (fighter1.position.x + fighter2.position.x) / 2,
    z: (fighter1.position.z + fighter2.position.z) / 2
  };
  
  // Update referee rotation to face midpoint
  const oldRotation = gameState.referee.rotation;
  gameState.referee.rotation = Math.atan2(midpoint.x - gameState.referee.position.x, midpoint.z - gameState.referee.position.z);
  
  // Only broadcast if rotation changed
  if (oldRotation !== gameState.referee.rotation) {
    io.emit('playerMoved', {
      id: gameState.referee.id,
      position: gameState.referee.position,
      rotation: gameState.referee.rotation
    });
  }
}

// When a client connects
io.on('connect', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new player
  const player = {
    id: socket.id,
    name: getRandomName(), // Assign a random Japanese name
    role: 'viewer',
    position: { x: 0, y: 3, z: 0 },
    rotation: 0,
    faceId: Math.floor(Math.random() * 10),  // 0-9 inclusive
    colorId: Math.floor(Math.random() * 10), // 0-9 inclusive
    seed: Math.floor(Math.random() * 1000000), // Random seed for any future randomization needs and 3D model selection
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

  // Send message history to the new player
  if (messageHistory.length > 0) {
    socket.emit('messageHistory', messageHistory);
  }

  // Broadcast new player to everyone else
  socket.broadcast.emit('playerJoined', sanitizeForSocketIO(player));
  
  // Update player count for all clients
  broadcastPlayerCount();

  // Check if we should start the game
  if (gameState.stage === GAME_STAGES.WAITING_FOR_PLAYERS && gameState.viewers.length >= 3) {
    changeGameStage(GAME_STAGES.FIGHTER_SELECTION);
  }

  // Handle player movement
  socket.on('move', (data) => {
    // Only fighters and referees can move during the match
    if ((player.role !== 'fighter' && player.role !== 'referee') || gameState.stage !== GAME_STAGES.MATCH_IN_PROGRESS) return;

    // Handle fighter movement
    if (player.role === 'fighter') {
      const fighter = gameState.fighters.find(f => f.id === socket.id);
      if (!fighter) return;

      // Store current position before updating
      const prevPosition = {
        x: fighter.position.x,
        y: fighter.position.y,
        z: fighter.position.z
      };

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
      
      // Base movement speed (units per second)
      const baseSpeed = 4.5;
      
      // Calculate actual movement for this frame using delta time
      const moveSpeed = baseSpeed * data.deltaTime;
      
      // Calculate movement based on direction relative to opponent
      switch(data.direction) {
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

      // Detect unreasonable movement (potential teleport)
      const moveDelta = Math.sqrt(
        Math.pow(fighter.position.x - prevPosition.x, 2) + 
        Math.pow(fighter.position.z - prevPosition.z, 2)
      );
      
      // If movement is too large (exceeding what's possible in a single frame), reject it
      const maxReasonableMovement = baseSpeed * data.deltaTime * 1.5; // Add a 50% buffer
      if (moveDelta > maxReasonableMovement && data.deltaTime < 0.5) { // Only check for reasonable deltaTime
        console.log(`Rejected suspicious movement from ${fighter.id}: ${moveDelta.toFixed(2)} units`);
        // Revert to previous valid position
        fighter.position.x = prevPosition.x;
        fighter.position.z = prevPosition.z;
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
          const pushStrength = data.direction === 'forward' ? 0.25 : 0.15;
          
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
      
      // Update referee rotation to face the new midpoint between fighters
      updateRefereeRotation();
    }
    // Handle referee movement
    else if (player.role === 'referee') {
      const referee = gameState.referee;
      if (!referee || referee.id !== socket.id) return;

      // We need both fighters
      if (gameState.fighters.length < 2) return;
      
      // Calculate midpoint between fighters
      const fighter1 = gameState.fighters[0];
      const fighter2 = gameState.fighters[1];
      
      const midpoint = {
        x: (fighter1.position.x + fighter2.position.x) / 2,
        z: (fighter1.position.z + fighter2.position.z) / 2
      };

      // Calculate direction vector to midpoint
      const dirToMidpoint = {
        x: midpoint.x - referee.position.x,
        z: midpoint.z - referee.position.z
      };
      
      // Normalize the direction vector
      const length = Math.sqrt(dirToMidpoint.x * dirToMidpoint.x + dirToMidpoint.z * dirToMidpoint.z);
      if (length > 0) {
        dirToMidpoint.x /= length;
        dirToMidpoint.z /= length;
      }
      
      // Base movement speed (units per second)
      const baseSpeed = 4.0;
      
      // Calculate actual movement for this frame using delta time
      const moveSpeed = baseSpeed * data.deltaTime;
      
      // Store original position for validation
      const originalX = referee.position.x;
      const originalZ = referee.position.z;
      
      // Calculate movement based on direction relative to midpoint
      switch(data.direction) {
        case 'forward': // Move toward midpoint
          referee.position.x += dirToMidpoint.x * moveSpeed;
          referee.position.z += dirToMidpoint.z * moveSpeed;
          break;
          
        case 'backward': // Move away from midpoint
          referee.position.x -= dirToMidpoint.x * moveSpeed;
          referee.position.z -= dirToMidpoint.z * moveSpeed;
          break;
          
        case 'left': // Move left relative to midpoint
          // Calculate perpendicular vector (left of direction to midpoint)
          referee.position.x += -dirToMidpoint.z * moveSpeed;
          referee.position.z += dirToMidpoint.x * moveSpeed;
          break;
          
        case 'right': // Move right relative to midpoint
          // Calculate perpendicular vector (right of direction to midpoint)
          referee.position.x += dirToMidpoint.z * moveSpeed;
          referee.position.z += -dirToMidpoint.x * moveSpeed;
          break;
      }

      // Constraint 1: Cannot leave the ring
      const distanceFromCenter = Math.sqrt(
        referee.position.x * referee.position.x + 
        referee.position.z * referee.position.z
      );
      
      const ringRadiusBuffer = 0.5; // Keep referee 0.5 units inside the ring edge
      if (distanceFromCenter > gameState.ringRadius - ringRadiusBuffer) {
        // Instead of resetting to the original position, project the movement along the ring edge
        const ringEdgeRadius = gameState.ringRadius - ringRadiusBuffer;
        
        // Calculate direction to center
        const dirToCenter = {
          x: -referee.position.x,
          z: -referee.position.z
        };
        
        // Normalize
        const length = Math.sqrt(dirToCenter.x * dirToCenter.x + dirToCenter.z * dirToCenter.z);
        if (length > 0) {
          dirToCenter.x /= length;
          dirToCenter.z /= length;
        }
        
        // Project position to ring edge
        referee.position.x = -dirToCenter.x * ringEdgeRadius;
        referee.position.z = -dirToCenter.z * ringEdgeRadius;
      }

      // Constraint 2: Cannot get too close to the middle point between fighters
      const distanceToMidpoint = Math.sqrt(
        Math.pow(referee.position.x - midpoint.x, 2) + 
        Math.pow(referee.position.z - midpoint.z, 2)
      );
      
      const minDistanceToMidpoint = 2.0; // Minimum distance allowed to midpoint
      if (distanceToMidpoint < minDistanceToMidpoint) {
        // Instead of resetting to original position, project the movement to the minimum distance
        // Calculate direction from midpoint to referee
        const dirFromMidpoint = {
          x: referee.position.x - midpoint.x,
          z: referee.position.z - midpoint.z
        };
        
        // Normalize
        const length = Math.sqrt(dirFromMidpoint.x * dirFromMidpoint.x + dirFromMidpoint.z * dirFromMidpoint.z);
        if (length > 0) {
          dirFromMidpoint.x /= length;
          dirFromMidpoint.z /= length;
        }
        
        // Project position to minimum allowed distance from midpoint
        referee.position.x = midpoint.x + dirFromMidpoint.x * minDistanceToMidpoint;
        referee.position.z = midpoint.z + dirFromMidpoint.z * minDistanceToMidpoint;
      }

      // Always rotate to face the midpoint
      referee.rotation = Math.atan2(midpoint.x - referee.position.x, midpoint.z - referee.position.z);

      // Broadcast updated position
      io.emit('playerMoved', {
        id: referee.id,
        position: referee.position,
        rotation: referee.rotation
      });
    }
  });

  // Handle player emote
  socket.on('emote', (emoteType) => {
    player.emote = emoteType;
    
    // Create an emote object
    const emoteObj = {
      id: player.id,
      name: player.name,
      message: emoteType, // Store emote as message for consistency in history
      timestamp: Date.now()
    };
    
    // Check if this is a duplicate emote (happening within last second)
    const isDuplicate = messageHistory.some(msg => 
      msg.id === player.id && 
      msg.message === emoteType && 
      (Date.now() - msg.timestamp) < 1000
    );
    
    // Only add to message history if it's not a duplicate
    if (!isDuplicate) {
      messageHistory.push(emoteObj);
      
      // Keep only the last MAX_MESSAGE_HISTORY messages
      if (messageHistory.length > MAX_MESSAGE_HISTORY) {
        messageHistory.shift(); // Remove the oldest message
      }
    }
    
    io.emit('playerEmote', {
      id: player.id,
      name: player.name,
      emote: emoteType
    });

    // Clear emote after a few seconds
    setTimeout(() => {
      player.emote = null;
      io.emit('playerEmote', {
        id: player.id,
        name: player.name,
        emote: null
      });
    }, 3000);
  });

  // Handle player message
  socket.on('message', (messageData) => {
    // Handle both string messages and object format
    let message, isAnnouncement = false;
    
    if (typeof messageData === 'object') {
      message = messageData.text || messageData.message || '';
      isAnnouncement = messageData.isAnnouncement || false;
    } else {
      message = messageData;
    }
    
    // Simple validation
    if (message.length > 100) {
      message = message.substring(0, 100);
    }

    player.message = message;
    
    // Create a message object
    const messageObj = {
      id: player.id,
      name: player.name,
      message,
      timestamp: Date.now(),
      isAnnouncement
    };
    
    // Add to message history (skip announcements)
    if (!isAnnouncement) {
      messageHistory.push(messageObj);
      
      // Keep only the last MAX_MESSAGE_HISTORY messages
      if (messageHistory.length > MAX_MESSAGE_HISTORY) {
        messageHistory.shift(); // Remove the oldest message
      }
    }
    
    // Broadcast the message to all clients
    io.emit('playerMessage', messageObj);

    // Clear message after a few seconds
    setTimeout(() => {
      player.message = null;
      io.emit('playerMessage', {
        id: player.id,
        name: player.name,
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
      // Find the disconnected fighter
      const disconnectedFighter = gameState.fighters.find(f => f.id === socket.id);
      
      // Don't remove bot fighters from the match when disconnected (should never happen, but just in case)
      if (disconnectedFighter && !disconnectedFighter.isBot) {
      gameState.fighters = gameState.fighters.filter(f => f.id !== socket.id);
      }

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
      // Only remove the referee if it's not a bot
      if (gameState.referee && !gameState.referee.isBot) {
      gameState.referee = null;
      }
      // We do NOT reassign a referee immediately here—it's chosen at next FIGHTER_SELECTION
    } else if (playerRole === 'viewer') {
      gameState.viewers = gameState.viewers.filter(v => v.id !== socket.id);
    }

    // Broadcast player left
    io.emit('playerLeft', socket.id);
    
    // Update player count for all clients
    broadcastPlayerCount();

    // Check if we need to return to WAITING_FOR_PLAYERS
    const realHumanCount = (
      gameState.viewers.filter(v => !v.isBot && !v.id.startsWith('npc-')).length + 
      gameState.fighters.filter(f => !f.isBot).length + 
      (gameState.referee && !gameState.referee.isBot ? 1 : 0)
    );
    
    if (realHumanCount < 1) {
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

// Reset game state function
function resetGameState() {
  // Stop any bot movement
  stopBotMovement();

  // Move bots back to the bot pool
  gameState.fighters.forEach(fighter => {
    if (fighter.isBot) {
      if (fighter.botType === BOT_TYPES.FIGHTER) {
        gameState.botPool.fighters.push(fighter);
      }
    } else {
      // Move real fighters to viewers
    fighter.role = 'viewer';
    gameState.viewers.push(fighter);
    io.emit('playerRoleChanged', { id: fighter.id, role: 'viewer' });
    }
  });

  // Handle referee
  if (gameState.referee) {
    if (gameState.referee.isBot) {
      // Move bot referee back to pool
      gameState.botPool.referees.push(gameState.referee);
    } else {
      // Move real referee to viewers
    gameState.referee.role = 'viewer';
    gameState.viewers.push(gameState.referee);
    io.emit('playerRoleChanged', { id: gameState.referee.id, role: 'viewer' });
    }
  }

  // Clear main arrays AFTER moving players
  gameState.fighters = [];
  gameState.referee = null;

  // Broadcast the reset and updated player count
  io.emit('gameStateReset');
  broadcastPlayerCount();
}

// Function to broadcast player count to all clients
function broadcastPlayerCount() {
  const realUserCount = countRealUsers();
  const botFighterCount = gameState.fighters.filter(f => f.isBot).length;
  const botRefereeCount = (gameState.referee && gameState.referee.isBot) ? 1 : 0;
  
  // Only log if counts have changed
  if (playerCountState.lastCounts.realUsers !== realUserCount || 
      playerCountState.lastCounts.botFighters !== botFighterCount ||
      playerCountState.lastCounts.botReferee !== botRefereeCount) {
    
    console.log(`Real users: ${realUserCount} | Bot fighters: ${botFighterCount} | Bot referee: ${botRefereeCount}`);
    
    playerCountState.lastCounts = {
      realUsers: realUserCount,
      botFighters: botFighterCount,
      botReferee: botRefereeCount
    };
  }

  const playerCount = {
    total: gameState.viewers.length + gameState.fighters.length + (gameState.referee ? 1 : 0),
    viewers: gameState.viewers.length,
    fighters: gameState.fighters.length,
    referee: gameState.referee ? 1 : 0,
    realUserCount: realUserCount,
    realViewers: gameState.viewers.filter(v => !v.isBot && !v.id.startsWith('npc-')).length,
    realFighters: gameState.fighters.filter(f => !f.isBot && !f.id.startsWith('npc-')).length,
    realReferee: (gameState.referee && !gameState.referee.isBot && !gameState.referee.id.startsWith('npc-')) ? 1 : 0,
    botCount: {
      fighters: botFighterCount,
      referee: botRefereeCount,
      pool: {
        fighters: gameState.botPool.fighters.length,
        referees: gameState.botPool.referees.length
      }
    }
  };
  
  io.emit('playerCountUpdate', playerCount);
}

// Function to count real users (non-bots, non-NPCs)
function countRealUsers() {
  return (
    gameState.viewers.filter(v => !v.isBot && !v.id.startsWith('npc-')).length + 
    gameState.fighters.filter(f => !f.isBot && !f.id.startsWith('npc-')).length + 
    (gameState.referee && !gameState.referee.isBot && !gameState.referee.id.startsWith('npc-') ? 1 : 0)
  );
}

// Add these new functions for fake users
function startFakeUserSystem() {
  // Initially add fake users
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
  const fakeId = `npc-${FAKE_USERS.count++}`;
  
  // Create fake user with random properties
  const fakeUser = {
    id: fakeId,
    name: getRandomName(), // Assign a random Japanese name
    role: 'viewer',
    position: { x: 0, y: 3, z: 0 },
    rotation: 0,
    faceId: Math.floor(Math.random() * 10),
    colorId: Math.floor(Math.random() * 10),
    seed: Math.floor(Math.random() * 1000000), // Random seed for consistent positioning and 3D model selection
    viewerOnly: true
  };

  // Store fake user
  FAKE_USERS.users.set(fakeId, fakeUser);

  // Add to game state
  gameState.viewers.push(fakeUser);

  // Broadcast new player to all clients
  io.emit('playerJoined', sanitizeForSocketIO(fakeUser));
  
  // Update player count
  broadcastPlayerCount();

  // Set up intervals for fake user behavior
  const intervals = [];

  // Random emotes
  intervals.push(setInterval(() => {
    if (Math.random() < 0.3) {
      const emotes = ['👋', '👍', '🎉', '❤️', '😊'];
      const emote = emotes[Math.floor(Math.random() * emotes.length)];
      
      // Create an emote object
      const emoteObj = {
        id: fakeId,
        name: fakeUser.name,
        message: emote, // Store emote as message for consistency in history
        timestamp: Date.now()
      };
      
      // Skip adding NPC emotes to the message history to avoid clutter
      // messageHistory.push(emoteObj);
      
      io.emit('playerEmote', {
        id: fakeId,
        name: fakeUser.name,
        emote: emote
      });

      // Clear emote after 2-4 seconds
      const timeoutId = setTimeout(() => {
        io.emit('playerEmote', {
          id: fakeId,
          name: fakeUser.name,
          emote: null
        });
      }, 2000 + Math.random() * 2000);
      
      // Store timeout ID to ensure it gets cleared if user disconnects
      if (!FAKE_USERS.emoteTimeouts) {
        FAKE_USERS.emoteTimeouts = new Map();
      }
      if (!FAKE_USERS.emoteTimeouts.has(fakeId)) {
        FAKE_USERS.emoteTimeouts.set(fakeId, []);
      }
      FAKE_USERS.emoteTimeouts.get(fakeId).push(timeoutId);
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
      
      // Create a message object
      const messageObj = {
        id: fakeId,
        name: fakeUser.name,
        message: message,
        timestamp: Date.now()
      };
      
      // Skip adding NPC messages to the message history to avoid clutter
      // messageHistory.push(messageObj);
      
      io.emit('playerMessage', {
        id: fakeId,
        name: fakeUser.name,
        message: message
      });

      // Clear message after 3-5 seconds
      const timeoutId = setTimeout(() => {
        io.emit('playerMessage', {
          id: fakeId,
          name: fakeUser.name,
          message: null
        });
      }, 3000 + Math.random() * 2000);
      
      // Store timeout ID to ensure it gets cleared if user disconnects
      if (!FAKE_USERS.messageTimeouts) {
        FAKE_USERS.messageTimeouts = new Map();
      }
      if (!FAKE_USERS.messageTimeouts.has(fakeId)) {
        FAKE_USERS.messageTimeouts.set(fakeId, []);
      }
      FAKE_USERS.messageTimeouts.get(fakeId).push(timeoutId);
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
  
  // Clear any pending message timeouts
  if (FAKE_USERS.messageTimeouts && FAKE_USERS.messageTimeouts.has(fakeId)) {
    const timeouts = FAKE_USERS.messageTimeouts.get(fakeId);
    timeouts.forEach(timeout => clearTimeout(timeout));
    FAKE_USERS.messageTimeouts.delete(fakeId);
  }
  
  // Clear any pending emote timeouts
  if (FAKE_USERS.emoteTimeouts && FAKE_USERS.emoteTimeouts.has(fakeId)) {
    const timeouts = FAKE_USERS.emoteTimeouts.get(fakeId);
    timeouts.forEach(timeout => clearTimeout(timeout));
    FAKE_USERS.emoteTimeouts.delete(fakeId);
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
  
  // Update player count
  broadcastPlayerCount();

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

  // Clear all message timeouts
  if (FAKE_USERS.messageTimeouts) {
    for (const timeouts of FAKE_USERS.messageTimeouts.values()) {
      timeouts.forEach(timeout => clearTimeout(timeout));
    }
    FAKE_USERS.messageTimeouts.clear();
  }
  
  // Clear all emote timeouts
  if (FAKE_USERS.emoteTimeouts) {
    for (const timeouts of FAKE_USERS.emoteTimeouts.values()) {
      timeouts.forEach(timeout => clearTimeout(timeout));
    }
    FAKE_USERS.emoteTimeouts.clear();
  }

  // Disconnect all fake users
  for (const fakeId of FAKE_USERS.users.keys()) {
    disconnectFakeUser(fakeId);
  }

  // Reset counters
  FAKE_USERS.count = 0;
}

// Add this route to create Stripe checkout sessions
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { amount, name, description } = req.body;
    
    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: name || 'SumoSumo Sponsorship',
              description: description || 'Advertise your brand on SumoSumo!'
            },
            unit_amount: amount || 50000, // $500.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/sponsor-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}`,
    });
    
    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve static files - in production this serves the built Vite app
if (process.env.NODE_ENV === 'production') {
  // In production, serve the static files from Vite's build output
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // For any other routes, send the index.html file from the build
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for connections`);
  initGameState();
  startFakeUserSystem(); // Start the fake user system
});

// Clean shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  stopBotMovement();
  
  // Clear bot pool
  gameState.botPool.fighters = [];
  gameState.botPool.referees = [];
  
  stopFakeUserSystem();
  server.close(() => {
    console.log('Server shut down successfully');
    process.exit(0);
  });
});