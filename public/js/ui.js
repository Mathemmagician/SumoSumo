class UI {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Setup emote buttons
        const emoteButtons = document.querySelectorAll('.emote-btn');
        emoteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const emote = button.getAttribute('data-emote');
                this.game.sendEmote(emote);
            });
        });
    }
    
    updateUI() {
        // Update round info
        const roundInfo = document.getElementById('round-info');
        
        if (this.game.gameState.isRoundInProgress) {
            if (this.game.gameState.isFighter) {
                roundInfo.textContent = "You are fighting! Use left/right arrows to move.";
            } else {
                roundInfo.textContent = "Round in progress! Cheer for the fighters!";
            }
        } else {
            roundInfo.textContent = "Waiting for more players to start a round...";
        }
    }
    
    showFighterUI() {
        // Add any fighter-specific UI elements
        document.body.classList.add('is-fighter');
        document.body.classList.remove('is-viewer');
    }
    
    showViewerUI() {
        // Add any viewer-specific UI elements
        document.body.classList.add('is-viewer');
        document.body.classList.remove('is-fighter');
    }
    
    showEmoteBubble(playerId, emote) {
        const emoteMappings = {
            'cheer': '🎉',
            'laugh': '😂',
            'wow': '😮',
            'sad': '😢'
        };
        
        const emoteText = emoteMappings[emote] || emote;
        
        // Create DOM element for emote bubble
        const bubble = document.createElement('div');
        bubble.className = 'emote-bubble';
        bubble.textContent = emoteText;
        document.body.appendChild(bubble);
        
        // Position the bubble near the player's 3D position
        this.positionBubbleNearPlayer(bubble, playerId);
        
        // Remove after animation completes
        setTimeout(() => {
            bubble.remove();
        }, 2000);
    }
    
    showChatBubble(playerId, message) {
        // Create DOM element for chat bubble
        const bubble = document.createElement('div');
        bubble.className = 'emote-bubble';
        bubble.textContent = message;
        document.body.appendChild(bubble);
        
        // Position the bubble near the player's 3D position
        this.positionBubbleNearPlayer(bubble, playerId);
        
        // Remove after animation completes
        setTimeout(() => {
            bubble.remove();
        }, 3000);
    }
    
    positionBubbleNearPlayer(bubbleElement, playerId) {
        // Get the 3D object from the renderer
        let player = this.game.renderer.fighters[playerId] || this.game.renderer.viewers[playerId];
        if (!player) return;
        
        // Convert 3D position to screen coordinates
        const vector = new THREE.Vector3();
        vector.setFromMatrixPosition(player.matrixWorld);
        vector.project(this.game.renderer.camera);
        
        const widthHalf = window.innerWidth / 2;
        const heightHalf = window.innerHeight / a;
        
        const x = (vector.x * widthHalf) + widthHalf;
        const y = -(vector.y * heightHalf) + heightHalf;
        
        // Position the bubble
        bubbleElement.style.left = `${x}px`;
        bubbleElement.style.top = `${y - 50}px`; // Offset a bit above the player
    }
} 