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
            // Check if role has changed since last update
            if (this._lastRole && this._lastRole !== gameState.myRole) {
                this.showRoleChangeNotification(gameState.myRole);
            }
            
            // Store current role for future comparison
            this._lastRole = gameState.myRole;
            
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
            // Only show notification if it's for the current player, the role has actually changed,
            // and we're in the fighter selection stage
            if (data.id === socketClient.gameState.myId && 
                (!this._lastRole || this._lastRole !== data.role) &&
                socketClient.gameState.stage === 'selecting_fighters') {
                this.updateRoleBadge(data.role);
                this.showRoleChangeNotification(data.role);
                this._lastRole = data.role;
            }
            this.updatePlayerCount(this.countAllPlayers(socketClient.gameState));
        });
        
        socketClient.on('fightersSelected', () => {
            // Check if the player has been selected as a fighter
            if (socketClient.gameState.myRole === 'fighter' && 
                socketClient.gameState.fighters.some(f => f.id === socketClient.gameState.myId)) {
                this.showCenterNotification("You have been selected as a FIGHTER!\nGet ready to battle!", 5000);
            }
            // Check if the player has been selected as a referee
            else if (socketClient.gameState.myRole === 'referee' && 
                     socketClient.gameState.referee && 
                     socketClient.gameState.referee.id === socketClient.gameState.myId) {
                this.showCenterNotification("You have been selected as the REFEREE!\nMaintain order in the ring!", 5000);
            }
            
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
                    
                    // Skip referee announcements
                    if (messageObj.isAnnouncement) {
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
            
            // Show important game stage notifications
            this.showGameStageNotification(data.name, data.displayName);
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
                
                // Skip adding referee announcements to chat
                if (data.isAnnouncement) {
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
                this.toggleViewerOnly(viewerOnlyToggle.checked, null);
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

        // Listen for free camera toggle changes to update mobile controls
        document.getElementById('free-camera-toggle')?.addEventListener('change', (e) => {
            if (this.isMobile) {
                const freeCameraMode = e.target.checked;
                const joystickControls = document.getElementById('joystick-controls');
                if (joystickControls) {
                    joystickControls.style.display = freeCameraMode ? 'flex' : 'none';
                }
            }
        });
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
        
        // Also update the top center game state display
        const gameStateTop = document.getElementById('game-state-top');
        const gameTimeTop = document.getElementById('game-time-top');
        
        // Update original game state elements if they exist
        if (gameState && gameTime) {
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
        
        // Update top center game state elements if they exist
        if (gameStateTop && gameTimeTop) {
            gameStateTop.textContent = status;
            gameTimeTop.textContent = timeLeft + 's';
            
            gameStateTop.className = '';
            if (status === 'Match in Progress') {
                gameStateTop.classList.add('state-active');
            } else if (status === 'Waiting for Players') {
                gameStateTop.classList.add('state-waiting');
            } else {
                gameStateTop.classList.add('state-ended');
            }
        }
    }

    updatePlayerCount(count) {
        const playerCount = document.getElementById('player-count');
        if (playerCount) {
            playerCount.textContent = count;
            console.log("Updated player count to:", count);
        }
    }

    toggleViewerOnly(isViewerOnly, button) {
        // Get both mode buttons
        const viewerOnlyBtn = document.querySelector('.mode-btn[data-mode="viewer"]');
        const fighterModeBtn = document.querySelector('.mode-btn[data-mode="fighter"]');
        
        if (viewerOnlyBtn && fighterModeBtn) {
            // Remove active class from both buttons
            viewerOnlyBtn.classList.remove('active');
            fighterModeBtn.classList.remove('active');
            
            // Add active class to the clicked button
            if (button) {
                button.classList.add('active');
            } else {
                // If no button reference, set based on the mode
                if (isViewerOnly) {
                    viewerOnlyBtn.classList.add('active');
                } else {
                    fighterModeBtn.classList.add('active');
                }
            }
            
            // Only show explanation if the mode actually changed
            const currentMode = viewerOnlyBtn.classList.contains('active') ? 'viewer' : 'fighter';
            if ((isViewerOnly && currentMode === 'viewer') || (!isViewerOnly && currentMode === 'fighter')) {
                this.showModeExplanation(isViewerOnly);
            }
        }
        
        // Send to server
        socketClient.socket.emit('toggleViewerOnly', isViewerOnly);
        console.log(`Toggled viewer-only mode: ${isViewerOnly}`);
    }

    // Show explanation toast for the selected mode
    showModeExplanation(isViewerOnly) {
        let message;
        
        if (isViewerOnly) {
            message = "You are now in Viewer mode.\nYou can only observe the match.";
        } else {
            message = "You are now in Fighter mode.\nYou have a chance to be selected as a fighter in the next match!";
        }
        
        // Show as center notification instead of toast
        this.showCenterNotification(message);
    }
    
    // Show notification in the center of the screen
    showCenterNotification(message, duration = 3000) {
        // Remove existing notification if any
        const existingNotification = document.getElementById('center-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = 'center-notification';
        notification.className = 'center-notification';
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 400);
        }, duration);
    }
    
    // Show toast message that fades out
    showToast(message, duration = 3000) {
        // Remove existing toast if any
        const existingToast = document.getElementById('mode-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'mode-toast';
        toast.className = 'toast-message';
        toast.textContent = message;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    // Set default camera (deactivate other camera options)
    setDefaultCamera(button) {
        // Skip if already active
        if (button.classList.contains('active')) return;
        
        // Deactivate other camera buttons
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activate this button
        button.classList.add('active');
        
        // Disable free camera if it's active
        const freeCameraEvent = new CustomEvent('freeCameraToggled', { 
            detail: { enabled: false } 
        });
        document.dispatchEvent(freeCameraEvent);
        
        // Disable third-person view if it's active
        const thirdPersonEvent = new CustomEvent('thirdPersonToggled', { 
            detail: { enabled: false } 
        });
        document.dispatchEvent(thirdPersonEvent);
        
        // Update camera explanation label
        this.updateCameraExplanation("Default camera view selected");
        
        // Show camera explanation as center notification
        this.showCenterNotification("Default camera view.\nWatch the match from the best angles.");
    }

    toggleFreeCamera(button) {
        // Skip if already active
        if (button.classList.contains('active')) return;
        
        // Deactivate other camera buttons
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activate this button
        button.classList.add('active');
        
        // If third-person view is active, disable it
        const thirdPersonEvent = new CustomEvent('thirdPersonToggled', { 
            detail: { enabled: false } 
        });
        document.dispatchEvent(thirdPersonEvent);
        
        // Enable free camera
        const freeCameraEvent = new CustomEvent('freeCameraToggled', { 
            detail: { enabled: true } 
        });
        document.dispatchEvent(freeCameraEvent);
        
        // Update joystick controls visibility for free camera mode
        if (this.isMobile) {
            const joystickControls = document.getElementById('joystick-controls');
            if (joystickControls) {
                joystickControls.style.display = 'flex';
            }
        }
        
        // Update camera explanation label
        this.updateCameraExplanation("Free-fly mode - Use WASD/arrows to move");
        
        // Show free camera explanation as center notification
        this.showCenterNotification("You are now in Free Camera mode.\nUse WASD/Arrow keys or joysticks to fly around.");
    }

    toggleThirdPersonView(button) {
        // Skip if already active
        if (button.classList.contains('active')) return;
        
        // Deactivate other camera buttons
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activate this button
        button.classList.add('active');
        
        // If free camera is active, disable it
        const freeCameraEvent = new CustomEvent('freeCameraToggled', { 
            detail: { enabled: false } 
        });
        document.dispatchEvent(freeCameraEvent);
        
        // Enable third-person view
        const thirdPersonEvent = new CustomEvent('thirdPersonToggled', { 
            detail: { enabled: true } 
        });
        document.dispatchEvent(thirdPersonEvent);
        
        // Update camera explanation label
        this.updateCameraExplanation("Third-person view active");
        
        // Show third-person camera explanation as center notification
        this.showCenterNotification("Third-person view activated.\nWatch from a player's perspective.");
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
    
    // Show story modal
    showStory() {
        // Check if story modal exists, if not create it
        let storyModal = document.getElementById('story-modal');
        if (!storyModal) {
            storyModal = document.createElement('div');
            storyModal.id = 'story-modal';
            storyModal.className = 'fullscreen-modal';
            
            // Create image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'story-image-container fullscreen';
            
            // Create initial image
            const storyImage = document.createElement('img');
            storyImage.className = 'story-image';
            storyImage.src = '/story/intro.jpg'; // You'll need to create this image
            storyImage.alt = 'SumoSumo Story';
            
            // Add ink overlay effect
            const inkOverlay = document.createElement('div');
            inkOverlay.className = 'ink-overlay';
            
            // Create caption container
            const captionContainer = document.createElement('div');
            captionContainer.className = 'story-caption-container';
            
            // Create text element
            const storyText = document.createElement('p');
            storyText.className = 'story-text';
            storyText.textContent = 'Long ago in ancient Japan, the sacred art of Sumo was born. Legends speak of warriors who gained power through honor, respect, and the occasional bowl of chankonabe...';
            
            // Create close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'story-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => {
                storyModal.style.display = 'none';
            };
            
            // Create navigation buttons
            const navButtons = document.createElement('div');
            navButtons.className = 'story-nav-buttons';
            
            const prevBtn = document.createElement('button');
            prevBtn.className = 'story-nav-btn';
            prevBtn.textContent = '←';
            prevBtn.disabled = true; // Disabled on first slide
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'story-nav-btn';
            nextBtn.textContent = '→';
            
            // Add elements to DOM
            navButtons.appendChild(prevBtn);
            navButtons.appendChild(nextBtn);
            
            captionContainer.appendChild(storyText);
            
            imageContainer.appendChild(storyImage);
            imageContainer.appendChild(inkOverlay);
            
            storyModal.appendChild(imageContainer);
            storyModal.appendChild(captionContainer);
            storyModal.appendChild(closeBtn);
            storyModal.appendChild(navButtons);
            
            document.body.appendChild(storyModal);
            
            // Add animation classes after a small delay
            setTimeout(() => {
                storyImage.classList.add('fade-in');
                storyText.classList.add('text-fade-in');
            }, 100);
        }
        
        // Show the modal
        storyModal.style.display = 'block';
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
            
            // Update original game time element
            const gameTime = document.getElementById('game-time');
            if (gameTime) {
                gameTime.textContent = seconds + 's';
            }
            
            // Update top center game time element
            const gameTimeTop = document.getElementById('game-time-top');
            if (gameTimeTop) {
                gameTimeTop.textContent = seconds + 's';
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
        
        // Create fighter controls container
        const fighterControls = document.createElement('div');
        fighterControls.className = 'fighter-controls';
        fighterControls.id = 'fighter-controls';
        
        // Add custom styling to position controls better
        fighterControls.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
        `;
        
        // Create fighter joystick
        const fighterJoystickOuter = document.createElement('div');
        fighterJoystickOuter.className = 'joystick-outer fighter-joystick';
        
        const fighterJoystickInner = document.createElement('div');
        fighterJoystickInner.className = 'joystick-inner';
        fighterJoystickOuter.appendChild(fighterJoystickInner);
        
        // Create referee taunt buttons container
        const refereeTauntContainer = document.createElement('div');
        refereeTauntContainer.className = 'referee-taunt-container';
        refereeTauntContainer.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            display: none; // Hidden by default
        `;
        
        // Create simple English taunt button
        const englishTauntBtn = document.createElement('button');
        englishTauntBtn.className = 'referee-taunt-btn';
        englishTauntBtn.textContent = 'EN';
        englishTauntBtn.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: rgba(60, 20, 0, 0.75);
            color: white;
            border: 2px solid #FFD700;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
        `;
        
        // Create simple Japanese taunt button
        const japaneseTauntBtn = document.createElement('button');
        japaneseTauntBtn.className = 'referee-taunt-btn';
        japaneseTauntBtn.textContent = 'JP';
        japaneseTauntBtn.style.cssText = `
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: rgba(60, 20, 0, 0.75);
            color: white;
            border: 2px solid #FFD700;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
        `;
        
        // Add event listeners to taunt buttons
        englishTauntBtn.addEventListener('click', () => {
            this.sendMobileControlEvent('q', true);
            setTimeout(() => this.sendMobileControlEvent('q', false), 100);
            
            // Add visual feedback
            englishTauntBtn.style.backgroundColor = 'rgba(100, 50, 20, 0.9)';
            setTimeout(() => {
                englishTauntBtn.style.backgroundColor = 'rgba(60, 20, 0, 0.75)';
            }, 300);
        });
        
        japaneseTauntBtn.addEventListener('click', () => {
            this.sendMobileControlEvent('e', true);
            setTimeout(() => this.sendMobileControlEvent('e', false), 100);
            
            // Add visual feedback
            japaneseTauntBtn.style.backgroundColor = 'rgba(100, 50, 20, 0.9)';
            setTimeout(() => {
                japaneseTauntBtn.style.backgroundColor = 'rgba(60, 20, 0, 0.75)';
            }, 300);
        });
        
        // Add taunt buttons to container
        refereeTauntContainer.appendChild(englishTauntBtn);
        refereeTauntContainer.appendChild(japaneseTauntBtn);
        
        // Add referee taunt container and joystick to fighter controls
        fighterControls.appendChild(refereeTauntContainer);
        fighterControls.appendChild(fighterJoystickOuter);
        
        // Create a container for referee-specific controls and store it for later showing/hiding
        this.refereeTauntButtons = refereeTauntContainer;
        
        // Add joystick controls for fly-around mode
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-controls';
        joystickContainer.style.display = 'none'; // Hidden by default
        
        // Create left joystick for movement (WASD)
        const leftJoystickOuter = document.createElement('div');
        leftJoystickOuter.className = 'joystick-outer left-joystick';
        
        const leftJoystickInner = document.createElement('div');
        leftJoystickInner.className = 'joystick-inner';
        leftJoystickOuter.appendChild(leftJoystickInner);
        
        // Create right joystick for up/down and rotation
        const rightJoystickOuter = document.createElement('div');
        rightJoystickOuter.className = 'joystick-outer right-joystick';
        
        const rightJoystickInner = document.createElement('div');
        rightJoystickInner.className = 'joystick-inner';
        rightJoystickOuter.appendChild(rightJoystickInner);
        
        // Add joysticks to container
        joystickContainer.appendChild(leftJoystickOuter);
        joystickContainer.appendChild(rightJoystickOuter);
        
        // Add both control sets to mobile controls container
        this.mobileControls.appendChild(fighterControls);
        this.mobileControls.appendChild(joystickContainer);
        document.body.appendChild(this.mobileControls);
        
        // Initialize joystick controls
        this.initializeFighterJoystick(fighterJoystickOuter, fighterJoystickInner);
        this.initializeJoystickControls(leftJoystickOuter, leftJoystickInner, 'movement');
        this.initializeJoystickControls(rightJoystickOuter, rightJoystickInner, 'rotation');
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
        
        // Get container elements
        const fighterControls = document.getElementById('fighter-controls');
        const joystickControls = document.getElementById('joystick-controls');
        
        // Always show the main container if on mobile and in landscape
        if (this.isMobile && this.isLandscape) {
            this.mobileControls.style.display = 'block';
        } else {
            this.mobileControls.style.display = 'none';
        }
        
        // Handle fighter controls - show only if user is a fighter or referee
        if (this.isMobile && this.isLandscape && (role === 'fighter' || role === 'referee')) {
            console.log(`Showing mobile controls for ${role}`);
            if (fighterControls) fighterControls.style.display = 'flex';
            
            // Show/hide referee taunt buttons based on role
            if (this.refereeTauntButtons) {
                this.refereeTauntButtons.style.display = role === 'referee' ? 'flex' : 'none';
            }
        } else {
            if (fighterControls) fighterControls.style.display = 'none';
        }
        
        // Handle fly around controls - show only if free camera is enabled
        if (this.isMobile && this.isLandscape && document.getElementById('free-camera-toggle')?.checked) {
            console.log("Showing joystick mobile controls for free camera");
            if (joystickControls) joystickControls.style.display = 'flex';
        } else {
            if (joystickControls) joystickControls.style.display = 'none';
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

    // Initialize joystick controls with touch and mouse events
    initializeJoystickControls(outerElement, innerElement, joystickType) {
        let active = false;
        let startX, startY;
        let currentX, currentY;
        const maxDistance = 40; // Maximum distance the joystick can move
        
        // Maps to track which keys are currently pressed
        const keysPressed = {
            movement: {
                w: false, // forward
                s: false, // backward
                a: false, // left
                d: false  // right
            },
            rotation: {
                ArrowUp: false,    // up
                ArrowDown: false,  // down
                ArrowLeft: false,  // rotate left
                ArrowRight: false  // rotate right
            }
        };
        
        // Set up touch event handlers
        outerElement.addEventListener('touchstart', handleStart, { passive: false });
        outerElement.addEventListener('touchmove', handleMove, { passive: false });
        outerElement.addEventListener('touchend', handleEnd, { passive: false });
        
        // Set up mouse event handlers for testing on desktop
        outerElement.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        function handleStart(e) {
            e.preventDefault();
            active = true;
            
            // Get starting position
            if (e.type === 'touchstart') {
                const touch = e.touches[0];
                const rect = outerElement.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
                currentX = touch.clientX;
                currentY = touch.clientY;
            } else {
                const rect = outerElement.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // Initialize joystick position
            updateJoystickPosition();
        }
        
        function handleMove(e) {
            if (!active) return;
            e.preventDefault();
            
            // Update current position
            if (e.type === 'touchmove') {
                const touch = e.touches[0];
                currentX = touch.clientX;
                currentY = touch.clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // Update joystick position and send control events
            updateJoystickPosition();
            sendControlEvents();
        }
        
        function handleEnd(e) {
            if (!active) return;
            e.preventDefault();
            active = false;
            
            // Reset joystick position
            innerElement.style.transform = 'translate(0px, 0px)';
            
            // Reset all keys for this joystick
            const keys = keysPressed[joystickType];
            for (const key in keys) {
                if (keys[key]) {
                    keys[key] = false;
                    uiManager.sendMobileControlEvent(key, false);
                }
            }
        }
        
        function updateJoystickPosition() {
            // Calculate distance from center
            let deltaX = currentX - startX;
            let deltaY = currentY - startY;
            
            // Calculate distance
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Limit distance to max
            if (distance > maxDistance) {
                const ratio = maxDistance / distance;
                deltaX *= ratio;
                deltaY *= ratio;
            }
            
            // Move joystick inner element
            innerElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }
        
        function sendControlEvents() {
            // Calculate normalized direction
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Don't send events if joystick is in center position (with small deadzone)
            if (distance < 5) {
                // Reset all keys for this joystick
                const keys = keysPressed[joystickType];
                for (const key in keys) {
                    if (keys[key]) {
                        keys[key] = false;
                        uiManager.sendMobileControlEvent(key, false);
                    }
                }
                return;
            }
            
            // Normalize delta values
            const normX = deltaX / Math.max(distance, 1);
            const normY = deltaY / Math.max(distance, 1);
            
            // Determine which keys to press based on joystick type
            if (joystickType === 'movement') {
                // Forward/backward (W/S)
                const shouldPressW = normY < -0.3;
                const shouldPressS = normY > 0.3;
                
                // Left/right (A/D)
                const shouldPressA = normX < -0.3;
                const shouldPressD = normX > 0.3;
                
                // Update W key
                if (shouldPressW !== keysPressed.movement.w) {
                    keysPressed.movement.w = shouldPressW;
                    uiManager.sendMobileControlEvent('w', shouldPressW);
                }
                
                // Update S key
                if (shouldPressS !== keysPressed.movement.s) {
                    keysPressed.movement.s = shouldPressS;
                    uiManager.sendMobileControlEvent('s', shouldPressS);
                }
                
                // Update A key
                if (shouldPressA !== keysPressed.movement.a) {
                    keysPressed.movement.a = shouldPressA;
                    uiManager.sendMobileControlEvent('a', shouldPressA);
                }
                
                // Update D key
                if (shouldPressD !== keysPressed.movement.d) {
                    keysPressed.movement.d = shouldPressD;
                    uiManager.sendMobileControlEvent('d', shouldPressD);
                }
            } else if (joystickType === 'rotation') {
                // Up/down (ArrowUp/ArrowDown)
                const shouldPressUp = normY < -0.3;
                const shouldPressDown = normY > 0.3;
                
                // Rotate left/right (ArrowLeft/ArrowRight)
                const shouldPressLeft = normX < -0.3;
                const shouldPressRight = normX > 0.3;
                
                // Update ArrowUp key
                if (shouldPressUp !== keysPressed.rotation.ArrowUp) {
                    keysPressed.rotation.ArrowUp = shouldPressUp;
                    uiManager.sendMobileControlEvent('ArrowUp', shouldPressUp);
                }
                
                // Update ArrowDown key
                if (shouldPressDown !== keysPressed.rotation.ArrowDown) {
                    keysPressed.rotation.ArrowDown = shouldPressDown;
                    uiManager.sendMobileControlEvent('ArrowDown', shouldPressDown);
                }
                
                // Update ArrowLeft key
                if (shouldPressLeft !== keysPressed.rotation.ArrowLeft) {
                    keysPressed.rotation.ArrowLeft = shouldPressLeft;
                    uiManager.sendMobileControlEvent('ArrowLeft', shouldPressLeft);
                }
                
                // Update ArrowRight key
                if (shouldPressRight !== keysPressed.rotation.ArrowRight) {
                    keysPressed.rotation.ArrowRight = shouldPressRight;
                    uiManager.sendMobileControlEvent('ArrowRight', shouldPressRight);
                }
            }
        }
    }

    // Initialize fighter joystick with touch and mouse events
    initializeFighterJoystick(outerElement, innerElement) {
        let active = false;
        let startX, startY;
        let currentX, currentY;
        const maxDistance = 40; // Maximum distance the joystick can move
        
        // Maps to track which keys are currently pressed
        const keysPressed = {
            ArrowUp: false,    // forward
            ArrowDown: false,  // backward
            ArrowLeft: false,  // left
            ArrowRight: false  // right
        };
        
        // Set up touch event handlers
        outerElement.addEventListener('touchstart', handleStart, { passive: false });
        outerElement.addEventListener('touchmove', handleMove, { passive: false });
        outerElement.addEventListener('touchend', handleEnd, { passive: false });
        
        // Set up mouse event handlers for testing on desktop
        outerElement.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        function handleStart(e) {
            e.preventDefault();
            active = true;
            
            // Get starting position
            if (e.type === 'touchstart') {
                const touch = e.touches[0];
                const rect = outerElement.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
                currentX = touch.clientX;
                currentY = touch.clientY;
            } else {
                const rect = outerElement.getBoundingClientRect();
                startX = rect.left + rect.width / 2;
                startY = rect.top + rect.height / 2;
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // Initialize joystick position
            updateJoystickPosition();
        }
        
        function handleMove(e) {
            if (!active) return;
            e.preventDefault();
            
            // Update current position
            if (e.type === 'touchmove') {
                const touch = e.touches[0];
                currentX = touch.clientX;
                currentY = touch.clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }
            
            // Update joystick position and send control events
            updateJoystickPosition();
            sendControlEvents();
        }
        
        function handleEnd(e) {
            if (!active) return;
            e.preventDefault();
            active = false;
            
            // Reset joystick position
            innerElement.style.transform = 'translate(0px, 0px)';
            
            // Reset all keys
            for (const key in keysPressed) {
                if (keysPressed[key]) {
                    keysPressed[key] = false;
                    uiManager.sendMobileControlEvent(key, false);
                }
            }
        }
        
        function updateJoystickPosition() {
            // Calculate distance from center
            let deltaX = currentX - startX;
            let deltaY = currentY - startY;
            
            // Calculate distance
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Limit distance to max
            if (distance > maxDistance) {
                const ratio = maxDistance / distance;
                deltaX *= ratio;
                deltaY *= ratio;
            }
            
            // Move joystick inner element
            innerElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        }
        
        function sendControlEvents() {
            // Calculate normalized direction
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Don't send events if joystick is in center position (with small deadzone)
            if (distance < 5) {
                // Reset all keys
                for (const key in keysPressed) {
                    if (keysPressed[key]) {
                        keysPressed[key] = false;
                        uiManager.sendMobileControlEvent(key, false);
                    }
                }
                return;
            }
            
            // Normalize delta values
            const normX = deltaX / Math.max(distance, 1);
            const normY = deltaY / Math.max(distance, 1);
            
            // Forward/backward (ArrowUp/ArrowDown)
            const shouldPressUp = normY < -0.3;
            const shouldPressDown = normY > 0.3;
            
            // Left/right (ArrowLeft/ArrowRight)
            const shouldPressLeft = normX < -0.3;
            const shouldPressRight = normX > 0.3;
            
            // Update ArrowUp key
            if (shouldPressUp !== keysPressed.ArrowUp) {
                keysPressed.ArrowUp = shouldPressUp;
                uiManager.sendMobileControlEvent('ArrowUp', shouldPressUp);
            }
            
            // Update ArrowDown key
            if (shouldPressDown !== keysPressed.ArrowDown) {
                keysPressed.ArrowDown = shouldPressDown;
                uiManager.sendMobileControlEvent('ArrowDown', shouldPressDown);
            }
            
            // Update ArrowLeft key
            if (shouldPressLeft !== keysPressed.ArrowLeft) {
                keysPressed.ArrowLeft = shouldPressLeft;
                uiManager.sendMobileControlEvent('ArrowLeft', shouldPressLeft);
            }
            
            // Update ArrowRight key
            if (shouldPressRight !== keysPressed.ArrowRight) {
                keysPressed.ArrowRight = shouldPressRight;
                uiManager.sendMobileControlEvent('ArrowRight', shouldPressRight);
            }
        }
    }

    // Update the camera explanation text
    updateCameraExplanation(text) {
        const explanationElement = document.querySelector('.camera-explanation');
        if (explanationElement) {
            explanationElement.textContent = text;
        }
    }

    // Show notification when role changes
    showRoleChangeNotification(newRole) {
        // Only show role change notifications during fighter selection
        if (socketClient.gameState.stage !== 'selecting_fighters') {
            return;
        }
        
        let message;
        
        switch(newRole.toLowerCase()) {
            case 'fighter':
                message = "You are now a FIGHTER!\nGet ready to battle in the ring!";
                break;
            case 'referee':
                message = "You are now the REFEREE!\nMaintain order in the ring!";
                break;
            case 'viewer':
                message = "You are now a VIEWER.\nEnjoy watching the match!";
                break;
            default:
                message = `Your role has changed to: ${newRole}`;
        }
        
        this.showCenterNotification(message, 4000);
    }

    // Show game stage notification
    showGameStageNotification(stageName, displayName) {
        let message;
        let duration = 3000;
        
        switch(stageName) {
            case 'MATCH_STARTING':
                message = "Match is starting!\nFighters, prepare for battle!";
                duration = 4000;
                break;
            case 'MATCH_IN_PROGRESS':
                message = "FIGHT!\nMay the strongest sumo win!";
                duration = 3000;
                break;
            case 'MATCH_ENDED':
                // Find the winner if available
                let winnerName = "";
                if (socketClient.gameState && socketClient.gameState.winner) {
                    winnerName = socketClient.gameState.winner.name || "A fighter";
                }
                
                if (winnerName) {
                    message = `${winnerName} is victorious!\nThe match has ended.`;
                } else {
                    message = "The match has ended!";
                }
                duration = 5000;
                break;
            default:
                // Don't show notification for other stages
                return;
        }
        
        this.showCenterNotification(message, duration);
    }
}

// Export a singleton instance of the UIManager
export const uiManager = new UIManager();

// Make it globally available for HTML event handlers
window.uiManager = uiManager; 