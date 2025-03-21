class Viewer {
  constructor(id, position, color, scene, container, camera) {
    this.id = id;
    this.position = position;
    this.color = color;
    this.scene = scene;
    this.container = container;
    this.camera = camera;
    this.mesh = null;
    this.radius = 0.8;
    this.emotes = [];
    this.highlightMesh = null;
    this.isHighlighted = false;
    this.leftPupil = null;
    this.rightPupil = null;
    this.bodyParts = {};
    this.isMale = Math.random() > 0.4; // 60% chance of male viewers
    this.hasHat = Math.random() > 0.7; // 30% chance of having a hat
    this.hasFan = Math.random() > 0.5; // 50% chance of having a fan
    
    this.init();
  }
  
  init() {
    // Create main group for the viewer
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.mesh);
    
    // Create viewer body
    this.createBody();
    
    // Create viewer head
    this.createHead();
    
    // Add accessories (hats, fans, etc.)
    this.addAccessories();
  }
  
  createBody() {
    // Body base (kimono-style clothing)
    const bodyGeometry = createCircleGeometry(this.radius);
    const bodyMaterial = createMaterial(this.color);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Kimono pattern overlay
    const patternGeometry = new THREE.RingGeometry(this.radius * 0.7, this.radius, 32);
    const patternColor = this.getComplementaryColor(this.color);
    const patternMaterial = createMaterial(patternColor);
    const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
    pattern.position.set(0, 0, 0.01);
    body.add(pattern);
    this.bodyParts.pattern = pattern;
    
    // Obi (belt)
    const obiGeometry = new THREE.PlaneGeometry(this.radius * 1.2, this.radius * 0.3);
    const obiMaterial = createMaterial(this.getComplementaryColor(patternColor));
    const obi = new THREE.Mesh(obiGeometry, obiMaterial);
    obi.position.set(0, -0.1, 0.02);
    body.add(obi);
    this.bodyParts.obi = obi;
    
    // Arms
    this.createArms(body);
  }
  
  createArms(body) {
    // Left arm
    const leftArmGeometry = new THREE.PlaneGeometry(this.radius * 0.2, this.radius * 0.6);
    const armMaterial = createMaterial(this.color);
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-this.radius * 0.7, 0, 0.01);
    body.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm
    const rightArmGeometry = new THREE.PlaneGeometry(this.radius * 0.2, this.radius * 0.6);
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(this.radius * 0.7, 0, 0.01);
    body.add(rightArm);
    this.bodyParts.rightArm = rightArm;
    
    // Hands
    const handGeometry = createCircleGeometry(this.radius * 0.15);
    const handMaterial = createMaterial('#FFE4C4'); // Bisque color for skin
    
    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -this.radius * 0.35, 0.01);
    leftArm.add(leftHand);
    this.bodyParts.leftHand = leftHand;
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -this.radius * 0.35, 0.01);
    rightArm.add(rightHand);
    this.bodyParts.rightHand = rightHand;
  }
  
  createHead() {
    // Head
    const headGeometry = createCircleGeometry(this.radius * 0.5);
    const headMaterial = createMaterial('#FFE4C4'); // Bisque color for skin
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, this.radius * 0.7, 0.01);
    this.mesh.add(head);
    this.bodyParts.head = head;
    
    // Face
    this.createFace(head);
    
    // Hair
    this.createHair(head);
  }
  
  createFace(head) {
    // Eyes
    const eyeGeometry = createCircleGeometry(0.15);
    const eyeMaterial = createMaterial('#ffffff');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.1, 0.1);
    leftEye.scale.set(0.7, 1, 1); // Slightly oval eyes
    head.add(leftEye);
    this.bodyParts.leftEye = leftEye;
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.1, 0.1);
    rightEye.scale.set(0.7, 1, 1); // Slightly oval eyes
    head.add(rightEye);
    
    // Pupils
    const pupilGeometry = createCircleGeometry(0.07);
    const pupilMaterial = createMaterial('#000000');
    
    // Left pupil
    this.leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.leftPupil.position.set(0, 0, 0.1);
    leftEye.add(this.leftPupil);
    
    // Right pupil
    this.rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.rightPupil.position.set(0, 0, 0.1);
    rightEye.add(this.rightPupil);
    
    // Eyebrows
    const eyebrowGeometry = new THREE.PlaneGeometry(0.2, 0.05);
    const eyebrowMaterial = createMaterial('#000000');
    
    // Left eyebrow
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.25, 0.25, 0.1);
    head.add(leftEyebrow);
    this.bodyParts.leftEyebrow = leftEyebrow;
    
    // Right eyebrow
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.25, 0.25, 0.1);
    head.add(rightEyebrow);
    this.bodyParts.rightEyebrow = rightEyebrow;
    
    // Mouth (neutral expression)
    const mouthGeometry = new THREE.PlaneGeometry(0.2, 0.05);
    const mouthMaterial = createMaterial('#000000');
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.2, 0.1);
    head.add(mouth);
    this.bodyParts.mouth = mouth;
    
    // Add nose
    const noseGeometry = createCircleGeometry(0.07);
    const noseMaterial = createMaterial('#FFD1B3'); // Slightly darker than skin
    const nose = new THREE.Mesh(noseGeometry, noseMaterial);
    nose.position.set(0, -0.05, 0.1);
    nose.scale.set(0.7, 1, 1); // Oval nose
    head.add(nose);
    this.bodyParts.nose = nose;
  }
  
  createHair(head) {
    // Different hairstyles based on gender
    if (this.isMale) {
      // Male hairstyle (traditional Japanese)
      if (Math.random() > 0.5) {
        // Chonmage-inspired hairstyle (for some viewers)
        const hairGeometry = createCircleGeometry(0.35);
        const hairMaterial = createMaterial('#000000');
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0.3, -0.01);
        head.add(hair);
        this.bodyParts.hair = hair;
      } else {
        // Short hair
        const hairGeometry = new THREE.RingGeometry(0.35, 0.5, 32);
        const hairMaterial = createMaterial('#000000');
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.set(0, 0, -0.01);
        head.add(hair);
        this.bodyParts.hair = hair;
      }
    } else {
      // Female hairstyle (traditional Japanese)
      const hairGeometry = new THREE.RingGeometry(0.4, 0.55, 32);
      const hairMaterial = createMaterial('#000000');
      const hair = new THREE.Mesh(hairGeometry, hairMaterial);
      hair.position.set(0, 0, -0.01);
      head.add(hair);
      this.bodyParts.hair = hair;
      
      // Hair bun
      const bunGeometry = createCircleGeometry(0.25);
      const bun = new THREE.Mesh(bunGeometry, hairMaterial);
      bun.position.set(0, 0.4, -0.01);
      head.add(bun);
      this.bodyParts.hairBun = bun;
    }
  }
  
  addAccessories() {
    // Add hat (for some viewers)
    if (this.hasHat) {
      const hatType = Math.floor(Math.random() * 3); // 0: traditional, 1: modern, 2: headband
      
      if (hatType === 0) {
        // Traditional Japanese hat
        const hatGeometry = createCircleGeometry(0.6);
        const hatMaterial = createMaterial('#8B4513'); // Brown
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.set(0, this.radius * 0.7 + 0.5, 0);
        this.mesh.add(hat);
        this.bodyParts.hat = hat;
        
        // Hat top
        const hatTopGeometry = new THREE.ConeGeometry(0.4, 0.3, 32);
        const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
        hatTop.position.set(0, 0.15, 0);
        hatTop.rotation.x = Math.PI;
        hat.add(hatTop);
        this.bodyParts.hatTop = hatTop;
      } else if (hatType === 1) {
        // Modern cap
        const capGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 32);
        const capMaterial = createMaterial(this.getRandomBrightColor());
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.set(0, this.radius * 0.7 + 0.3, 0);
        cap.rotation.x = Math.PI / 2;
        this.mesh.add(cap);
        this.bodyParts.cap = cap;
        
        // Cap visor
        const visorGeometry = new THREE.PlaneGeometry(0.7, 0.2);
        const visor = new THREE.Mesh(visorGeometry, capMaterial);
        visor.position.set(0, -0.25, 0.25);
        cap.add(visor);
        this.bodyParts.visor = visor;
      } else {
        // Headband (hachimaki)
        const headbandGeometry = new THREE.RingGeometry(0.5, 0.55, 32);
        const headbandMaterial = createMaterial('#FFFFFF');
        const headband = new THREE.Mesh(headbandGeometry, headbandMaterial);
        headband.position.set(0, this.radius * 0.7, 0.02);
        this.mesh.add(headband);
        this.bodyParts.headband = headband;
      }
    }
    
    // Add fan (for some viewers)
    if (this.hasFan) {
      const fanGeometry = new THREE.CircleGeometry(0.3, 32, 0, Math.PI);
      const fanMaterial = createMaterial('#FFFFFF');
      const fan = new THREE.Mesh(fanGeometry, fanMaterial);
      
      // Position in one of the hands
      if (Math.random() > 0.5) {
        // In right hand
        fan.position.set(0, 0, 0.01);
        fan.rotation.z = Math.PI / 2;
        this.bodyParts.rightHand.add(fan);
      } else {
        // In left hand
        fan.position.set(0, 0, 0.01);
        fan.rotation.z = -Math.PI / 2;
        this.bodyParts.leftHand.add(fan);
      }
      this.bodyParts.fan = fan;
      
      // Add fan decoration
      const decorationGeometry = new THREE.PlaneGeometry(0.25, 0.05);
      const decorationMaterial = createMaterial('#FF0000'); // Red decoration
      const decoration = new THREE.Mesh(decorationGeometry, decorationMaterial);
      decoration.position.set(0, 0.1, 0.01);
      fan.add(decoration);
      this.bodyParts.fanDecoration = decoration;
    }
  }
  
  update() {
    // Update pupils to look toward the center
    this.updatePupilsLookDirection();
    
    // Occasionally animate the viewer (small movements)
    if (Math.random() < 0.005) { // 0.5% chance per frame
      this.animateRandomMovement();
    }
  }
  
  updatePupilsLookDirection() {
    if (!this.leftPupil || !this.rightPupil) return;
    
    // Calculate direction to center (where the fight is)
    const directionX = -this.position.x;
    const directionY = -this.position.y;
    
    // Normalize the direction
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    if (length === 0) return; // Avoid division by zero
    
    const normalizedX = directionX / length;
    const normalizedY = directionY / length;
    
    // Scale the movement (how far pupils can move within the eyes)
    const maxOffset = 0.08;
    const offsetX = normalizedX * maxOffset;
    const offsetY = normalizedY * maxOffset;
    
    // Apply the offset to pupils
    this.leftPupil.position.set(offsetX, offsetY, 0.1);
    this.rightPupil.position.set(offsetX, offsetY, 0.1);
  }
  
  animateRandomMovement() {
    // Small random movements to make the crowd feel alive
    const movementType = Math.floor(Math.random() * 3); // 0: head nod, 1: arm wave, 2: body sway
    
    if (movementType === 0 && this.bodyParts.head) {
      // Head nod
      this.animateHeadNod();
    } else if (movementType === 1) {
      // Arm wave
      if (Math.random() > 0.5 && this.bodyParts.rightArm) {
        this.animateArmWave('right');
      } else if (this.bodyParts.leftArm) {
        this.animateArmWave('left');
      }
    } else if (movementType === 2) {
      // Body sway
      this.animateBodySway();
    }
  }
  
  animateHeadNod() {
    const head = this.bodyParts.head;
    const originalY = head.position.y;
    const duration = 500; // 0.5 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simple up and down movement
      const offset = Math.sin(progress * Math.PI * 2) * 0.1;
      head.position.y = originalY + offset;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        head.position.y = originalY;
      }
    };
    
    animate();
  }
  
  animateArmWave(side) {
    const arm = side === 'right' ? this.bodyParts.rightArm : this.bodyParts.leftArm;
    const originalRotation = arm.rotation.z;
    const duration = 600; // 0.6 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Wave motion
      const waveAmount = side === 'right' ? -0.5 : 0.5;
      arm.rotation.z = originalRotation + Math.sin(progress * Math.PI * 2) * waveAmount;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        arm.rotation.z = originalRotation;
      }
    };
    
    animate();
  }
  
  animateBodySway() {
    const originalRotation = this.mesh.rotation.z;
    const duration = 800; // 0.8 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Sway motion
      this.mesh.rotation.z = originalRotation + Math.sin(progress * Math.PI * 2) * 0.1;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.mesh.rotation.z = originalRotation;
      }
    };
    
    animate();
  }
  
  emote(emoteType) {
    // Create emote bubble
    const bubble = document.createElement('div');
    bubble.className = 'emote-bubble';
    bubble.textContent = this.getEmoteSymbol(emoteType);
    this.container.appendChild(bubble);
    
    // Position bubble above the viewer
    this.positionBubble(bubble);
    
    // Store reference to remove later
    this.emotes.push(bubble);
    
    // Remove after animation completes
    setTimeout(() => {
      if (this.container.contains(bubble)) {
        this.container.removeChild(bubble);
      }
      this.emotes = this.emotes.filter(e => e !== bubble);
    }, 2000);
    
    // Animate the viewer when emoting
    this.animateEmote();
  }
  
  chat(message) {
    // Create chat bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message;
    this.container.appendChild(bubble);
    
    // Position bubble above the viewer
    this.positionBubble(bubble);
    
    // Store reference to remove later
    this.emotes.push(bubble);
    
    // Remove after animation completes
    setTimeout(() => {
      if (this.container.contains(bubble)) {
        this.container.removeChild(bubble);
      }
      this.emotes = this.emotes.filter(e => e !== bubble);
    }, 4000);
    
    // Animate the viewer when chatting
    this.animateChat();
  }
  
  positionBubble(bubble) {
    // Convert 3D position to screen coordinates
    const vector = new THREE.Vector3();
    vector.setFromMatrixPosition(this.mesh.matrixWorld);
    vector.project(this.camera);
    
    const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
    const y = -(vector.y * 0.5 - 0.5) * this.container.clientHeight;
    
    // Position bubble
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y - 80}px`;
  }
  
  getEmoteSymbol(emoteType) {
    switch (emoteType) {
      case 'cheer': return '🎉';
      case 'laugh': return '😂';
      case 'wow': return '😮';
      case 'clap': return '👏';
      case 'heart': return '❤️';
      default: return '👍';
    }
  }
  
  animateEmote() {
    // Scale up briefly
    const initialScale = { x: 1, y: 1, z: 1 };
    const targetScale = { x: 1.1, y: 1.1, z: 1.1 };
    
    // Scale up briefly
    let t = 0;
    const animate = () => {
      t += 0.1;
      if (t <= 1) {
        const scale = easeInOut(t);
        this.mesh.scale.set(
          lerp(initialScale.x, targetScale.x, scale > 0.5 ? 1 - scale : scale),
          lerp(initialScale.y, targetScale.y, scale > 0.5 ? 1 - scale : scale),
          lerp(initialScale.z, targetScale.z, scale > 0.5 ? 1 - scale : scale)
        );
        requestAnimationFrame(animate);
      } else {
        this.mesh.scale.set(1, 1, 1);
      }
    };
    animate();
  }
  
  animateChat() {
    // Animate mouth when chatting
    if (this.bodyParts.mouth) {
      const mouth = this.bodyParts.mouth;
      const originalScaleY = mouth.scale.y;
      const originalY = mouth.position.y;
      const duration = 1000; // 1 second
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Open and close mouth
        if (progress < 0.5) {
          // Opening mouth
          mouth.scale.y = originalScaleY * (1 + progress);
        } else {
          // Closing mouth
          mouth.scale.y = originalScaleY * (2 - progress);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          mouth.scale.y = originalScaleY;
        }
      };
      
      animate();
    }
    
    // Also animate body slightly
    this.animateBodySway();
  }
  
  highlight() {
    if (this.isHighlighted) return;
    
    // Create a slightly larger circle behind the viewer for the highlight effect
    const highlightGeometry = createCircleGeometry(this.radius + 0.2);
    const highlightMaterial = createMaterial('#ffff00'); // Yellow highlight
    highlightMaterial.transparent = true;
    highlightMaterial.opacity = 0.6;
    
    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.position.set(0, 0, -0.05); // Slightly behind the viewer
    this.mesh.add(this.highlightMesh);
    
    // Add pulsing animation
    this.startHighlightAnimation();
    
    this.isHighlighted = true;
  }
  
  startHighlightAnimation() {
    if (!this.highlightMesh) return;
    
    const animate = () => {
      if (!this.highlightMesh || !this.isHighlighted) return;
      
      // Pulse the highlight
      const scale = 1 + 0.1 * Math.sin(Date.now() * 0.005);
      this.highlightMesh.scale.set(scale, scale, 1);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  removeHighlight() {
    if (this.highlightMesh) {
      this.mesh.remove(this.highlightMesh);
      this.highlightMesh = null;
    }
    this.isHighlighted = false;
  }
  
  remove() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
    
    // Remove any emote bubbles
    this.emotes.forEach(emote => {
      if (this.container.contains(emote)) {
        this.container.removeChild(emote);
      }
    });
    this.emotes = [];
  }
  
  // Helper methods for colors
  getComplementaryColor(hexColor) {
    // Convert hex to RGB
    let r = parseInt(hexColor.slice(1, 3), 16);
    let g = parseInt(hexColor.slice(3, 5), 16);
    let b = parseInt(hexColor.slice(5, 7), 16);
    
    // Invert the colors
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
    
    // Convert back to hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  getRandomBrightColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
  }
} 