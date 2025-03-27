import { socketClient } from './socket-client';

// UI Manager for SumoSumo game
class UIManager {
    constructor() {
        // Cache DOM elements
        this.chatHistory = null;
        this.chatInput = null;
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        // Get DOM elements
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Subscribe to socket client events
        this.setupSocketEvents();
    }

    setupSocketEvents() {
        // Listen for game state updates
        socketClient.on('gameStateUpdated', (gameState) => {
            this.updateRoleBadge(gameState.myRole);
            
            // Update player count
            const playerIds = new Set();
            gameState.fighters.forEach(f => playerIds.add(f.id));
            if (gameState.referee) playerIds.add(gameState.referee.id);
            gameState.viewers.forEach(v => playerIds.add(v.id));
            
            this.updatePlayerCount(playerIds.size);
        });
        
        // Listen for stage changes
        socketClient.on('stageChanged', (data) => {
            const seconds = Math.ceil(data.duration / 1000);
            this.updateMatchStatus(data.displayName, seconds);
            
            // Start stage timer if needed
            if (data.duration > 0) {
                this.startStageTimer(data.duration);
            }
        });
        
        // Listen for emote/message events
        socketClient.on('playerEmote', (data) => {
            if (data.id && data.id !== socketClient.gameState.myId) {
                const username = this.findPlayerUsername(data.id);
                this.debouncedAddMessage(username, data.emote);
            }
        });
        
        socketClient.on('playerMessage', (data) => {
            if (data.id && data.id !== socketClient.gameState.myId) {
                const username = this.findPlayerUsername(data.id);
                this.debouncedAddMessage(username, data.message);
            }
        });
    }

    initializeEventListeners() {
        // Chat input
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
        
        // Connect buttons
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // Set up emote buttons
        document.querySelectorAll('.emote-btn').forEach(btn => {
            const emote = btn.querySelector('.emote-emoji')?.textContent;
            if (emote) {
                btn.addEventListener('click', () => this.sendEmote(emote));
            }
        });
        
        // Toggle buttons
        const viewerOnlyToggle = document.getElementById('viewer-only-toggle');
        if (viewerOnlyToggle) {
            viewerOnlyToggle.addEventListener('change', () => {
                socketClient.toggleViewerOnly(viewerOnlyToggle.checked);
            });
        }
        
        const freeCameraToggle = document.getElementById('free-camera-toggle');
        if (freeCameraToggle) {
            freeCameraToggle.addEventListener('change', () => {
                this.toggleFreeCamera(freeCameraToggle);
            });
        }
    }

    addMessageToHistory(sender, message) {
        if (!message || !this.chatHistory) return;
        
        const fragment = document.createDocumentFragment();
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = sender + ':';
        
        messageElement.appendChild(senderSpan);
        messageElement.appendChild(document.createTextNode(' ' + message));
        
        fragment.appendChild(messageElement);
        
        // Remove old messages if needed
        while (this.chatHistory.children.length >= 5) {
            this.chatHistory.removeChild(this.chatHistory.firstChild);
        }
        
        this.chatHistory.appendChild(fragment);
    }

    debouncedAddMessage(sender, message) {
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
            this.addMessageToHistory(sender, message);
        }, 16);
    }

    sendMessage() {
        if (!this.chatInput) return;
        
        const message = this.chatInput.value.trim();
        
        if (message) {
            this.debouncedAddMessage('You', message);
            socketClient.sendMessage(message);
            this.chatInput.value = '';
        }
    }

    sendEmote(emote) {
        this.debouncedAddMessage('You', emote);
        socketClient.sendEmote(emote);
        
        // Add animation effect to button
        const buttons = document.querySelectorAll('.emote-btn');
        buttons.forEach(btn => {
            if (btn.textContent.trim() === emote) {
                btn.style.transform = 'scale(1.3)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 300);
            }
        });
    }

    updateRoleBadge(role) {
        const roleBadge = document.getElementById('role-badge');
        if (!roleBadge) return;
        
        roleBadge.className = 'role-badge';
        roleBadge.classList.add('role-' + role.toLowerCase());
        roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }

    updateMatchStatus(status, timeLeft) {
        const gameState = document.getElementById('game-state');
        const gameTime = document.getElementById('game-time');
        
        if (!gameState || !gameTime) return;
        
        gameState.textContent = status;
        gameTime.textContent = timeLeft + 's';
        
        gameState.className = '';
        if (status === 'Match in Progress') {
            gameState.classList.add('state-active');
        } else if (status === 'Waiting for Players') {
            gameState.classList.add('state-waiting');
        } else {
            gameState.classList.add('state-ended');
        }
    }

    updatePlayerCount(count) {
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.textContent = count;
        }
    }

    toggleFreeCamera(checkbox) {
        const freeCameraMode = checkbox.checked;
        // Emit an event that the renderer can listen to
        const event = new CustomEvent('freeCameraToggled', { 
            detail: { enabled: freeCameraMode } 
        });
        document.dispatchEvent(event);
    }
    
    // Helper method to get username from player ID
    findPlayerUsername(id) {
        const player = socketClient.findPlayerInGameState(id);
        if (player) {
            // If there's a name property, use it, otherwise use a short ID
            return player.name || id.substring(0, 6);
        }
        return id.substring(0, 6);
    }
    
    // Timer management
    startStageTimer(duration) {
        if (this._stageTimer) {
            clearInterval(this._stageTimer);
        }
        
        let timeRemaining = duration;
        const startTime = Date.now();
        
        this._stageTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            timeRemaining = Math.max(0, duration - elapsed);
            const seconds = Math.ceil(timeRemaining / 1000);
            
            const gameTime = document.getElementById('game-time');
            if (gameTime) {
                gameTime.textContent = seconds + 's';
            }
            
            if (timeRemaining <= 0) {
                clearInterval(this._stageTimer);
                this._stageTimer = null;
            }
        }, 1000);
    }
}

// Create and export a singleton instance
export const uiManager = new UIManager();

// Make it globally available for HTML event handlers
// We'll keep this for backward compatibility, but ideally
// all event handlers would be set up in the class
window.uiManager = uiManager; 