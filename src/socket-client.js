import { io } from 'socket.io-client';
import { STAGE_DISPLAY_NAMES, DEFAULT_SOCKET_STATS } from './constants';

class SocketClient {
  constructor() {
    this.socket = null;
    this.gameState = {
      fighters: [],
      referee: null,
      viewers: [],
      myRole: 'viewer',
      myId: null,
      stage: 'WAITING_FOR_PLAYERS',
      stageTimer: null,
      stageTimeRemaining: 0
    };
    
    this.socketStats = { ...DEFAULT_SOCKET_STATS };
    this.eventHandlers = new Map();
  }

  connect() {
    this.socket = io();

    // Core socket event handlers
    this.socket.on('connect', () => {
      this.socketStats.connect++;
      this.updateSocketStats();
      console.log('Connected to server with ID:', this.socket.id);
      this.gameState.myId = this.socket.id;
      this.emit('gameStateUpdated', this.gameState);
    });

    this.socket.on('gameState', (state) => {
      this.socketStats.gameState++;
      this.updateSocketStats();
      console.log('Received game state:', state);

      // Update local state
      this.gameState.fighters = state.fighters || [];
      this.gameState.viewers = state.viewers || [];
      this.gameState.referee = state.referee || null;
      this.gameState.stage = state.currentStage;
      this.gameState.stageTimeRemaining = state.stageTimeRemaining;

      this.determineMyRole();
      this.emit('gameStateUpdated', this.gameState);
    });

    // Add other event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Stage change
    this.socket.on('stageChange', (data) => {
      this.socketStats.stageChange++;
      this.updateSocketStats();
      
      this.gameState.stage = data.stage;
      this.gameState.stageTimeRemaining = data.duration;
      
      this.emit('stageChanged', {
        stage: data.stage,
        duration: data.duration,
        displayName: STAGE_DISPLAY_NAMES[data.stage] || data.stage
      });
    });

    // Player events
    this.socket.on('playerJoined', this.handlePlayerJoined.bind(this));
    this.socket.on('playerLeft', this.handlePlayerLeft.bind(this));
    this.socket.on('playerMoved', this.handlePlayerMoved.bind(this));
    this.socket.on('playerEmote', this.handlePlayerEmote.bind(this));
    this.socket.on('playerMessage', this.handlePlayerMessage.bind(this));
    this.socket.on('playerRoleChanged', this.handlePlayerRoleChanged.bind(this));
  }

  // Event handling methods
  handlePlayerJoined(player) {
    this.socketStats.playerJoined++;
    this.updateSocketStats();

    if (player.id === this.gameState.myId) return;

    if (player.role === 'fighter') {
      if (!this.gameState.fighters.some(f => f.id === player.id)) {
        this.gameState.fighters.push(player);
      }
    } else if (player.role === 'referee') {
      this.gameState.referee = player;
    } else {
      if (!this.gameState.viewers.some(v => v.id === player.id)) {
        this.gameState.viewers.push(player);
      }
    }

    this.emit('playerJoined', player);
  }

  handlePlayerLeft(playerId) {
    this.socketStats.playerLeft++;
    this.updateSocketStats();

    this.gameState.fighters = this.gameState.fighters.filter(f => f.id !== playerId);
    if (this.gameState.referee?.id === playerId) {
      this.gameState.referee = null;
    }
    this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== playerId);

    this.emit('playerLeft', playerId);
  }

  handlePlayerMoved(data) {
    this.socketStats.playerMoved++;
    this.updateSocketStats();
    this.emit('playerMoved', data);
  }

  handlePlayerEmote(data) {
    this.socketStats.playerEmote++;
    this.updateSocketStats();
    this.emit('playerEmote', data);
  }

  handlePlayerMessage(data) {
    this.socketStats.playerMessage++;
    this.updateSocketStats();
    this.emit('playerMessage', data);
  }

  handlePlayerRoleChanged(data) {
    this.socketStats.playerRoleChanged++;
    this.updateSocketStats();

    const { id, role } = data;
    const player = this.findPlayerInGameState(id);
    
    if (!player) return;

    // Remove from current arrays
    this.gameState.fighters = this.gameState.fighters.filter(f => f.id !== id);
    this.gameState.viewers = this.gameState.viewers.filter(v => v.id !== id);
    if (this.gameState.referee?.id === id) {
      this.gameState.referee = null;
    }

    // Update player's role and add to correct array
    player.role = role;
    switch (role) {
      case 'fighter':
        this.gameState.fighters.push(player);
        break;
      case 'referee':
        this.gameState.referee = player;
        break;
      case 'viewer':
        this.gameState.viewers.push(player);
        break;
    }

    if (id === this.gameState.myId) {
      this.gameState.myRole = role;
    }

    this.emit('playerRoleChanged', data);
  }

  // Helper methods
  determineMyRole() {
    const myId = this.socket.id;
    if (this.gameState.fighters.some(f => f.id === myId)) {
      this.gameState.myRole = 'fighter';
    } else if (this.gameState.referee && this.gameState.referee.id === myId) {
      this.gameState.myRole = 'referee';
    } else {
      this.gameState.myRole = 'viewer';
    }
  }

  findPlayerInGameState(id) {
    return this.gameState.fighters.find(f => f.id === id) ||
           (this.gameState.referee?.id === id ? this.gameState.referee : null) ||
           this.gameState.viewers.find(v => v.id === id);
  }

  // Event subscription system
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
      this.eventHandlers.get(eventName).forEach(handler => handler(data));
    }
  }

  // Stats tracking
  updateSocketStats() {
    this.emit('socketStatsUpdated', this.socketStats);
  }

  // Public methods for sending data to server
  sendMovement(direction) {
    if (this.gameState.myRole === 'fighter' && this.gameState.stage === 'MATCH_IN_PROGRESS') {
      this.socket.emit('move', direction);
    }
  }

  sendEmote(emoteType) {
    this.socket.emit('emote', emoteType);
  }

  sendMessage(message) {
    if (message?.trim()) {
      this.socket.emit('message', message);
    }
  }

  toggleViewerOnly(enabled) {
    this.socket.emit('toggleViewerOnly', enabled);
  }
}

// Export a singleton instance
export const socketClient = new SocketClient();
