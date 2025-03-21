class Referee {
  constructor(position, scene) {
    this.position = position;
    this.scene = scene;
    this.mesh = null;
    this.bodyParts = {};
    this.fanMesh = null;
    this.isAnimating = false;
    
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
    // Body base
    const bodyGeometry = createCircleGeometry(1);
    const bodyMaterial = createMaterial('#8A2BE2'); // Traditional purple/blue color
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Traditional robe (kariginu)
    const robeGeometry = new THREE.RingGeometry(0.8, 1, 32);
    const robeMaterial = createMaterial('#4B0082'); // Indigo
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.set(0, 0, 0.01);
    body.add(robe);
    this.bodyParts.robe = robe;
    
    // Ceremonial apron (keshō-mawashi)
    const apronGeometry = new THREE.PlaneGeometry(1.5, 0.8);
    const apronMaterial = createMaterial('#FFD700'); // Gold
    const apron = new THREE.Mesh(apronGeometry, apronMaterial);
    apron.position.set(0, -0.5, 0.02);
    body.add(apron);
    this.bodyParts.apron = apron;
    
    // Decorative pattern on apron
    this.addApronDecoration(apron);
    
    // Arms
    this.createArms(body);
    
    // Legs
    this.createLegs(body);
  }
  
  addApronDecoration(apron) {
    // Add decorative embroidery to the apron
    const decorGeometry = new THREE.CircleGeometry(0.2, 32);
    const decorMaterial = createMaterial('#FF0000'); // Red
    const decoration = new THREE.Mesh(decorGeometry, decorMaterial);
    decoration.position.set(0, 0, 0.01);
    apron.add(decoration);
    
    // Add pattern lines
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.PlaneGeometry(0.8, 0.03);
      const lineMaterial = createMaterial('#000000');
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(0, 0.2 - i * 0.2, 0.01);
      apron.add(line);
    }
  }
  
  createArms(body) {
    // Left arm
    const leftArmGeometry = new THREE.PlaneGeometry(0.25, 0.7);
    const armMaterial = createMaterial('#8A2BE2'); // Match body color
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-0.8, 0, 0.01);
    body.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm
    const rightArmGeometry = new THREE.PlaneGeometry(0.25, 0.7);
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(0.8, 0, 0.01);
    body.add(rightArm);
    this.bodyParts.rightArm = rightArm;
    
    // Hands
    const handGeometry = createCircleGeometry(0.15);
    const handMaterial = createMaterial('#FFE4C4'); // Bisque color for skin
    
    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0, -0.4, 0.01);
    leftArm.add(leftHand);
    this.bodyParts.leftHand = leftHand;
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0, -0.4, 0.01);
    rightArm.add(rightHand);
    this.bodyParts.rightHand = rightHand;
    
    // Sleeve decorations
    const sleeveDecorGeometry = new THREE.RingGeometry(0.12, 0.25, 32);
    const sleeveDecorMaterial = createMaterial('#FFD700'); // Gold
    
    const leftSleeveDeco = new THREE.Mesh(sleeveDecorGeometry, sleeveDecorMaterial);
    leftSleeveDeco.position.set(0, -0.3, 0.005);
    leftArm.add(leftSleeveDeco);
    
    const rightSleeveDeco = new THREE.Mesh(sleeveDecorGeometry, sleeveDecorMaterial);
    rightSleeveDeco.position.set(0, -0.3, 0.005);
    rightArm.add(rightSleeveDeco);
  }
  
  createLegs(body) {
    // Legs (mostly hidden by the robe)
    const legGeometry = new THREE.PlaneGeometry(0.3, 0.4);
    const legMaterial = createMaterial('#4B0082'); // Indigo
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.9, 0);
    body.add(leftLeg);
    this.bodyParts.leftLeg = leftLeg;
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.9, 0);
    body.add(rightLeg);
    this.bodyParts.rightLeg = rightLeg;
    
    // Traditional tabi socks and sandals
    this.createFootwear(leftLeg, rightLeg);
  }
  
  createFootwear(leftLeg, rightLeg) {
    // Tabi socks (white split-toe socks)
    const sockGeometry = createCircleGeometry(0.15);
    const sockMaterial = createMaterial('#FFFFFF');
    
    const leftSock = new THREE.Mesh(sockGeometry, sockMaterial);
    leftSock.position.set(0, -0.25, 0.01);
    leftLeg.add(leftSock);
    
    const rightSock = new THREE.Mesh(sockGeometry, sockMaterial);
    rightSock.position.set(0, -0.25, 0.01);
    rightLeg.add(rightSock);
    
    // Sandals (zori)
    const sandalGeometry = new THREE.PlaneGeometry(0.25, 0.1);
    const sandalMaterial = createMaterial('#8B4513'); // Brown
    
    const leftSandal = new THREE.Mesh(sandalGeometry, sandalMaterial);
    leftSandal.position.set(0, -0.25, 0.02);
    leftSock.add(leftSandal);
    
    const rightSandal = new THREE.Mesh(sandalGeometry, sandalMaterial);
    rightSandal.position.set(0, -0.25, 0.02);
    rightSock.add(rightSandal);
  }
  
  createHead() {
    // Head
    const headGeometry = createCircleGeometry(0.5);
    const headMaterial = createMaterial('#FFE4C4'); // Bisque color for skin
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.9, 0.01);
    this.mesh.add(head);
    this.bodyParts.head = head;
    
    // Face
    this.createFace(head);
  }
  
  createFace(head) {
    // Eyes
    const eyeGeometry = createCircleGeometry(0.08);
    const eyeMaterial = createMaterial('#FFFFFF');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.05, 0.01);
    head.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.05, 0.01);
    head.add(rightEye);
    
    // Pupils
    const pupilGeometry = createCircleGeometry(0.04);
    const pupilMaterial = createMaterial('#000000');
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.01);
    leftEye.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.01);
    rightEye.add(rightPupil);
    
    // Eyebrows (showing seriousness)
    const eyebrowGeometry = new THREE.PlaneGeometry(0.15, 0.03);
    const eyebrowMaterial = createMaterial('#000000');
    
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.15, 0.15, 0.01);
    leftEyebrow.rotation.z = 0.1;
    head.add(leftEyebrow);
    
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.15, 0.15, 0.01);
    rightEyebrow.rotation.z = -0.1;
    head.add(rightEyebrow);
    
    // Mouth (serious expression)
    const mouthGeometry = new THREE.PlaneGeometry(0.2, 0.03);
    const mouthMaterial = createMaterial('#000000');
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.15, 0.01);
    head.add(mouth);
    this.bodyParts.mouth = mouth;
    
    // Traditional facial hair (small mustache and beard)
    this.createFacialHair(head);
  }
  
  createFacialHair(head) {
    // Mustache
    const mustacheGeometry = new THREE.PlaneGeometry(0.3, 0.05);
    const hairMaterial = createMaterial('#000000');
    const mustache = new THREE.Mesh(mustacheGeometry, hairMaterial);
    mustache.position.set(0, -0.08, 0.01);
    mustache.scale.set(1, 0.7, 1);
    head.add(mustache);
    
    // Small beard
    const beardGeometry = createCircleGeometry(0.1);
    const beard = new THREE.Mesh(beardGeometry, hairMaterial);
    beard.position.set(0, -0.25, 0.01);
    beard.scale.set(1, 0.7, 1);
    head.add(beard);
  }
  
  createHat() {
    // Traditional eboshi hat
    const hatGeometry = new THREE.ConeGeometry(0.4, 0.6, 32);
    const hatMaterial = createMaterial('#000000');
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    
    // Position and rotate the hat
    hat.position.set(0, 1.3, 0);
    hat.rotation.x = -0.2; // Tilt forward slightly
    this.mesh.add(hat);
    this.bodyParts.hat = hat;
    
    // Hat band
    const bandGeometry = new THREE.RingGeometry(0.4, 0.42, 32);
    const bandMaterial = createMaterial('#FFD700'); // Gold
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.set(0, -0.2, 0);
    band.rotation.x = Math.PI / 2;
    hat.add(band);
  }
  
  createFan() {
    // Ceremonial fan (gunbai) - used to signal decisions
    const fanGroup = new THREE.Group();
    
    // Fan base
    const fanGeometry = new THREE.CircleGeometry(0.4, 32);
    const fanMaterial = createMaterial('#FFFFFF');
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.scale.set(1, 1.5, 1); // Make it oval
    fanGroup.add(fan);
    
    // Fan handle
    const handleGeometry = new THREE.PlaneGeometry(0.1, 0.5);
    const handleMaterial = createMaterial('#8B4513'); // Brown
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.7, -0.01);
    fanGroup.add(handle);
    
    // Fan decorations
    const decorGeometry = new THREE.PlaneGeometry(0.6, 0.05);
    const decorMaterial = createMaterial('#FF0000'); // Red
    
    // Add decorative lines
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(decorGeometry, decorMaterial);
      line.position.set(0, 0.1 - i * 0.2, 0.01);
      fan.add(line);
    }
    
    // Position the fan in the right hand
    fanGroup.position.set(0, -0.4, 0.02);
    fanGroup.rotation.z = -0.3;
    this.bodyParts.rightArm.add(fanGroup);
    
    this.fanMesh = fanGroup;
  }
  
  startIdleAnimation() {
    // Subtle idle animation
    const animate = () => {
      if (!this.isAnimating) {
        const time = Date.now() * 0.001;
        
        // Subtle body sway
        this.mesh.rotation.z = Math.sin(time * 0.5) * 0.02;
        
        // Subtle fan movement
        if (this.fanMesh) {
          this.fanMesh.rotation.z = -0.3 + Math.sin(time * 0.7) * 0.05;
        }
      }
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  startFight() {
    // Referee announces the start of the fight
    this.isAnimating = true;
    
    // Store original positions
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