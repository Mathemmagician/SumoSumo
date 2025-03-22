class SocketClient {
    constructor(game) {
        this.game = game;
        this.socket = io();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Get player ID on connection
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.game.updateGameState({ playerId: this.socket.id });
        });
        
        // Receive initial game state
        this.socket.on('gameState', (gameState) => {
            this.game.updateGameState(gameState);
            this.game.renderer.setupScene(gameState);
        });
        
        // Handle new viewer joining
        this.socket.on('viewerJoined', (data) => {
            console.log('New viewer joined:', data.id);
            this.game.renderer.addViewer(data.id);
        });
        
        // Handle player leaving
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data.id);
            this.game.renderer.removePlayer(data.id);
        });
        
        // Handle new round
        this.socket.on('newRound', (data) => {
            console.log('New round started with fighters:', data.fighters);
            this.game.updateGameState({
                fighters: data.fighters,
                referee: data.referee,
                isRoundInProgress: true
            });
            this.game.renderer.startNewRound(data);
        });
        
        // Handle fighter movement
        this.socket.on('fighterMoved', (data) => {
            this.game.renderer.moveFighter(data.fighter, data.position);
        });
        
        // Handle emotes
        this.socket.on('emoteReceived', (data) => {
            this.game.renderer.showEmote(data.from, data.emote);
            this.game.ui.showEmoteBubble(data.from, data.emote);
        });
        
        // Handle chat messages
        this.socket.on('chatReceived', (data) => {
            this.game.ui.showChatBubble(data.from, data.message);
        });
    }
    
    // Send movement to server
    sendMove(direction) {
        this.socket.emit('move', { direction });
    }
    
    // Send emote to server
    sendEmote(emote) {
        this.socket.emit('emote', { emote });
    }
    
    // Send chat message to server
    sendChat(message) {
        this.socket.emit('chat', { message });
    }
} 