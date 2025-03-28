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
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io();

    this.socket.on("connect", () => {
      this.socketStats.connect++;
      this.updateSocketStats();
      console.log("Connected to server with ID:", this.socket.id);
      this.gameState.myId = this.socket.id;
      this.emit("gameStateUpdated", this.gameState);
    });

    this.socket.on("gameState", (state) => {
      this.socketStats.gameState++;
      this.updateSocketStats();
      console.log("Received game state:", state);
      this.gameState.fighters = state.fighters || [];
      this.gameState.viewers = state.viewers || [];
      this.gameState.referee = state.referee || null;
      this.gameState.stage = state.currentStage;
      this.gameState.stageTimeRemaining = state.stageTimeRemaining;
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
    console.log("Player moved:", data);
    this.emit("playerMoved", data);
  }

  handlePlayerEmote(data) {
    this.socketStats.playerEmote++;
    this.updateSocketStats();
    console.log("Player emote:", data);
    this.emit("playerEmote", data);
  }

  handlePlayerMessage(data) {
    this.socketStats.playerMessage++;
    this.updateSocketStats();
    console.log("Player message:", data);
    this.emit("playerMessage", data);
  }

  handlePlayerRoleChanged({ id, role }) {
    this.socketStats.playerRoleChanged++;
    this.updateSocketStats();
    console.log("Player role changed:", { id, role });
    const player = this.findPlayerInGameState(id);
    if (!player) return;
    this.gameState.fighters = this.gameState.fighters.filter((f) => f.id !== id);
    this.gameState.viewers = this.gameState.viewers.filter((v) => v.id !== id);
    if (this.gameState.referee?.id === id) {
      this.gameState.referee = null;
    }
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
    this.emit("playerRoleChanged", { id, role });
  }

  handleFightersSelected(data) {
    this.socketStats.fightersSelected++;
    this.updateSocketStats();
    console.log("Fighters selected:", data);
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
    this.gameState.myRole = "viewer";
    this.emit("gameStateReset", {});
  }

  handleViewerOnlyUpdated(isViewerOnly) {
    console.log("Viewer-only updated:", isViewerOnly);
    this.emit("viewerOnlyUpdated", isViewerOnly);
  }

  sendMovement(direction) {
    if (this.gameState.myRole === "fighter" && this.gameState.stage === "MATCH_IN_PROGRESS") {
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
}

export const socketClient = new SocketClient();
