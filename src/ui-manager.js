import { socketClient } from './socket-client';

// UI Manager for SumoSumo game
class UIManager {
    constructor() {
        // Cache DOM elements
        this.chatHistory = null;
        this.chatInput = null;
        this.tutorialBtn = null;
        this.tutorialArrow = null;
        
        // Music related properties
        this.backgroundMusic = null;
        this.isMusicPlaying = false;
        this.musicBtn = null;
        
        // Mobile controls
        this.mobileControls = null;
        this.fullscreenBtn = null;
        this.landscapeNotice = null;
        this.isMobile = this.checkIsMobile();
        this.isLandscape = window.innerWidth > window.innerHeight;
        this.debugMode = false; // Set to true to force show controls
        
        // Initialize after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }

        // Hide stats container by default
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.style.display = 'none';
        }

        // Ensure Developer Mode toggle is unchecked by default
        const developerModeToggle = document.getElementById('developer-mode-toggle');
        if (developerModeToggle) {
            developerModeToggle.checked = false;
        }
    }

    initialize() {
        // Get DOM elements
        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');
        this.tutorialBtn = document.getElementById('tutorial-btn');
        this.tutorialArrow = document.getElementById('tutorial-arrow');
        this.backgroundMusic = document.getElementById('background-music');
        this.musicBtn = document.getElementById('music-btn');
        
        console.log("UI Manager initializing, isMobile:", this.isMobile, "isLandscape:", this.isLandscape);
        
        // Check if this is first time visit
        this.checkFirstTimeVisit();
        
        // Initialize background music
        this.initializeBackgroundMusic();
        
        // Create mobile controls
        this.createMobileControls();
        
        // Create fullscreen button
        this.createFullscreenButton();
        
        // Create landscape notice for portrait mode
        if (this.isMobile) {
            this.createLandscapeNotice();
            this.checkOrientation();
        }
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Subscribe to socket client events
        this.setupSocketEvents();
        
        // Force check of controls visibility with current state
        if (socketClient.gameState) {
            this.toggleMobileControls(socketClient.gameState.myRole, socketClient.gameState.stage);
            this.updatePlayerName();
        }
    }

    setupSocketEvents() {
        // Listen for game state updates
        socketClient.on('gameStateUpdated', (gameState) => {
            this.updateRoleBadge(gameState.myRole);
            this.updatePlayerCount(this.countAllPlayers(gameState));
            this.updatePlayerName();
            
            // Show/hide mobile controls based on role
            if (this.isMobile) {
                this.toggleMobileControls(gameState.myRole, gameState.stage);
            }
        });
        
        // Listen to player events that affect counts
        socketClient.on('playerJoined', () => {
            this.updatePlayerCount(this.countAllPlayers(socketClient.gameState));
        });
        
        socketClient.on('playerLeft', () => {
            this.updatePlayerCount(this.countAllPlayers(socketClient.gameState));
        });
        
        socketClient.on('playerRoleChanged', (data) => {
            if (data.id === socketClient.gameState.myId) {
                this.updateRoleBadge(data.role);
            }
            this.updatePlayerCount(this.countAllPlayers(socketClient.gameState));
        });
        
        socketClient.on('fightersSelected', () => {
            this.updateRoleBadge(socketClient.gameState.myRole);
            this.updatePlayerCount(this.countAllPlayers(socketClient.gameState));
        });
        
        // Listen for message history when connecting
        socketClient.on('messageHistory', (messages) => {
            if (Array.isArray(messages) && messages.length > 0) {
                // Clear existing chat history
                if (this.chatHistory) {
                    this.chatHistory.innerHTML = '';
                }
                
                // Keep track of displayed messages to avoid duplicates
                const displayedMessages = new Set();
                
                // Display each message in the history, filtering out NPC messages
                messages.forEach(messageObj => {
                    // Skip messages from NPCs
                    if (messageObj.id && (messageObj.id.startsWith('npc-') || messageObj.id.startsWith('fake-'))) {
                        return;
                    }
                    
                    // Create a unique key for this message
                    const messageKey = `${messageObj.id}:${messageObj.message}:${messageObj.timestamp}`;
                    
                    // Skip if we've already displayed this message
                    if (displayedMessages.has(messageKey)) {
                        return;
                    }
                    
                    // Mark this message as displayed
                    displayedMessages.add(messageKey);
                    
                    // Use "You" for current user's messages, player name for others
                    // If name is available in the message object, use it directly instead of looking up
                    const sender = messageObj.id === socketClient.gameState.myId 
                        ? 'You' 
                        : (messageObj.name || this.findPlayerUsername(messageObj.id));
                        
                    // Display the message or emote
                    if (messageObj.message) {
                        this.addMessageToHistory(sender, messageObj.message);
                    }
                });
            }
        });
        
        // Listen for stage changes
        socketClient.on('stageChanged', (data) => {
            const seconds = Math.ceil(data.duration / 1000);
            this.updateMatchStatus(data.displayName, seconds);
            
            // Toggle mobile controls visibility if needed
            if (this.isMobile) {
                this.toggleMobileControls(socketClient.gameState.myRole, data.name);
            }
            
            // Start stage timer if needed
            if (data.duration > 0) {
                this.startStageTimer(data.duration);
            }
        });
        
        // Listen for emote/message events
        socketClient.on('playerEmote', (data) => {
            if (data.id) {
                // If it's your own message coming back from the server, don't display it again
                if (data.id === socketClient.gameState.myId) {
                    return;
                }
                
                // Use name from the message object if available, otherwise look it up
                const username = data.name || this.findPlayerUsername(data.id);
                this.debouncedAddMessage(username, data.emote, data.id);
            }
        });
        
        socketClient.on('playerMessage', (data) => {
            if (data.id) {
                // If it's your own message coming back from the server, don't display it again
                if (data.id === socketClient.gameState.myId) {
                    return;
                }
                
                // Use name from the message object if available, otherwise look it up
                const username = data.name || this.findPlayerUsername(data.id);
                this.debouncedAddMessage(username, data.message, data.id);
            }
        });
    }

    // Helper method to count all players from gameState
    countAllPlayers(gameState) {
        const playerIds = new Set();
        
        // Filter out NPCs (players with IDs starting with 'npc-' or 'fake-')
        const isRealPlayer = (id) => !id.startsWith('npc-') && !id.startsWith('fake-');
        
        // Add fighters (excluding NPCs)
        gameState.fighters.forEach(f => {
            if (isRealPlayer(f.id)) playerIds.add(f.id);
        });
        
        // Add referee if exists (excluding NPCs)
        if (gameState.referee && isRealPlayer(gameState.referee.id)) {
            playerIds.add(gameState.referee.id);
        }
        
        // Add viewers (excluding NPCs)
        gameState.viewers.forEach(v => {
            if (isRealPlayer(v.id)) playerIds.add(v.id);
        });
        
        return playerIds.size;
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
        
        // Music toggle button
        if (this.musicBtn) {
            this.musicBtn.addEventListener('click', () => this.toggleMusic());
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
        
        // Listen for orientation changes on mobile
        if (this.isMobile) {
            window.addEventListener('resize', () => {
                this.isLandscape = window.innerWidth > window.innerHeight;
                this.checkOrientation();
            });
            
            // Also listen for orientation change event
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.isLandscape = window.innerWidth > window.innerHeight;
                    this.checkOrientation();
                }, 100); // Short delay to allow dimensions to update
            });
        }
        
        // Tutorial button functionality
        const tutorialBtn = document.getElementById('tutorial-btn');
        const tutorialModal = document.getElementById('tutorial-modal');
        const closeBtn = document.getElementById('close-tutorial');
        
        if (tutorialBtn && tutorialModal && closeBtn) {
            tutorialBtn.addEventListener('click', () => {
                tutorialModal.style.display = 'flex';
                // Mark tutorial as seen
                localStorage.setItem('tutorial', 'true');
                // Hide the tutorial arrow
                if (this.tutorialArrow) {
                    this.tutorialArrow.style.display = 'none';
                }
            });
            
            closeBtn.addEventListener('click', () => {
                tutorialModal.style.display = 'none';
            });
            
            // Also close when clicking outside the modal content
            tutorialModal.addEventListener('click', (e) => {
                if (e.target === tutorialModal) {
                    tutorialModal.style.display = 'none';
                }
            });
            
            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && tutorialModal.style.display === 'flex') {
                    tutorialModal.style.display = 'none';
                }
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

    debouncedAddMessage(sender, message, id) {
        // Skip messages from NPC users (checking the actual ID if provided)
        if (id && (id.startsWith('npc-') || id.startsWith('fake-'))) {
            return;
        }
        
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
            this.addMessageToHistory(sender, message);
        }, 16);
    }

    sendMessage() {
        if (!this.chatInput) return;
        
        const message = this.chatInput.value.trim();
        
        if (message) {
            // Get the player's ID but display as "You" for the current user
            const myId = socketClient.gameState.myId;
            
            // Add to chat with "You" as sender
            this.debouncedAddMessage("You", message, myId);
            socketClient.sendMessage(message);
            this.chatInput.value = '';
        }
    }

    sendEmote(emote) {
        // Prevent rapid duplicate emoji submissions
        if (this._lastEmote === emote && (Date.now() - this._lastEmoteTime) < 1000) {
            return;
        }
        
        // Store this emote as the last one sent
        this._lastEmote = emote;
        this._lastEmoteTime = Date.now();
        
        // Get the player's ID but display as "You" for the current user
        const myId = socketClient.gameState.myId;
        
        // Add to chat with "You" as sender
        this.debouncedAddMessage("You", emote, myId);
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
        
        // Apply clear role styles
        roleBadge.className = 'role-badge';
        roleBadge.classList.add('role-' + role.toLowerCase());
        
        // Make role title case for display
        roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        
        console.log("Updated role badge to:", role);
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
            console.log("Updated player count to:", count);
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

    toggleDeveloperMode(checkbox) {
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.style.display = checkbox.checked ? 'block' : 'none';
            
            // Also emit an event for any other components that might need to know about developer mode
            const event = new CustomEvent('developerModeToggled', {
                detail: { enabled: checkbox.checked }
            });
            document.dispatchEvent(event);
        }
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

    // Helper method to check if user is on mobile
    checkIsMobile() {
        // Force mobile detection to true for testing
        // return true;
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    }
    
    // Create mobile controls
    createMobileControls() {
        console.log("Creating mobile controls");
        
        // Create mobile controls container
        this.mobileControls = document.createElement('div');
        this.mobileControls.id = 'mobile-controls';
        this.mobileControls.style.display = 'none'; // Hidden by default
        
        // Create arrows container
        const arrowsContainer = document.createElement('div');
        arrowsContainer.className = 'arrows-container';
        
        // Define arrow directions and their positions
        const arrows = [
            { direction: 'up', text: '▲', key: 'ArrowUp' },
            { direction: 'left', text: '◄', key: 'ArrowRight' },
            { direction: 'right', text: '►', key: 'ArrowLeft' },
            { direction: 'down', text: '▼', key: 'ArrowDown' }
        ];
        
        // Create arrow buttons
        arrows.forEach(arrow => {
            const btn = document.createElement('button');
            btn.className = `mobile-control-btn ${arrow.direction}`;
            btn.setAttribute('data-key', arrow.key);
            btn.textContent = arrow.text;
            
            // Touch event listeners for mobile buttons
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.sendMobileControlEvent(arrow.key, true);
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.sendMobileControlEvent(arrow.key, false);
            });
            
            // Mouse events for testing on desktop
            btn.addEventListener('mousedown', (e) => {
                this.sendMobileControlEvent(arrow.key, true);
            });
            
            btn.addEventListener('mouseup', (e) => {
                this.sendMobileControlEvent(arrow.key, false);
            });
            
            arrowsContainer.appendChild(btn);
        });
        
        this.mobileControls.appendChild(arrowsContainer);
        document.body.appendChild(this.mobileControls);
        
        // For testing: uncomment to force show controls
        // this.mobileControls.style.display = 'block';
    }
    
    // Create fullscreen button
    createFullscreenButton() {
        this.fullscreenBtn = document.createElement('button');
        this.fullscreenBtn.id = 'fullscreen-btn';
        
        // Use clear SVG icons instead of Unicode characters
        const enterFullscreenSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
        `;
        
        const exitFullscreenSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
            </svg>
        `;
        
        this.fullscreenBtn.innerHTML = enterFullscreenSVG;
        this.fullscreenBtn.title = 'Toggle Fullscreen';
        
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Listen for fullscreen change events to update the icon
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.fullscreenBtn.innerHTML = exitFullscreenSVG;
            } else {
                this.fullscreenBtn.innerHTML = enterFullscreenSVG;
            }
        });
        
        const gameContainer = document.getElementById('game-container');
        gameContainer.appendChild(this.fullscreenBtn);
    }
    
    // Toggle fullscreen
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Create landscape orientation notice
    createLandscapeNotice() {
        // Create the notice element
        this.landscapeNotice = document.createElement('div');
        this.landscapeNotice.id = 'landscape-notice';
        this.landscapeNotice.className = 'landscape-notice';
        
        // Create rotate icon
        const rotateIcon = document.createElement('div');
        rotateIcon.className = 'rotate-icon';
        rotateIcon.innerHTML = '↺';
        
        // Create message
        const message = document.createElement('div');
        message.className = 'landscape-message';
        message.textContent = 'Please rotate your device to landscape mode for the best experience';
        
        // Add elements to notice
        this.landscapeNotice.appendChild(rotateIcon);
        this.landscapeNotice.appendChild(message);
        
        // Add notice to body but hide initially
        document.body.appendChild(this.landscapeNotice);
        this.landscapeNotice.style.display = 'none';
    }
    
    // Check device orientation and show/hide notice
    checkOrientation() {
        if (!this.landscapeNotice) return;
        
        if (this.isMobile && !this.isLandscape) {
            // Show landscape notice if in portrait mode
            this.landscapeNotice.style.display = 'flex';
            
            // Hide controls in portrait mode
            if (this.mobileControls) {
                this.mobileControls.style.display = 'none';
            }
        } else {
            // Hide notice in landscape mode
            this.landscapeNotice.style.display = 'none';
            
            // Restore controls visibility based on role when back in landscape
            if (socketClient.gameState && this.isMobile) {
                this.toggleMobileControls(socketClient.gameState.myRole, socketClient.gameState.stage);
            }
        }
    }
    
    // Toggle mobile controls visibility based on role and game stage
    toggleMobileControls(role, stage) {
        if (!this.mobileControls) return;
        
        console.log(`Toggling mobile controls: role=${role}, stage=${stage}, isMobile=${this.isMobile}, isLandscape=${this.isLandscape}, debugMode=${this.debugMode}`);
        
        // Debug mode always shows controls
        if (this.debugMode) {
            console.log("Debug mode: showing mobile controls");
            this.mobileControls.style.display = 'block';
            return;
        }
        
        // Don't show controls in portrait mode
        if (this.isMobile && !this.isLandscape) {
            console.log("Portrait mode: hiding mobile controls");
            this.mobileControls.style.display = 'none';
            return;
        }
        
        // Always show controls on mobile if user is a fighter, regardless of stage
        if (this.isMobile && role === 'fighter') {
            console.log("Showing mobile controls");
            this.mobileControls.style.display = 'block';
        } else {
            console.log("Hiding mobile controls");
            this.mobileControls.style.display = 'none';
        }
    }
    
    // Send key event to simulate keyboard controls
    sendMobileControlEvent(key, isKeyDown) {
        console.log(`Sending mobile control event: ${key} ${isKeyDown ? 'down' : 'up'}`);
        
        const eventType = isKeyDown ? 'keydown' : 'keyup';
        const event = new KeyboardEvent(eventType, {
            bubbles: true,
            cancelable: true,
            key: key
        });
        document.dispatchEvent(event);
    }

    checkFirstTimeVisit() {
        const hasSeenTutorial = localStorage.getItem('tutorial') === 'true';
        if (!hasSeenTutorial && this.tutorialArrow) {
            this.tutorialArrow.style.display = 'block';
        }
    }

    // Add this new method to update the player name
    updatePlayerName() {
        const playerNameElement = document.getElementById('player-name');
        if (!playerNameElement) return;
        
        const myId = socketClient.gameState.myId;
        if (!myId) return;
        
        // Find the player in the game state
        const player = socketClient.findPlayerInGameState(myId);
        if (player && player.name) {
            playerNameElement.textContent = player.name;
        }
    }

    // Initialize and play background music
    initializeBackgroundMusic() {
        if (this.backgroundMusic) {
            // Set initial volume
            this.backgroundMusic.volume = 0.6;
            
            // Add event listeners to update button state
            this.backgroundMusic.addEventListener('play', () => {
                this.isMusicPlaying = true;
                this.updateMusicToggleButton(true);
            });
            
            this.backgroundMusic.addEventListener('pause', () => {
                this.isMusicPlaying = false;
                this.updateMusicToggleButton(false);
            });
            
            // Start playing the music after a short delay to allow the page to load fully
            setTimeout(() => {
                this.backgroundMusic.play()
                    .then(() => {
                        console.log('Background music started playing');
                        this.isMusicPlaying = true;
                        this.updateMusicToggleButton(true);
                    })
                    .catch(err => {
                        console.warn('Failed to autoplay background music:', err);
                        // Most browsers require user interaction before playing audio
                        // We'll show a "Play Music" button style for the toggle button
                        this.isMusicPlaying = false;
                        this.updateMusicToggleButton(false);
                    });
            }, 1000);
        }
    }
    
    // Toggle music on/off
    toggleMusic() {
        if (!this.backgroundMusic) return;
        
        if (this.isMusicPlaying) {
            // Pause the music
            this.backgroundMusic.pause();
            this.isMusicPlaying = false;
        } else {
            // Play the music
            this.backgroundMusic.play()
                .then(() => {
                    console.log('Background music resumed');
                    this.isMusicPlaying = true;
                })
                .catch(err => {
                    console.warn('Failed to play background music:', err);
                });
        }
        
        // Update the button appearance
        this.updateMusicToggleButton(this.isMusicPlaying);
    }
    
    // Update the music toggle button appearance
    updateMusicToggleButton(isPlaying) {
        if (this.musicBtn) {
            if (isPlaying) {
                this.musicBtn.textContent = '🔊';
                this.musicBtn.classList.remove('muted');
                this.musicBtn.setAttribute('aria-label', 'Mute Music');
            } else {
                this.musicBtn.textContent = '🔇';
                this.musicBtn.classList.add('muted');
                this.musicBtn.setAttribute('aria-label', 'Play Music');
            }
        }
    }

    // Two-step process for Twitter ad spot button
    buySpotOnWall() {
        const btn = document.getElementById('buy-spot-btn');
        
        if (!btn) return;
        
        // If button is already expanded, proceed to Twitter
        if (btn.classList.contains('expanded')) {
            // Visual feedback before redirecting
            btn.style.backgroundColor = '#3a9';
            
            setTimeout(() => {
                const twitterId = '1009846161379864577';
                const message = 'Hi, I would like to advertise in your game. My offer is $500 for 1 week of exclusive placement. <Include relevant details and reasonable requests>.';
                
                // Encode the message for URL
                const encodedMessage = encodeURIComponent(message);
                
                // Create the Twitter URL with pre-filled message
                const twitterUrl = `https://twitter.com/messages/compose?recipient_id=${twitterId}&text=${encodedMessage}`;
                
                // Open in a new tab
                window.open(twitterUrl, '_blank');
                
                // Reset button style and state
                this.resetBuyButton();
            }, 400);
        } else {
            // First click - just expand the button
            btn.classList.add('expanded');
            btn.style.width = 'auto';
            btn.style.paddingRight = '16px';
            btn.style.borderRadius = '20px';
            
            const btnText = btn.querySelector('.btn-text');
            if (btnText) {
                btnText.style.display = 'inline';
                btnText.style.marginLeft = '5px';
            }
            
            // Add event listener for clicks outside the button
            document.addEventListener('click', this.handleOutsideClick);
        }
    }
    
    // Handle clicks outside the button
    handleOutsideClick = (event) => {
        const btn = document.getElementById('buy-spot-btn');
        
        // If the click is outside the button, reset it
        if (btn && !btn.contains(event.target) && btn.classList.contains('expanded')) {
            this.resetBuyButton();
        }
    }
    
    // Reset the buy button to initial state
    resetBuyButton() {
        const btn = document.getElementById('buy-spot-btn');
        if (!btn) return;
        
        btn.classList.remove('expanded');
        btn.style.width = '';
        btn.style.paddingRight = '';
        btn.style.borderRadius = '';
        btn.style.backgroundColor = '';
        
        const btnText = btn.querySelector('.btn-text');
        if (btnText) {
            btnText.style.display = '';
            btnText.style.marginLeft = '';
        }
        
        // Remove the outside click event listener
        document.removeEventListener('click', this.handleOutsideClick);
    }
}

// Export a singleton instance of the UIManager
export const uiManager = new UIManager();

// Make it globally available for HTML event handlers
window.uiManager = uiManager; 