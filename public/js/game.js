// Main game controller
class Game {
    constructor() {
        this.socket = null;
        this.renderer = null;
        this.ui = null;
        this.gameState = {
            playerId: null,
            fighters: [],
            viewers: [],
            referee: null,
            isRoundInProgress: false,
            isFighter: false
        };
        
        // Input state
        this.keys = {
            left: false,
            right: false
        };
        
        this.init();
    }
    
    init() {
        // Initialize components
        this.socket = new SocketClient(this);
        this.renderer = new Renderer();
        this.ui = new UI(this);
        
        // Setup event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start game loop
        this.gameLoop();
    }
    
    gameLoop() {
        // Process player input if player is a fighter
        if (this.gameState.isFighter) {
            this.processInput();
        }
        
        // Update renderer
        this.renderer.update();
        
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    processInput() {
        let direction = 0;
        if (this.keys.left) direction -= 1;
        if (this.keys.right) direction += 1;
        
        if (direction !== 0) {
            this.socket.sendMove(direction);
        }
    }
    
    handleKeyDown(event) {
        if (event.key === 'ArrowLeft' || event.key === 'a') {
            this.keys.left = true;
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            this.keys.right = true;
        }
    }
    
    handleKeyUp(event) {
        if (event.key === 'ArrowLeft' || event.key === 'a') {
            this.keys.left = false;
        } else if (event.key === 'ArrowRight' || event.key === 'd') {
            this.keys.right = false;
        }
    }
    
    // Game state updaters
    updateGameState(newState) {
        this.gameState = { ...this.gameState, ...newState };
        this.updatePlayerRole();
        this.ui.updateUI();
    }
    
    updatePlayerRole() {
        // Determine if player is a fighter
        this.gameState.isFighter = this.gameState.fighters.includes(this.gameState.playerId);
        
        // Update UI according to role
        if (this.gameState.isFighter) {
            this.ui.showFighterUI();
        } else {
            this.ui.showViewerUI();
        }
    }
    
    // Emote handling
    sendEmote(emote) {
        this.socket.sendEmote(emote);
    }
}

// Initialize game when the page loads
window.onload = () => {
    window.game = new Game();
}; 