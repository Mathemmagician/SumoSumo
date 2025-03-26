// UI Manager for SumoSumo game
class UIManager {
    constructor() {
        // Cache DOM elements
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        
        // Initialize event listeners
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Chat message events
        window.addEventListener('playerMessageReceived', (e) => this.handlePlayerMessage(e));
        window.addEventListener('playerEmoteReceived', (e) => this.handlePlayerEmote(e));
        
        // Chat input
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    handlePlayerMessage(e) {
        if (e.detail && e.detail.id) {
            // Skip if this is our own message (we already added it when sending)
            if (window.gameState?.myId && e.detail.id === window.gameState.myId) return;
            
            // Skip messages from bots (IDs starting with "fake-")
            if (e.detail.id.startsWith('fake-')) return;
            
            // Skip null messages
            if (!e.detail.message) return;
            
            const username = e.detail.username || e.detail.id.substring(0, 6);
            this.debouncedAddMessage(username, e.detail.message);
        }
    }

    handlePlayerEmote(e) {
        if (e.detail && e.detail.id) {
            // Skip if this is our own emote
            if (window.gameState?.myId && e.detail.id === window.gameState.myId) return;
            
            // Skip bot emotes
            if (e.detail.id.startsWith('fake-')) return;
            
            // Skip null emotes
            if (!e.detail.emote) return;
            
            const username = e.detail.username || e.detail.id.substring(0, 6);
            this.debouncedAddMessage(username, e.detail.emote);
        }
    }

    addMessageToHistory(sender, message) {
        if (!message) return;
        
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
        const message = this.chatInput.value.trim();
        
        if (message && window.sendPlayerMessageToServer) {
            this.debouncedAddMessage('You', message);
            window.sendPlayerMessageToServer(message);
            this.chatInput.value = '';
        }
    }

    sendEmote(emote) {
        if (window.sendPlayerEmoteToServer) {
            this.debouncedAddMessage('You', emote);
            window.sendPlayerEmoteToServer(emote);
            
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
    }

    updateRoleBadge(role) {
        const roleBadge = document.getElementById('role-badge');
        
        roleBadge.className = 'role-badge';
        roleBadge.classList.add('role-' + role.toLowerCase());
        roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    }

    updateMatchStatus(status, timeLeft) {
        const gameState = document.getElementById('game-state');
        const gameTime = document.getElementById('game-time');
        
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
        document.getElementById('player-count').textContent = count;
    }

    toggleFreeCamera(checkbox) {
        const freeCameraMode = checkbox.checked;
        
        // Call the renderer's toggleFreeCamera function
        if (window.toggleFreeCamera) {
            window.toggleFreeCamera(freeCameraMode);
        }
    }
}

// Create and export a singleton instance
const uiManager = new UIManager();
window.uiManager = uiManager; // Make it globally available 