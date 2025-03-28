import { io } from "socket.io-client";
import { STAGE_DISPLAY_NAMES, DEFAULT_SOCKET_STATS } from "./constants";

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

    // This map is for external code to subscribe to SocketClient’s own events
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io();

    // Base socket event handlers
    this.socket.on("connect", () => {
      this.socketStats.connect++;
      this.updateSocketStats();
      console.log("Connected to server with ID:", this.socket.id);

      this.gameState.myId = this.socket.id;
      // Emit a high-level event for external subscribers
      this.emit("gameStateUpdated", this.gameState);
    });

    // Initial game state
    this.socket.on("gameState", (state) => {
      this.socketStats.gameState++;
      this.updateSocketStats();
      console.log("Received game state:", state);

      // Replace local state
      this.gameState.fighters = state.fighters || [];
      this.gameState.viewers = state.viewers || [];
      this.gameState.referee = state.referee || null;
      this.gameState.stage = state.currentStage;
      this.gameState.stageTimeRemaining = state.stageTimeRemaining;

      this.determineMyRole();

      // Optionally do the same cleanup & re-adding you had before:
      // this.cleanupAllModels();
      // [...this.gameState.fighters, ...this.gameState.viewers].forEach(p => this.addPlayerToScene(p));
      // if (this.gameState.referee) this.addPlayerToScene(this.gameState.referee);

      // Let external code know the game state changed
      this.emit("gameStateUpdated", this.gameState);
    });

    // Listen for known events
    this.setupEventListeners();
  }

  // ----------------------------------------------
  // Setup event listeners for all missing events:
  // ----------------------------------------------
  setupEventListeners() {
    //
    // Already existing
    //
    this.socket.on("stageChange", (data) => {
      this.socketStats.stageChange++;
      this.updateSocketStats();

      console.log("Stage changed:", data);
      this.gameState.stage = data.stage;
      this.gameState.stageTimeRemaining = data.duration;

      // If you want to replicate the old logic of cleaning up models or re-adding them:
      // if (data.stage === "FIGHTER_SELECTION" || data.stage === "WAITING_FOR_PLAYERS") {
      //   this.cleanupAllModels();
      //   this.gameState.fighters.forEach(f => this.addPlayerToScene(f));
      //   this.gameState.viewers.forEach(v => this.addPlayerToScene(v));
      //   if (this.gameState.referee) this.addPlayerToScene(this.gameState.referee);
      // }

      // Possibly handle stage timer logic here

      // High-level event
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
    this.socket.on("playerRoleChanged", (data) =>
      this.handlePlayerRoleChanged(data)
    );
    this.socket.on("fightersSelected", (data) =>
      this.handleFightersSelected(data)
    );
    this.socket.on("preCeremonyStart", (data) =>
      this.handlePreCeremonyStart(data)
    );
    this.socket.on("sponsorBanner", (data) => this.handleSponsorBanner(data));
    this.socket.on("matchStart", (data) => this.handleMatchStart(data));
    this.socket.on("matchEnd", (data) => this.handleMatchEnd(data));
    this.socket.on("matchDraw", (data) => this.handleMatchDraw(data));
    this.socket.on("newReferee", (referee) => this.handleNewReferee(referee));
    this.socket.on("gameStateReset", () => this.handleGameStateReset());
    this.socket.on("viewerOnlyUpdated", (isViewerOnly) =>
      this.handleViewerOnlyUpdated(isViewerOnly)
    );
  }

  // ----------------------------------------------
  // Handlers for existing events
  // ----------------------------------------------
  handlePlayerJoined(player) {
    this.socketStats.playerJoined++;
    this.updateSocketStats();

    console.log("Player joined:", player);

    // Avoid double-adding ourselves
    if (player.id === this.gameState.myId) return;

    // Insert into gameState
    if (player.role === "fighter") {
      if (!this.gameState.fighters.some((f) => f.id === player.id)) {
        this.gameState.fighters.push(player);
      }
    } else if (player.role === "referee") {
      this.gameState.referee = player;
    } else {
      if (!this.gameState.viewers.some((v) => v.id === player.id)) {
        this.gameState.viewers.push(player);
      }
    }

    // Optionally add model:
    // this.addPlayerToScene(player);

    this.emit("playerJoined", player);
  }

  handlePlayerLeft(playerId) {
    this.socketStats.playerLeft++;
    this.updateSocketStats();

    console.log("Player left:", playerId);

    // Remove from arrays
    this.gameState.fighters = this.gameState.fighters.filter(
      (f) => f.id !== playerId
    );
    if (this.gameState.referee?.id === playerId) {
      this.gameState.referee = null;
    }
    this.gameState.viewers = this.gameState.viewers.filter(
      (v) => v.id !== playerId
    );

    // Optionally remove model:
    // this.removePlayerFromScene(playerId);

    this.emit("playerLeft", playerId);
  }

  handlePlayerMoved(data) {
    this.socketStats.playerMoved++;
    this.updateSocketStats();
    console.log("Player moved:", data);

    // If you want to replicate old logic, do it here:
    // this.updatePlayerPosition(data.id, data.position, data.rotation);

    this.emit("playerMoved", data);
  }

  handlePlayerEmote(data) {
    this.socketStats.playerEmote++;
    this.updateSocketStats();
    console.log("Player emote:", data);

    // Old code triggered an emote animation, plus posted to chat
    // this.showPlayerEmote(data.id, data.emote);

    this.emit("playerEmote", data);
  }

  handlePlayerMessage(data) {
    this.socketStats.playerMessage++;
    this.updateSocketStats();
    console.log("Player message:", data);

    // Possibly show chat bubble, etc.
    // this.showPlayerMessage(data.id, data.message);

    this.emit("playerMessage", data);
  }

  handlePlayerRoleChanged({ id, role }) {
    this.socketStats.playerRoleChanged++;
    this.updateSocketStats();
    console.log("Player role changed:", { id, role });

    const player = this.findPlayerInGameState(id);
    if (!player) return;

    // Remove from current arrays
    this.gameState.fighters = this.gameState.fighters.filter(
      (f) => f.id !== id
    );
    this.gameState.viewers = this.gameState.viewers.filter((v) => v.id !== id);
    if (this.gameState.referee?.id === id) {
      this.gameState.referee = null;
    }

    // Update
    player.role = role;
    switch (role) {
      case "fighter":
        this.gameState.fighters.push(player);
        break;
      case "referee":
        this.gameState.referee = player;
        break;
      case "viewer":
        this.gameState.viewers.push(player);
        break;
    }

    if (id === this.gameState.myId) {
      this.gameState.myRole = role;
    }

    // Possibly remove & re-add the model to reflect role changes:
    // this.removePlayerFromScene(id);
    // this.addPlayerToScene(player);

    this.emit("playerRoleChanged", { id, role });
  }

  // ----------------------------------------------
  // Handlers for the newly added missing events
  // ----------------------------------------------

  handleFightersSelected(data) {
    this.socketStats.fightersSelected++;
    this.updateSocketStats();
    console.log("Fighters selected:", data);

    // Remove old fighter models first
    this.gameState.fighters.forEach((fighter) => {
      this.removePlayerFromScene(fighter.id);
    });

    // Update game state with new fighters
    this.gameState.fighters = [data.fighter1, data.fighter2];

    // Remove old referee model if exists
    if (this.gameState.referee) {
      this.removePlayerFromScene(this.gameState.referee.id);
    }
    this.gameState.referee = data.referee;

    // Add new models with correct roles
    this.gameState.fighters.forEach((fighter) => {
      this.addPlayerToScene(fighter);
    });
    if (this.gameState.referee) {
      this.addPlayerToScene(this.gameState.referee);
    }

    this.determineMyRole();
    this.updateUI();
  }

  handlePreCeremonyStart(data) {
    this.socketStats.preCeremonyStart++;
    this.updateSocketStats();
    console.log("Pre-ceremony started:", data);

    // If you had special logic here, replicate it:
    // e.g. some scene or UI changes
  }

  handleSponsorBanner(data) {
    this.socketStats.sponsorBanner++;
    this.updateSocketStats();
    console.log("Sponsor banner:", data);

    // In the old code, you set a DOM element's text and hid it after some time
    // You can replicate that logic here if you’d like:
    this.showSponsorBanner(data.sponsor, data.duration);
  }

  handleMatchStart(data) {
    this.socketStats.matchStart++;
    this.updateSocketStats();
    console.log("Match started:", data);

    // Possibly trigger an animation or UI update:
    this.showMatchStart();
  }

  handleMatchEnd(data) {
    this.socketStats.matchEnd++;
    this.updateSocketStats();
    console.log(
      "Match ended. Winner:",
      data.winnerId,
      "Loser:",
      data.loserId,
      "Reason:",
      data.reason
    );

    this.showMatchEnd(data.winnerId, data.loserId, data.reason);
  }

  handleMatchDraw(data) {
    this.socketStats.matchDraw++;
    this.updateSocketStats();
    console.log("Match ended in a draw");

    this.showMatchDraw();
  }

  handleNewReferee(referee) {
    this.socketStats.newReferee++;
    this.updateSocketStats();
    console.log("New referee:", referee);

    this.gameState.referee = referee;
    this.updateScene();
    this.updateUI();
  }

  handleGameStateReset() {
    this.socketStats.gameStateReset++;
    this.updateSocketStats();
    console.log("Game state reset received");

    this.cleanupAllModels();

    // Convert everyone to viewers
    const allPlayers = [...this.gameState.fighters, ...this.gameState.viewers];
    if (this.gameState.referee) {
      allPlayers.push(this.gameState.referee);
    }

    this.gameState.fighters = [];
    this.gameState.referee = null;
    this.gameState.viewers = allPlayers.map((player) => {
      player.role = "viewer";
      return player;
    });

    // Re-add them as viewers
    this.gameState.viewers.forEach((viewer) => this.addPlayerToScene(viewer));

    this.gameState.myRole = "viewer";
    this.updateUI();
    this.updateStageDisplay();
  }

  handleViewerOnlyUpdated(isViewerOnly) {
    // In the old code, you updated a DOM checkbox:
    //   document.getElementById('viewer-only-toggle').checked = isViewerOnly;
    // That depends on your environment. For now, just log it or handle however you like:
    console.log("Viewer-only updated:", isViewerOnly);

    // If you have UI code:
    // this.updateViewerOnlyCheckbox(isViewerOnly);
  }

  // ----------------------------------------------
  // Public methods for sending data to server
  // ----------------------------------------------
  sendMovement(direction) {
    if (
      this.gameState.myRole === "fighter" &&
      this.gameState.stage === "MATCH_IN_PROGRESS"
    ) {
      this.socket.emit("move", direction);
    }
  }

  sendEmote(emoteType) {
    this.socket.emit("emote", emoteType);
  }

  sendMessage(message) {
    if (message?.trim()) {
      this.socket.emit("message", message);
    }
  }

  toggleViewerOnly(enabled) {
    this.socket.emit("toggleViewerOnly", enabled);
  }

  // ----------------------------------------------
  // Internal helpers
  // ----------------------------------------------
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

  // ----------------------------------------------
  // "Stubs" for the side-effect methods from old code
  // ----------------------------------------------
  cleanupAllModels() {
    // Remove all 3D models or other UI elements from the scene
    // ...
  }

  addPlayerToScene(player) {
    // Add a new 3D model or UI element for the given player
    // ...
  }

  removePlayerFromScene(playerId) {
    // Remove the 3D model or UI element for the given playerId
    // ...
  }

  updatePlayerPosition(playerId, position, rotation) {
    // In old code, you did playerModel.position.set(...) etc.
    // ...
  }

  updateScene() {
    // If you want to refresh all players:
    // [...this.gameState.fighters, ...this.gameState.viewers].forEach(p => this.updatePlayerInScene(p));
    // if (this.gameState.referee) this.updatePlayerInScene(this.gameState.referee);
  }

  updateUI() {
    // E.g. update role badges, player counts, etc.
    // ...
  }

  updateStageDisplay() {
    // E.g. use STAGE_DISPLAY_NAMES to display current stage and timer
    // ...
  }

  showSponsorBanner(sponsor, duration) {
    // Show a DOM element or overlay with sponsor text
    // setTimeout to hide after "duration"
    // ...
  }

  showMatchStart() {
    // Animate a "Match Start" overlay or a 3D effect
    // ...
  }

  showMatchEnd(winnerId, loserId, reason) {
    // Animate "Match End" or show scoreboard
    // ...
  }

  showMatchDraw() {
    // Animate "It's a draw!" message
    // ...
  }

  // ----------------------------------------------
  // Minimal event subscription system
  // ----------------------------------------------
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

  // Track stats in a centralized way
  updateSocketStats() {
    this.emit("socketStatsUpdated", this.socketStats);
  }
}

export const socketClient = new SocketClient();
