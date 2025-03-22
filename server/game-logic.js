// Game parameters
const RING_RADIUS = 5;
const SUMO_RADIUS = 1;
const MOVE_SPEED = 0.2;

// Game logic functions
module.exports = {
  // Add a new viewer to the game
  addViewer: function(gameState, playerId) {
    gameState.viewers.push(playerId);
  },
  
  // Remove a player from the game
  removePlayer: function(gameState, playerId) {
    // Remove from fighters if present
    const fighterIndex = gameState.fighters.indexOf(playerId);
    if (fighterIndex !== -1) {
      gameState.fighters.splice(fighterIndex, 1);
    }
    
    // Remove from viewers if present
    const viewerIndex = gameState.viewers.indexOf(playerId);
    if (viewerIndex !== -1) {
      gameState.viewers.splice(viewerIndex, 1);
    }
    
    // Reset referee if needed
    if (gameState.referee === playerId) {
      gameState.referee = null;
    }
  },
  
  // Start a new round by selecting 2 random viewers as fighters and 1 as referee
  startNewRound: function(gameState) {
    if (gameState.viewers.length < 3) {
      return false; // Not enough viewers to start a round
    }
    
    // Clear current fighters
    gameState.fighters = [];
    
    // Select 2 random viewers to be fighters
    const shuffledViewers = [...gameState.viewers].sort(() => 0.5 - Math.random());
    gameState.fighters.push(shuffledViewers[0], shuffledViewers[1]);
    
    // Remove fighters from viewers list
    gameState.viewers = gameState.viewers.filter(id => !gameState.fighters.includes(id));
    
    // Select referee if needed
    if (!gameState.referee || !gameState.viewers.includes(gameState.referee)) {
      gameState.referee = gameState.viewers[0];
    }
    
    // Initialize fighter positions
    gameState.fighterPositions = [-2, 2]; // Start on opposite sides
    gameState.roundInProgress = true;
    
    return true;
  },
  
  // End the current round
  endRound: function(gameState) {
    // Return fighters to viewers
    gameState.fighters.forEach(fighter => {
      if (!gameState.viewers.includes(fighter)) {
        gameState.viewers.push(fighter);
      }
    });
    
    gameState.fighters = [];
    gameState.roundInProgress = false;
  },
  
  // Move a fighter in a direction
  moveFighter: function(gameState, fighterIndex, direction) {
    if (fighterIndex < 0 || fighterIndex >= gameState.fighters.length) {
      return false;
    }
    
    // Update fighter position
    gameState.fighterPositions[fighterIndex] += direction * MOVE_SPEED;
    
    // Constrain to ring boundaries
    const boundaryLimit = RING_RADIUS - SUMO_RADIUS;
    if (gameState.fighterPositions[fighterIndex] > boundaryLimit) {
      gameState.fighterPositions[fighterIndex] = boundaryLimit;
    } else if (gameState.fighterPositions[fighterIndex] < -boundaryLimit) {
      gameState.fighterPositions[fighterIndex] = -boundaryLimit;
    }
    
    // Check for collision between fighters
    this.checkCollision(gameState);
    
    return true;
  },
  
  // Get fighter position
  getFighterPosition: function(gameState, fighterIndex) {
    return gameState.fighterPositions[fighterIndex];
  },
  
  // Check for collision between fighters
  checkCollision: function(gameState) {
    if (gameState.fighters.length < 2) return;
    
    const distance = Math.abs(gameState.fighterPositions[0] - gameState.fighterPositions[1]);
    
    // If fighters are colliding (distance less than 2 sumo radii)
    if (distance < SUMO_RADIUS * 2) {
      // Handle collision (pushing mechanic)
      const midpoint = (gameState.fighterPositions[0] + gameState.fighterPositions[1]) / 2;
      gameState.fighterPositions[0] = midpoint + SUMO_RADIUS;
      gameState.fighterPositions[1] = midpoint - SUMO_RADIUS;
      
      // Check if any fighter is out of the ring
      const boundaryLimit = RING_RADIUS - SUMO_RADIUS;
      for (let i = 0; i < 2; i++) {
        if (Math.abs(gameState.fighterPositions[i]) > boundaryLimit) {
          // This fighter lost!
          return i; // Return the index of the loser
        }
      }
    }
    
    return -1; // No winner yet
  }
}; 