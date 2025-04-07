import { io } from "socket.io-client";
import { STAGE_DISPLAY_NAMES, DEFAULT_SOCKET_STATS } from "./constants";
import { trackUserJoined } from './analytics';

class SocketClient {
  constructor() {
    this.socket = null;
    this.gameState = {
      fighters: [],
      referee: null,
      viewers: [],
      myRole: "viewer",
      myId: null,
      stage: "WAITING_FOR_PLAYERS",
      stageTimer: null,
      stageTimeRemaining: 0,
    };

    this.socketStats = { ...DEFAULT_SOCKET_STATS };
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io();

    this.socket.on("connect", () => {
      this.socketStats.connect++;
      this.updateSocketStats();
      console.log("Connected to server with ID:", this.socket.id);
      this.gameState.myId = this.socket.id;
      
      // Track user joining with PostHog
      trackUserJoined(this.socket.id);
      
      // When we connect, request the initial game state
      this.socket.emit("requestGameState");
      
      this.emit("gameStateUpdated", this.gameState);
    });

    this.socket.on("gameState", (state) => {
      this.socketStats.gameState++;
      this.updateSocketStats();
      console.log("Received game state:", state);
      
      // Update our game state with the server data
      this.gameState.fighters = state.fighters || [];
      this.gameState.viewers = state.viewers || [];
      this.gameState.referee = state.referee || null;
      this.gameState.stage = state.currentStage;
      this.gameState.stageTimeRemaining = state.stageTimeRemaining;
      
      // Assign seat positions for viewers who don't have positions
      this.prepareViewerPositions();
      
      this.determineMyRole();
      this.emit("gameStateUpdated", this.gameState);
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on("stageChange", (data) => {
      this.socketStats.stageChange++;
      this.updateSocketStats();
      console.log("Stage changed:", data);
      this.gameState.stage = data.stage;
      this.gameState.stageTimeRemaining = data.duration;
      this.emit("stageChanged", {
        stage: data.stage,
        duration: data.duration,
        displayName: STAGE_DISPLAY_NAMES[data.stage] || data.stage,
      });
    });

    this.socket.on("playerJoined", (player) => this.handlePlayerJoined(player));
    this.socket.on("playerLeft", (playerId) => this.handlePlayerLeft(playerId));
    this.socket.on("playerMoved", (data) => this.handlePlayerMoved(data));
    this.socket.on("playerEmote", (data) => this.handlePlayerEmote(data));
    this.socket.on("playerMessage", (data) => this.handlePlayerMessage(data));
    this.socket.on("messageHistory", (messages) => this.handleMessageHistory(messages));
    this.socket.on("playerRoleChanged", (data) => this.handlePlayerRoleChanged(data));
    this.socket.on("fightersSelected", (data) => this.handleFightersSelected(data));
    this.socket.on("preCeremonyStart", (data) => this.handlePreCeremonyStart(data));
    this.socket.on("sponsorBanner", (data) => this.handleSponsorBanner(data));
    this.socket.on("matchStart", (data) => this.handleMatchStart(data));
    this.socket.on("matchEnd", (data) => this.handleMatchEnd(data));
    this.socket.on("matchDraw", (data) => this.handleMatchDraw(data));
    this.socket.on("newReferee", (referee) => this.handleNewReferee(referee));
    this.socket.on("gameStateReset", () => this.handleGameStateReset());
    this.socket.on("viewerOnlyUpdated", (isViewerOnly) => this.handleViewerOnlyUpdated(isViewerOnly));
  }

  handlePlayerJoined(player) {
    this.socketStats.playerJoined++;
    this.updateSocketStats();
    console.log("Player joined:", player);
    if (player.id === this.gameState.myId) return;
    
    // Remove player from any existing role list first
    this.gameState.fighters = this.gameState.fighters.filter(f => f.id !== player.id);
    this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== player.id);
    if (this.gameState.referee?.id === player.id) {
      this.gameState.referee = null;
    }
    
    // Add seed to the player for consistent seat assignment
    if (!player.seed) {
      player.seed = this.generateSeedFromId(player.id);
    }
    
    // Clear position for viewers to force seat assignment
    if (player.role === "viewer" && 
        (!player.position || 
         (player.position.x === 0 && player.position.z === 0))) {
      player.position = null;
    }
    
    // Now add to the appropriate list
    if (player.role === "fighter") {
      this.gameState.fighters.push(player);
    } else if (player.role === "referee") {
      this.gameState.referee = player;
    } else {
      this.gameState.viewers.push(player);
    }
    
    // Trigger a full game state update to ensure all clients render the new player
    this.emit("gameStateUpdated", this.gameState);
    
    // Also emit the specific player join event
    this.emit("playerJoined", player);
  }

  handlePlayerLeft(playerId) {
    this.socketStats.playerLeft++;
    this.updateSocketStats();
    console.log("Player left:", playerId);
    this.gameState.fighters = this.gameState.fighters.filter((f) => f.id !== playerId);
    if (this.gameState.referee?.id === playerId) {
      this.gameState.referee = null;
    }
    this.gameState.viewers = this.gameState.viewers.filter((v) => v.id !== playerId);
    this.emit("playerLeft", playerId);
  }

  handlePlayerMoved(data) {
    this.socketStats.playerMoved++;
    this.updateSocketStats();
    // console.log("Player moved:", data);
    
    // Find the player in our game state
    const player = this.findPlayerInGameState(data.id);
    
    if (player) {
      // Update the player's position in our game state
      player.position = data.position;
      player.rotation = data.rotation;
      
      // Check for unreasonable position changes (potential teleport)
      const lastPos = player._lastPos;
      if (lastPos) {
        const moveDelta = Math.sqrt(
          Math.pow(data.position.x - lastPos.x, 2) + 
          Math.pow(data.position.z - lastPos.z, 2)
        );
        
        // If the move is extremely large and not during stage transitions, smooth it out
        if (moveDelta > 5 && this.gameState.stage === 'MATCH_IN_PROGRESS') {
          // Create a slightly smoothed position (80% of the way to the target)
          const smoothPos = {
            x: lastPos.x + (data.position.x - lastPos.x) * 0.8,
            y: data.position.y,
            z: lastPos.z + (data.position.z - lastPos.z) * 0.8
          };
          
          // Use the smoothed position instead
          player.position = smoothPos;
          data.position = smoothPos;
        }
      }
      
      // Store this position for next comparison
      player._lastPos = { ...data.position };
    }
    
    this.emit("playerMoved", data);
  }

  handlePlayerEmote(data) {
    this.socketStats.playerEmote++;
    this.updateSocketStats();
    // console.log("Player emote:", data);
    this.emit("playerEmote", data);
  }

  handlePlayerMessage(data) {
    this.socketStats.playerMessage++;
    this.updateSocketStats();
    // console.log("Player message:", data);
    
    // Pass the isAnnouncement flag to the event listeners
    this.emit("playerMessage", {
      id: data.id,
      message: data.message,
      isAnnouncement: data.isAnnouncement || false
    });
  }

  handleMessageHistory(messages) {
    this.socketStats.messageHistory = (this.socketStats.messageHistory || 0) + 1;
    this.updateSocketStats();
    console.log("Received message history:", messages);
    this.emit("messageHistory", messages);
  }

  handlePlayerRoleChanged({ id, role }) {
    this.socketStats.playerRoleChanged++;
    this.updateSocketStats();
    console.log("Player role changed:", { id, role });
    
    // Find the player in any of the role lists
    let player = this.findPlayerInGameState(id);
    if (!player) return;
    
    // Remove the player from all role lists first
    this.gameState.fighters = this.gameState.fighters.filter((f) => f.id !== id);
    this.gameState.viewers = this.gameState.viewers.filter((v) => v.id !== id);
    if (this.gameState.referee?.id === id) {
      this.gameState.referee = null;
    }
    
    // Clone the player object to avoid reference issues
    const updatedPlayer = { ...player, role };
    
    // Add to the appropriate list based on new role
    switch (role) {
      case "fighter":
        this.gameState.fighters.push(updatedPlayer);
        break;
      case "referee":
        this.gameState.referee = updatedPlayer;
        break;
      case "viewer":
        this.gameState.viewers.push(updatedPlayer);
        break;
    }
    
    // Update my role if this is me
    if (id === this.gameState.myId) {
      this.gameState.myRole = role;
    }
    
    this.emit("playerRoleChanged", { id, role });
  }

  handleFightersSelected(data) {
    this.socketStats.fightersSelected++;
    this.updateSocketStats();
    console.log("Fighters selected:", data);
    
    // Get IDs of new fighters and referee
    const fighter1Id = data.fighter1?.id;
    const fighter2Id = data.fighter2?.id;
    const refereeId = data.referee?.id;
    
    // Remove selected players from viewers list
    if (fighter1Id) this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== fighter1Id);
    if (fighter2Id) this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== fighter2Id);
    if (refereeId) this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== refereeId);
    
    // Update fighters and referee in game state
    this.gameState.fighters = [data.fighter1, data.fighter2];
    this.gameState.referee = data.referee;
    
    this.determineMyRole();
    this.emit("fightersSelected", data);
  }

  handlePreCeremonyStart(data) {
    this.socketStats.preCeremonyStart++;
    this.updateSocketStats();
    console.log("Pre-ceremony started:", data);
    this.emit("preCeremonyStart", data);
  }

  handleSponsorBanner(data) {
    this.socketStats.sponsorBanner++;
    this.updateSocketStats();
    console.log("Sponsor banner:", data);
    this.emit("sponsorBanner", data);
  }

  handleMatchStart(data) {
    this.socketStats.matchStart++;
    this.updateSocketStats();
    console.log("Match started:", data);
    this.emit("matchStart", data);
  }

  handleMatchEnd(data) {
    this.socketStats.matchEnd++;
    this.updateSocketStats();
    console.log("Match ended. Winner:", data.winnerId, "Loser:", data.loserId, "Reason:", data.reason);
    this.emit("matchEnd", data);
  }

  handleMatchDraw(data) {
    this.socketStats.matchDraw++;
    this.updateSocketStats();
    console.log("Match ended in a draw");
    this.emit("matchDraw", data);
  }

  handleNewReferee(referee) {
    this.socketStats.newReferee++;
    this.updateSocketStats();
    console.log("New referee:", referee);
    this.gameState.referee = referee;
    this.emit("newReferee", referee);
  }

  handleGameStateReset() {
    this.socketStats.gameStateReset++;
    this.updateSocketStats();
    console.log("Game state reset received");
    
    // Collect all players
    const allPlayers = [...this.gameState.fighters, ...this.gameState.viewers];
    if (this.gameState.referee) {
      allPlayers.push(this.gameState.referee);
    }
    
    // Reset all role lists
    this.gameState.fighters = [];
    this.gameState.referee = null;
    
    // Convert all players to viewers with reset positions and random seeds
    this.gameState.viewers = allPlayers.map((player) => {
      // Generate a random seed for each player if they don't have one
      // Or use player.id as a deterministic seed
      const seed = player.seed || this.generateSeedFromId(player.id);
      
      // Return player with viewer role, null position, and seed
      return {
        ...player,
        role: "viewer",
        position: null,  // Set position to null to trigger repositioning
        seed: seed       // Add seed for deterministic seat assignment
      };
    });
    
    // Update my role
    this.gameState.myRole = "viewer";
    
    // Emit the event with the updated game state
    this.emit("gameStateReset", { viewers: this.gameState.viewers });
  }

  handleViewerOnlyUpdated(isViewerOnly) {
    console.log("Viewer-only updated:", isViewerOnly);
    this.emit("viewerOnlyUpdated", isViewerOnly);
  }

  sendMovement(direction, deltaTime) {
    if ((this.gameState.myRole === "fighter" || this.gameState.myRole === "referee") && this.gameState.stage === "MATCH_IN_PROGRESS") {
      this.socket.emit("move", { direction, deltaTime });
    }
  }

  sendEmote(emoteType) {
    this.socket.emit("emote", emoteType);
  }

  sendMessage(message, options = {}) {
    if (typeof message === 'string' && message?.trim()) {
      this.socket.emit("message", message);
    } else if (typeof message === 'object') {
      // Send object directly (for announcements and other special messages)
      this.socket.emit("message", message);
    }
  }

  toggleViewerOnly(enabled) {
    this.socket.emit("toggleViewerOnly", enabled);
  }

  determineMyRole() {
    const myId = this.socket.id;
    if (this.gameState.fighters.some((f) => f.id === myId)) {
      this.gameState.myRole = "fighter";
    } else if (this.gameState.referee && this.gameState.referee.id === myId) {
      this.gameState.myRole = "referee";
    } else {
      this.gameState.myRole = "viewer";
    }
  }

  findPlayerInGameState(id) {
    return (
      this.gameState.fighters.find((f) => f.id === id) ||
      (this.gameState.referee?.id === id ? this.gameState.referee : null) ||
      this.gameState.viewers.find((v) => v.id === id)
    );
  }

  on(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName).add(handler);
  }

  off(eventName, handler) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).delete(handler);
    }
  }

  emit(eventName, data) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).forEach((handler) => handler(data));
    }
  }

  updateSocketStats() {
    this.emit("socketStatsUpdated", this.socketStats);
  }

  // Add a new method to prepare viewer positions
  prepareViewerPositions() {
    // Check if we have viewers that need positions
    if (!this.gameState.viewers || this.gameState.viewers.length === 0) {
      return;
    }
    
    // For each viewer without a position, assign a seed value
    this.gameState.viewers.forEach((viewer, index) => {
      // Only add seed if the viewer doesn't have one and needs a position
      if (!viewer.seed && (!viewer.position || viewer.position === null)) {
        // Generate a deterministic seed from the player ID or index
        viewer.seed = this.generateSeedFromId(viewer.id) || (index * 1000);
      }
    });
  }
  
  // Helper method to generate a numeric seed from player ID
  generateSeedFromId(id) {
    if (!id) return Math.floor(Math.random() * 10000);
    
    // Convert the ID string to a number by summing character codes
    return id.split('').reduce((sum, char, index) => {
      return sum + (char.charCodeAt(0) * (index + 1));
    }, 0);
  }
}

export const socketClient = new SocketClient();
