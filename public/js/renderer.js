class Renderer {
    constructor() {
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Game objects
        this.ring = null;
        this.fighters = {};
        this.viewers = {};
        this.referee = null;
        
        // Constants
        this.RING_RADIUS = 5;
        this.SUMO_RADIUS = 1;
        
        this.setupRenderer();
        this.setupLights();
        this.setupCamera();
        this.createRing();
        
        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-canvas').appendChild(this.renderer.domElement);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }
    
    setupCamera() {
        this.camera.position.set(0, 10, 15);
        this.camera.lookAt(0, 0, 0);
    }
    
    createRing() {
        // Create the sumo ring
        const ringGeometry = new THREE.CylinderGeometry(this.RING_RADIUS, this.RING_RADIUS, 0.5, 32);
        const ringMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xd9c8a0,
            side: THREE.DoubleSide
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.y = -0.25;
        this.ring.receiveShadow = true;
        this.scene.add(this.ring);
        
        // Add ring boundary
        const boundaryGeometry = new THREE.RingGeometry(this.RING_RADIUS - 0.1, this.RING_RADIUS, 32);
        const boundaryMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        boundary.rotation.x = -Math.PI / 2;
        boundary.position.y = 0.01;
        this.scene.add(boundary);
        
        // Add floor
        const floorGeometry = new THREE.PlaneGeometry(50, 50);
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x85c285, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }
    
    createSumoFighter(id, position) {
        // Create sumo body
        const bodyGeometry = new THREE.CylinderGeometry(this.SUMO_RADIUS, this.SUMO_RADIUS, 1.8, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xffcccc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffddcc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.85;
        head.castShadow = true;
        
        // Create sumo group
        const sumo = new THREE.Group();
        sumo.add(body);
        sumo.add(head);
        
        // Position the sumo
        sumo.position.set(position, 0, 0);
        
        // Add to scene and store reference
        this.scene.add(sumo);
        this.fighters[id] = sumo;
        
        return sumo;
    }
    
    createViewer(id) {
        // Create viewer body
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffddcc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.35;
        head.castShadow = true;
        
        // Create viewer group
        const viewer = new THREE.Group();
        viewer.add(body);
        viewer.add(head);
        
        // Position the viewer randomly around the ring
        const angle = Math.random() * Math.PI * 2;
        const distance = this.RING_RADIUS + 2 + Math.random() * 3;
        viewer.position.set(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        );
        
        // Make viewer look at the ring
        viewer.lookAt(0, 0, 0);
        
        // Add to scene and store reference
        this.scene.add(viewer);
        this.viewers[id] = viewer;
        
        return viewer;
    }
    
    createReferee() {
        // Create referee body
        const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 12);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        
        // Create head
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffddcc });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.35;
        head.castShadow = true;
        
        // Create referee group
        const referee = new THREE.Group();
        referee.add(body);
        referee.add(head);
        
        // Position the referee
        referee.position.set(0, 0, this.RING_RADIUS - 1);
        
        // Add to scene and store reference
        this.scene.add(referee);
        this.referee = referee;
        
        return referee;
    }
    
    setupScene(gameState) {
        // Create referee if needed
        if (gameState.referee && !this.referee) {
            this.createReferee();
        }
        
        // Create fighters
        if (gameState.fighters) {
            gameState.fighters.forEach((fighterId, index) => {
                const position = index === 0 ? -2 : 2;
                this.createSumoFighter(fighterId, position);
            });
        }
        
        // Create viewers
        if (gameState.viewers) {
            gameState.viewers.forEach(viewerId => {
                this.createViewer(viewerId);
            });
        }
    }
    
    startNewRound(data) {
        // Clear previous fighters
        Object.keys(this.fighters).forEach(id => {
            this.scene.remove(this.fighters[id]);
            delete this.fighters[id];
        });
        
        // Create new fighters
        data.fighters.forEach((fighterId, index) => {
            // Remove from viewers if present
            if (this.viewers[fighterId]) {
                this.scene.remove(this.viewers[fighterId]);
                delete this.viewers[fighterId];
            }
            
            // Create as fighter
            const position = index === 0 ? -2 : 2;
            this.createSumoFighter(fighterId, position);
        });
        
        // Update referee
        if (data.referee) {
            if (this.referee) {
                this.scene.remove(this.referee);
            }
            this.createReferee();
        }
    }
    
    addViewer(id) {
        if (!this.viewers[id]) {
            this.createViewer(id);
        }
    }
    
    removePlayer(id) {
        // Remove fighter if exists
        if (this.fighters[id]) {
            this.scene.remove(this.fighters[id]);
            delete this.fighters[id];
        }
        
        // Remove viewer if exists
        if (this.viewers[id]) {
            this.scene.remove(this.viewers[id]);
            delete this.viewers[id];
        }
        
        // Reset referee if needed
        if (this.referee && this.referee.id === id) {
            this.scene.remove(this.referee);
            this.referee = null;
        }
    }
    
    moveFighter(fighterId, position) {
        if (this.fighters[fighterId]) {
            // Animate the movement smoothly
            gsap.to(this.fighters[fighterId].position, {
                x: position,
                duration: 0.2,
                ease: 'power1.out'
            });
        }
    }
    
    showEmote(playerId, emote) {
        let player = this.fighters[playerId] || this.viewers[playerId];
        if (!player) return;
        
        // Create emote bubble using CSS
        const emoteMappings = {
            'cheer': '🎉',
            'laugh': '😂',
            'wow': '😮',
            'sad': '😢'
        };
        
        // Create 3D text for the emote
        const emoteText = emoteMappings[emote] || emote;
        
        // Create a sprite for the emote
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = 'white';
        context.fillRect(0, 0, 128, 128);
        context.fillStyle = 'black';
        context.font = '80px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(emoteText, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        sprite.position.copy(player.position);
        sprite.position.y += 2.5;
        
        this.scene.add(sprite);
        
        // Animate and remove after 2 seconds
        const startY = sprite.position.y;
        
        gsap.to(sprite.position, {
            y: startY + 1,
            duration: 2,
            ease: 'power1.out',
            onComplete: () => {
                this.scene.remove(sprite);
            }
        });
        
        gsap.to(sprite.material, {
            opacity: 0,
            duration: 2,
            delay: 0.5,
            ease: 'power1.in'
        });
    }
    
    update() {
        // Animate viewers (slight bobbing motion)
        Object.values(this.viewers).forEach(viewer => {
            viewer.position.y = Math.sin(Date.now() * 0.003 + viewer.position.x) * 0.05;
        });
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
} 