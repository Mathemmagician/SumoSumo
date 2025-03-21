class Referee {
  constructor(position, scene) {
    this.position = position;
    this.scene = scene;
    this.mesh = null;
    this.bodyParts = {};
    this.fanMesh = null;
    this.isAnimating = false;
    this.radius = 1.0; // Base size for the referee
    
    this.init();
  }
  
  init() {
    // Create main group for the referee
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.mesh);
    
    // Create referee body and clothing
    this.createBody();
    
    // Create referee head
    this.createHead();
    
    // Create ceremonial fan (gunbai)
    this.createFan();
    
    // Create traditional hat (eboshi)
    this.createHat();
    
    // Idle animation
    this.startIdleAnimation();
  }
  
  createBody() {
    // Body base - slightly smaller than sumo wrestlers
    const bodyGeometry = createCircleGeometry(this.radius);
    const bodyMaterial = createMaterial('#8A2BE2'); // Traditional purple/blue color
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Traditional robe (kariginu) - outer layer
    const robeGeometry = new THREE.CircleGeometry(this.radius * 0.95, 32);
    const robeMaterial = createMaterial('#4B0082'); // Indigo
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.set(0, 0, 0.01);
    body.add(robe);
    this.bodyParts.robe = robe;
    
    // Inner white layer
    const innerRobeGeometry = new THREE.CircleGeometry(this.radius * 0.85, 32);
    const innerRobeMaterial = createMaterial('#FFFFFF'); // White
    const innerRobe = new THREE.Mesh(innerRobeGeometry, innerRobeMaterial);
    innerRobe.position.set(0, 0, 0.02);
    body.add(innerRobe);
    
    // Decorative pattern on robe
    this.addRobeDecoration(innerRobe);
    
    // Ceremonial apron (keshō-mawashi)
    const apronGeometry = new THREE.PlaneGeometry(this.radius * 1.2, this.radius * 0.7);
    const apronMaterial = createMaterial('#FFD700'); // Gold
    const apron = new THREE.Mesh(apronGeometry, apronMaterial);
    apron.position.set(0, -this.radius * 0.5, 0.03);
    body.add(apron);
    this.bodyParts.apron = apron;
    
    // Decorative pattern on apron
    this.addApronDecoration(apron);
    
    // Arms
    this.createArms(body);
    
    // Legs
    this.createLegs(body);
  }
  
  addRobeDecoration(robe) {
    // Add decorative patterns to the robe
    const patternCount = 5;
    const patternRadius = this.radius * 0.15;
    
    for (let i = 0; i < patternCount; i++) {
      const angle = (i / patternCount) * Math.PI * 2;
      const x = Math.cos(angle) * (this.radius * 0.5);
      const y = Math.sin(angle) * (this.radius * 0.5);
      
      const patternGeometry = createCircleGeometry(patternRadius);
      const patternMaterial = createMaterial('#4B0082'); // Indigo
      const pattern = new THREE.Mesh(patternGeometry, patternMaterial);
      pattern.position.set(x, y, 0.01);
      robe.add(pattern);
      
      // Add inner pattern
      const innerPatternGeometry = createCircleGeometry(patternRadius * 0.7);
      const innerPatternMaterial = createMaterial('#FFD700'); // Gold
      const innerPattern = new THREE.Mesh(innerPatternGeometry, innerPatternMaterial);
      innerPattern.position.set(0, 0, 0.01);
      pattern.add(innerPattern);
    }
  }
  
  addApronDecoration(apron) {
    // Add decorative embroidery to the apron
    const decorGeometry = new THREE.CircleGeometry(this.radius * 0.2, 32);
    const decorMaterial = createMaterial('#FF0000'); // Red
    const decoration = new THREE.Mesh(decorGeometry, decorMaterial);
    decoration.position.set(0, 0, 0.01);
    apron.add(decoration);
    
    // Add inner decoration
    const innerDecorGeometry = new THREE.CircleGeometry(this.radius * 0.15, 32);
    const innerDecorMaterial = createMaterial('#FFFFFF'); // White
    const innerDecoration = new THREE.Mesh(innerDecorGeometry, innerDecorMaterial);
    innerDecoration.position.set(0, 0, 0.01);
    decoration.add(innerDecoration);
    
    // Add kanji-like symbol (simplified)
    const symbolGeometry = new THREE.PlaneGeometry(this.radius * 0.1, this.radius * 0.2);
    const symbolMaterial = createMaterial('#000000'); // Black
    const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
    symbol.position.set(0, 0, 0.01);
    innerDecoration.add(symbol);
    
    // Add horizontal line
    const lineGeometry = new THREE.PlaneGeometry(this.radius * 0.15, this.radius * 0.03);
    const lineMaterial = createMaterial('#000000');
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 0, 0.01);
    innerDecoration.add(line);
    
    // Add pattern lines on apron
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.PlaneGeometry(this.radius * 0.8, this.radius * 0.03);
      const lineMaterial = createMaterial('#000000');
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(0, this.radius * 0.25 - i * this.radius * 0.2, 0.01);
      apron.add(line);
    }
  }
  
  createArms(body) {
    // Left arm
    const leftArmGeometry = new THREE.PlaneGeometry(this.radius * 0.25, this.radius * 0.7);
    const armMaterial = createMaterial('#8A2BE2'); // Match body color
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-this.radius * 0.7, 0, 0.01);
    body.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm
    const rightArmGeometry = new THREE.PlaneGeometry(this.radius * 0.25, this.radius * 0.7);
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(this.radius * 0.7, 0, 0.01);
    body.add(rightArm);
    this.bodyParts.rightArm = rightArm;
    
    // Hands
    const handGeometry = createCircleGeometry(this.radius * 0.15);
    const handMaterial = createMaterial('#FFE4C4'); // Bisque color for skin
    
    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -this.radius * 0.4, 0.01);
    leftArm.add(leftHand);
    this.bodyParts.leftHand = leftHand;
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -this.radius * 0.4, 0.01);
    rightArm.add(rightHand);
    this.bodyParts.rightHand = rightHand;
    
    // Sleeve decorations
    const sleeveDecorGeometry = new THREE.RingGeometry(this.radius * 0.12, this.radius * 0.25, 32);
    const sleeveDecorMaterial = createMaterial('#FFD700'); // Gold
    
    const leftSleeveDeco = new THREE.Mesh(sleeveDecorGeometry, sleeveDecorMaterial);
    leftSleeveDeco.position.set(0, -this.radius * 0.3, 0.005);
    leftArm.add(leftSleeveDeco);
    
    const rightSleeveDeco = new THREE.Mesh(sleeveDecorGeometry, sleeveDecorMaterial);
    rightSleeveDeco.position.set(0, -this.radius * 0.3, 0.005);
    rightArm.add(rightSleeveDeco);
  }
  
  createLegs(body) {
    // Legs (mostly hidden by the robe, just showing feet)
    const footGeometry = createCircleGeometry(this.radius * 0.15);
    const footMaterial = createMaterial('#FFFFFF'); // White tabi socks
    
    // Left foot
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(-this.radius * 0.3, -this.radius * 1.1, 0.01);
    body.add(leftFoot);
    this.bodyParts.leftFoot = leftFoot;
    
    // Right foot
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(this.radius * 0.3, -this.radius * 1.1, 0.01);
    body.add(rightFoot);
    this.bodyParts.rightFoot = rightFoot;
    
    // Sandals (zori)
    const sandalGeometry = new THREE.PlaneGeometry(this.radius * 0.25, this.radius * 0.1);
    const sandalMaterial = createMaterial('#8B4513'); // Brown
    
    const leftSandal = new THREE.Mesh(sandalGeometry, sandalMaterial);
    leftSandal.position.set(0, -this.radius * 0.05, -0.01);
    leftFoot.add(leftSandal);
    
    const rightSandal = new THREE.Mesh(sandalGeometry, sandalMaterial);
    rightSandal.position.set(0, -this.radius * 0.05, -0.01);
    rightFoot.add(rightSandal);
  }
  
  createHead() {
    // Head
    const headGeometry = createCircleGeometry(this.radius * 0.4);
    const headMaterial = createMaterial('#FFE4C4'); // Skin tone
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, this.radius * 0.8, 0.02);
    this.mesh.add(head);
    this.bodyParts.head = head;
    
    // Face
    this.createFace(head);
  }
  
  createFace(head) {
    // Eyes
    const eyeGeometry = createCircleGeometry(this.radius * 0.06);
    const eyeMaterial = createMaterial('#FFFFFF');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-this.radius * 0.12, this.radius * 0.05, 0.01);
    head.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(this.radius * 0.12, this.radius * 0.05, 0.01);
    head.add(rightEye);
    
    // Pupils
    const pupilGeometry = createCircleGeometry(this.radius * 0.03);
    const pupilMaterial = createMaterial('#000000');
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.01);
    leftEye.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.01);
    rightEye.add(rightPupil);
    
    // Eyebrows
    const eyebrowGeometry = new THREE.PlaneGeometry(this.radius * 0.15, this.radius * 0.03);
    const eyebrowMaterial = createMaterial('#000000');
    
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-this.radius * 0.12, this.radius * 0.12, 0.01);
    leftEyebrow.rotation.z = -0.2;
    head.add(leftEyebrow);
    
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(this.radius * 0.12, this.radius * 0.12, 0.01);
    rightEyebrow.rotation.z = 0.2;
    head.add(rightEyebrow);
    
    // Mouth (serious expression)
    const mouthGeometry = new THREE.PlaneGeometry(this.radius * 0.15, this.radius * 0.02);
    const mouthMaterial = createMaterial('#8B0000'); // Dark red
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -this.radius * 0.1, 0.01);
    head.add(mouth);
    this.bodyParts.mouth = mouth;
    
    // Traditional facial hair (thin mustache)
    const mustacheGeometry = new THREE.PlaneGeometry(this.radius * 0.25, this.radius * 0.02);
    const mustacheMaterial = createMaterial('#000000');
    const mustache = new THREE.Mesh(mustacheGeometry, mustacheMaterial);
    mustache.position.set(0, -this.radius * 0.05, 0.01);
    head.add(mustache);
  }
  
  createHat() {
    // Traditional eboshi hat
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, this.radius * 1.1, 0);
    this.mesh.add(hatGroup);
    
    // Main hat body
    const hatGeometry = new THREE.ConeGeometry(this.radius * 0.3, this.radius * 0.5, 32);
    const hatMaterial = createMaterial('#000000'); // Black
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.rotation.x = Math.PI; // Flip the cone
    hat.position.set(0, this.radius * 0.25, 0);
    hatGroup.add(hat);
    this.bodyParts.hat = hat;
    
    // Hat base
    const hatBaseGeometry = new THREE.CircleGeometry(this.radius * 0.3, 32);
    const hatBaseMaterial = createMaterial('#000000');
    const hatBase = new THREE.Mesh(hatBaseGeometry, hatBaseMaterial);
    hatBase.position.set(0, 0, 0);
    hatGroup.add(hatBase);
    
    // Decorative band
    const bandGeometry = new THREE.RingGeometry(this.radius * 0.29, this.radius * 0.31, 32);
    const bandMaterial = createMaterial('#FFD700'); // Gold
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.set(0, 0, 0.01);
    hatBase.add(band);
  }
  
  createFan() {
    // Ceremonial fan (gunbai)
    const fanGroup = new THREE.Group();
    this.bodyParts.rightHand.add(fanGroup);
    fanGroup.position.set(0, 0, 0.01);
    
    // Fan base
    const fanGeometry = new THREE.CircleGeometry(this.radius * 0.4, 32);
    const fanMaterial = createMaterial('#F5DEB3'); // Wheat color
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.scale.y = 1.5; // Make it oval
    fanGroup.add(fan);
    
    // Fan handle
    const handleGeometry = new THREE.PlaneGeometry(this.radius * 0.1, this.radius * 0.5);
    const handleMaterial = createMaterial('#8B4513'); // Brown
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -this.radius * 0.5, -0.01);
    fanGroup.add(handle);
    
    // Fan decorations
    const decorGeometry = new THREE.RingGeometry(this.radius * 0.2, this.radius * 0.38, 32);
    const decorMaterial = createMaterial('#FF0000'); // Red
    const decor = new THREE.Mesh(decorGeometry, decorMaterial);
    decor.scale.y = 1.5; // Match the oval shape
    decor.position.set(0, 0, 0.01);
    fan.add(decor);
    
    // Center symbol
    const symbolGeometry = createCircleGeometry(this.radius * 0.15);
    const symbolMaterial = createMaterial('#000000'); // Black
    const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
    symbol.position.set(0, 0, 0.01);
    fan.add(symbol);
    
    // Inner symbol
    const innerSymbolGeometry = createCircleGeometry(this.radius * 0.1);
    const innerSymbolMaterial = createMaterial('#FFFFFF'); // White
    const innerSymbol = new THREE.Mesh(innerSymbolGeometry, innerSymbolMaterial);
    innerSymbol.position.set(0, 0, 0.01);
    symbol.add(innerSymbol);
    
    // Store reference to fan for animations
    this.fanMesh = fanGroup;
    
    // Position the fan correctly in the hand
    fanGroup.position.set(this.radius * 0.2, -this.radius * 0.2, 0.01);
    fanGroup.rotation.z = -0.5; // Angle the fan
  }
  
  startIdleAnimation() {
    // Subtle idle animation
    const duration = 3000; // 3 seconds per cycle
    const startTime = Date.now();
    
    const animate = () => {
      if (this.isAnimating) return;
      
      const elapsed = Date.now() - startTime;
      const cycle = (elapsed % duration) / duration;
      
      // Subtle body sway
      if (this.bodyParts.body) {
        this.bodyParts.body.rotation.z = Math.sin(cycle * Math.PI * 2) * 0.02;
      }
      
      // Subtle head movement
      if (this.bodyParts.head) {
        this.bodyParts.head.position.y = this.radius * 0.8 + Math.sin(cycle * Math.PI * 2) * 0.02;
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  startFight() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // Store original positions/rotations
    const originalFanRotation = this.fanMesh ? this.fanMesh.rotation.z : 0;
    const originalRightArmRotation = this.bodyParts.rightArm.rotation.z;
    
    // Animation duration
    const duration = 2000; // 2 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.3) {
        // Phase 1: Raise fan
        const phase1Progress = progress / 0.3;
        if (this.fanMesh) {
          this.fanMesh.rotation.z = lerp(originalFanRotation, -1.2, easeInOut(phase1Progress));
        }
        this.bodyParts.rightArm.rotation.z = lerp(originalRightArmRotation, -0.8, easeInOut(phase1Progress));
      } else if (progress < 0.7) {
        // Phase 2: Hold fan up
        if (this.fanMesh) {
          this.fanMesh.rotation.z = -1.2;
        }
        this.bodyParts.rightArm.rotation.z = -0.8;
      } else {
        // Phase 3: Lower fan
        const phase3Progress = (progress - 0.7) / 0.3;
        if (this.fanMesh) {
          this.fanMesh.rotation.z = lerp(-1.2, originalFanRotation, easeInOut(phase3Progress));
        }
        this.bodyParts.rightArm.rotation.z = lerp(-0.8, originalRightArmRotation, easeInOut(phase3Progress));
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset
        if (this.fanMesh) {
          this.fanMesh.rotation.z = originalFanRotation;
        }
        this.bodyParts.rightArm.rotation.z = originalRightArmRotation;
        this.isAnimating = false;
      }
    };
    
    animate();
  }
  
  declareFightResult(winnerId) {
    // Referee declares the winner
    this.isAnimating = true;
    
    // Store original positions
    const originalFanRotation = this.fanMesh ? this.fanMesh.rotation.z : 0;
    const originalRightArmRotation = this.bodyParts.rightArm.rotation.z;
    const originalLeftArmRotation = this.bodyParts.leftArm.rotation.z;
    
    // Determine which side to point to (left or right)
    // In a real implementation, you'd determine this based on the winner's position
    const pointRight = Math.random() < 0.5; // For demo, randomly choose a side
    
    // Animation duration
    const duration = 2500; // 2.5 seconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.2) {
        // Phase 1: Raise both arms slightly
        const phase1Progress = progress / 0.2;
        this.bodyParts.rightArm.rotation.z = lerp(originalRightArmRotation, -0.3, easeInOut(phase1Progress));
        this.bodyParts.leftArm.rotation.z = lerp(originalLeftArmRotation, 0.3, easeInOut(phase1Progress));
      } else if (progress < 0.5) {
        // Phase 2: Point to winner
        const phase2Progress = (progress - 0.2) / 0.3;
        if (pointRight) {
          // Point right
          this.bodyParts.rightArm.rotation.z = lerp(-0.3, -1.2, easeInOut(phase2Progress));
          if (this.fanMesh) {
            this.fanMesh.rotation.z = lerp(originalFanRotation, -0.8, easeInOut(phase2Progress));
          }
        } else {
          // Point left
          this.bodyParts.leftArm.rotation.z = lerp(0.3, 1.2, easeInOut(phase2Progress));
        }
      } else if (progress < 0.8) {
        // Phase 3: Hold the pointing position
        if (pointRight) {
          this.bodyParts.rightArm.rotation.z = -1.2;
          if (this.fanMesh) {
            this.fanMesh.rotation.z = -0.8;
          }
        } else {
          this.bodyParts.leftArm.rotation.z = 1.2;
        }
      } else {
        // Phase 4: Return to normal position
        const phase4Progress = (progress - 0.8) / 0.2;
        this.bodyParts.rightArm.rotation.z = lerp(pointRight ? -1.2 : -0.3, originalRightArmRotation, easeInOut(phase4Progress));
        this.bodyParts.leftArm.rotation.z = lerp(pointRight ? 0.3 : 1.2, originalLeftArmRotation, easeInOut(phase4Progress));
        if (this.fanMesh) {
          this.fanMesh.rotation.z = lerp(pointRight ? -0.8 : originalFanRotation, originalFanRotation, easeInOut(phase4Progress));
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset
        this.bodyParts.rightArm.rotation.z = originalRightArmRotation;
        this.bodyParts.leftArm.rotation.z = originalLeftArmRotation;
        if (this.fanMesh) {
          this.fanMesh.rotation.z = originalFanRotation;
        }
        this.isAnimating = false;
      }
    };
    
    animate();
  }
  
  update() {
    // This method is called every frame
    // Any continuous animations can be updated here
  }
} 