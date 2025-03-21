class SumoFighter {
  constructor(id, position, color, scene) {
    this.id = id;
    this.position = position;
    this.color = color;
    this.scene = scene;
    this.radius = 1.2;
    this.mesh = null;
    this.nameLabel = null;
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.speed = 0.1;
    this.highlightMesh = null;
    this.isHighlighted = false;
    this.bodyParts = {};
    
    // Explicitly set facing direction based on position
    // Left fighter (negative x) faces right, right fighter (positive x) faces left
    this.facingDirection = position.x <= 0 ? 'right' : 'left';
    
    // Randomize some physical attributes for variety
    this.isTall = Math.random() > 0.5; // 50% chance of being taller
    this.isHeavy = Math.random() > 0.3; // 70% chance of being heavier
    this.hasMustache = Math.random() > 0.7; // 30% chance of having a mustache
    
    this.init();
  }
  
  init() {
    // Create main body group
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.mesh);
    
    // Create sumo wrestler body
    this.createSumoBody();
  }
  
  createSumoBody() {
    // Body (larger circle)
    const bodyGeometry = createCircleGeometry(this.radius);
    const bodyMaterial = createMaterial(this.color);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Apply size variations
    if (this.isTall) {
      body.scale.y = 1.2;
    }
    if (this.isHeavy) {
      body.scale.x = 1.3;
    }
    
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Flip the model if facing left
    if (this.facingDirection === 'left') {
      body.scale.x = -Math.abs(body.scale.x);
    }
    
    // Mawashi (sumo belt)
    this.createMawashi(body);
    
    // Head
    this.createHead(body);
    
    // Arms
    this.createArms(body);
    
    // Legs
    this.createLegs(body);
    
    // Add traditional sumo details
    this.addTraditionalDetails(body);
  }
  
  createMawashi(body) {
    // Mawashi (sumo belt)
    const mawashiGeometry = new THREE.RingGeometry(this.radius * 0.7, this.radius, 32);
    const mawashiMaterial = createMaterial('#FFFFFF'); // White belt
    const mawashi = new THREE.Mesh(mawashiGeometry, mawashiMaterial);
    mawashi.position.set(0, -0.1, 0.01);
    body.add(mawashi);
    this.bodyParts.mawashi = mawashi;
    
    // Decorative front knot
    const knotGeometry = new THREE.CircleGeometry(this.radius * 0.2, 32);
    const knotMaterial = createMaterial('#FFFFFF');
    const knot = new THREE.Mesh(knotGeometry, knotMaterial);
    knot.position.set(0, -0.5, 0.02);
    body.add(knot);
    this.bodyParts.knot = knot;
    
    // Decorative stripes on mawashi
    for (let i = 0; i < 3; i++) {
      const stripeGeometry = new THREE.PlaneGeometry(this.radius * 0.3, this.radius * 0.05);
      const stripeMaterial = createMaterial('#000080'); // Navy blue
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.set(0, -0.3 - i * 0.1, 0.03);
      knot.add(stripe);
    }
  }
  
  createHead(body) {
    // Head (smaller circle)
    const headGeometry = createCircleGeometry(this.radius * 0.5);
    const headMaterial = createMaterial(this.skinTone());
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, this.radius * 0.7, 0.02);
    body.add(head);
    this.bodyParts.head = head;
    
    // Hair (chonmage - traditional sumo hairstyle)
    this.createChonmage(head);
    
    // Face
    this.createFace(head);
  }
  
  createChonmage(head) {
    // Top knot (chonmage)
    const hairGeometry = new THREE.CircleGeometry(this.radius * 0.25, 32);
    const hairMaterial = createMaterial('#000000');
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, this.radius * 0.3, 0.01);
    head.add(hair);
    this.bodyParts.hair = hair;
    
    // Folded top part
    const topKnotGeometry = new THREE.PlaneGeometry(this.radius * 0.3, this.radius * 0.1);
    const topKnotMaterial = createMaterial('#000000');
    const topKnot = new THREE.Mesh(topKnotGeometry, topKnotMaterial);
    topKnot.position.set(0, this.radius * 0.4, 0.02);
    head.add(topKnot);
  }
  
  createFace(head) {
    // Eyes
    const eyeGeometry = createCircleGeometry(this.radius * 0.08);
    const eyeMaterial = createMaterial('#FFFFFF');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-this.radius * 0.15, this.radius * 0.05, 0.01);
    head.add(leftEye);
    this.bodyParts.leftEye = leftEye;
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(this.radius * 0.15, this.radius * 0.05, 0.01);
    head.add(rightEye);
    this.bodyParts.rightEye = rightEye;
    
    // Pupils
    const pupilGeometry = createCircleGeometry(this.radius * 0.04);
    const pupilMaterial = createMaterial('#000000');
    
    // Left pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.01);
    leftEye.add(leftPupil);
    this.bodyParts.leftPupil = leftPupil;
    
    // Right pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.01);
    rightEye.add(rightPupil);
    this.bodyParts.rightPupil = rightPupil;
    
    // Eyebrows (thicker for sumo wrestlers)
    const eyebrowGeometry = new THREE.PlaneGeometry(this.radius * 0.2, this.radius * 0.05);
    const eyebrowMaterial = createMaterial('#000000');
    
    // Left eyebrow
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-this.radius * 0.15, this.radius * 0.15, 0.01);
    leftEyebrow.rotation.z = -0.2;
    head.add(leftEyebrow);
    
    // Right eyebrow
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(this.radius * 0.15, this.radius * 0.15, 0.01);
    rightEyebrow.rotation.z = 0.2;
    head.add(rightEyebrow);
    
    // Mouth (determined expression)
    const mouthGeometry = new THREE.PlaneGeometry(this.radius * 0.2, this.radius * 0.03);
    const mouthMaterial = createMaterial('#8B0000'); // Dark red
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -this.radius * 0.15, 0.01);
    head.add(mouth);
    this.bodyParts.mouth = mouth;
    
    // Add mustache if applicable
    if (this.hasMustache) {
      const mustacheGeometry = new THREE.PlaneGeometry(this.radius * 0.3, this.radius * 0.05);
      const mustacheMaterial = createMaterial('#000000');
      const mustache = new THREE.Mesh(mustacheGeometry, mustacheMaterial);
      mustache.position.set(0, -this.radius * 0.1, 0.01);
      head.add(mustache);
    }
    
    // Add sumo-style cheek lines
    const cheekLineGeometry = new THREE.PlaneGeometry(this.radius * 0.15, this.radius * 0.02);
    const cheekLineMaterial = createMaterial('#8B0000'); // Dark red
    
    // Left cheek line
    const leftCheekLine = new THREE.Mesh(cheekLineGeometry, cheekLineMaterial);
    leftCheekLine.position.set(-this.radius * 0.2, -this.radius * 0.05, 0.01);
    leftCheekLine.rotation.z = 0.3;
    head.add(leftCheekLine);
    
    // Right cheek line
    const rightCheekLine = new THREE.Mesh(cheekLineGeometry, cheekLineMaterial);
    rightCheekLine.position.set(this.radius * 0.2, -this.radius * 0.05, 0.01);
    rightCheekLine.rotation.z = -0.3;
    head.add(rightCheekLine);
  }
  
  createArms(body) {
    // Arms (thicker for sumo wrestlers)
    const armGeometry = new THREE.PlaneGeometry(this.radius * 0.3, this.radius * 0.8);
    const armMaterial = createMaterial(this.skinTone());
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-this.radius * 0.8, this.radius * 0.1, 0.01);
    leftArm.rotation.z = 0.3;
    body.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(this.radius * 0.8, this.radius * 0.1, 0.01);
    rightArm.rotation.z = -0.3;
    body.add(rightArm);
    this.bodyParts.rightArm = rightArm;
    
    // Hands
    const handGeometry = createCircleGeometry(this.radius * 0.15);
    const handMaterial = createMaterial(this.skinTone());
    
    // Left hand
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-this.radius * 0.1, -this.radius * 0.4, 0.01);
    leftArm.add(leftHand);
    
    // Right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(this.radius * 0.1, -this.radius * 0.4, 0.01);
    rightArm.add(rightHand);
  }
  
  createLegs(body) {
    // Legs (thicker for sumo wrestlers)
    const legGeometry = new THREE.PlaneGeometry(this.radius * 0.4, this.radius * 0.6);
    const legMaterial = createMaterial(this.skinTone());
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-this.radius * 0.3, -this.radius * 0.8, 0.01);
    body.add(leftLeg);
    this.bodyParts.leftLeg = leftLeg;
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(this.radius * 0.3, -this.radius * 0.8, 0.01);
    body.add(rightLeg);
    this.bodyParts.rightLeg = rightLeg;
    
    // Feet
    const footGeometry = createCircleGeometry(this.radius * 0.2);
    const footMaterial = createMaterial(this.skinTone());
    
    // Left foot
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0, -this.radius * 0.3, 0.01);
    leftFoot.scale.y = 0.5; // Make it oval
    leftLeg.add(leftFoot);
    
    // Right foot
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(0, -this.radius * 0.3, 0.01);
    rightFoot.scale.y = 0.5; // Make it oval
    rightLeg.add(rightFoot);
  }
  
  addTraditionalDetails(body) {
    // Add sagari (decorative rope hanging from mawashi)
    this.createSagari(body);
    
    // Add muscle definition
    this.addMuscleDefinition(body);
  }
  
  createSagari(body) {
    // Create sagari (hanging ropes from the mawashi)
    const sagariCount = 5;
    const sagariWidth = this.radius * 0.05;
    const sagariHeight = this.radius * 0.4;
    
    for (let i = 0; i < sagariCount; i++) {
      const sagariGeometry = new THREE.PlaneGeometry(sagariWidth, sagariHeight);
      const sagariMaterial = createMaterial('#FFFFFF');
      const sagari = new THREE.Mesh(sagariGeometry, sagariMaterial);
      
      // Position around the front of the mawashi
      const angle = (i - (sagariCount - 1) / 2) * 0.2;
      const x = Math.sin(angle) * this.radius * 0.7;
      sagari.position.set(x, -this.radius * 0.6, 0.02);
      body.add(sagari);
      
      // Add slight swing animation
      this.animateSagari(sagari, i);
    }
  }
  
  animateSagari(sagari, index) {
    const animate = () => {
      const time = Date.now() * 0.001 + index * 0.5;
      sagari.rotation.z = Math.sin(time) * 0.1;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  addMuscleDefinition(body) {
    // Add chest muscle definition
    const chestLineGeometry = new THREE.PlaneGeometry(this.radius * 0.8, this.radius * 0.05);
    const chestLineMaterial = createMaterial(this.darkenColor(this.color, 20));
    const chestLine = new THREE.Mesh(chestLineGeometry, chestLineMaterial);
    chestLine.position.set(0, this.radius * 0.3, 0.01);
    body.add(chestLine);
    
    // Add abdominal muscle definition
    for (let i = 0; i < 3; i++) {
      const abLineGeometry = new THREE.PlaneGeometry(this.radius * 0.6, this.radius * 0.03);
      const abLineMaterial = createMaterial(this.darkenColor(this.color, 20));
      const abLine = new THREE.Mesh(abLineGeometry, abLineMaterial);
      abLine.position.set(0, this.radius * 0.1 - i * this.radius * 0.2, 0.01);
      body.add(abLine);
    }
  }
  
  skinTone() {
    // Return a skin tone color slightly darker than the body color
    return this.darkenColor(this.color, 10);
  }
  
  darkenColor(hex, percent) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Darken
    r = Math.max(0, r - percent);
    g = Math.max(0, g - percent);
    b = Math.max(0, b - percent);
    
    // Convert back to hex
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  
  setPosition(position) {
    this.position = position;
    this.mesh.position.set(position.x, position.y, position.z);
  }
  
  startMoving(direction) {
    if (direction === 'left') {
      this.isMovingLeft = true;
      this.animateMoving('left');
    } else if (direction === 'right') {
      this.isMovingRight = true;
      this.animateMoving('right');
    }
  }
  
  stopMoving(direction) {
    if (direction === 'left') {
      this.isMovingLeft = false;
    } else if (direction === 'right') {
      this.isMovingRight = false;
    }
    
    // Reset animation if not moving in any direction
    if (!this.isMovingLeft && !this.isMovingRight) {
      this.resetMovingAnimation();
    }
  }
  
  animateMoving(direction) {
    // Animate the sumo wrestler moving
    // Slight body tilt in the direction of movement
    const body = this.bodyParts.body;
    if (!body) return;
    
    const targetRotation = direction === 'left' ? 0.1 : -0.1;
    
    // Animate legs for walking
    this.animateLegsWalking();
    
    // Tilt body
    const animate = () => {
      if ((direction === 'left' && this.isMovingLeft) || 
          (direction === 'right' && this.isMovingRight)) {
        
        body.rotation.z = lerp(body.rotation.z, targetRotation, 0.1);
        
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  animateLegsWalking() {
    if (!this.bodyParts.leftLeg || !this.bodyParts.rightLeg) return;
    
    const leftLeg = this.bodyParts.leftLeg;
    const rightLeg = this.bodyParts.rightLeg;
    const originalLeftPos = leftLeg.position.y;
    const originalRightPos = rightLeg.position.y;
    
    const animate = () => {
      if (this.isMovingLeft || this.isMovingRight) {
        const time = Date.now() * 0.01;
        
        // Alternate leg movements
        leftLeg.position.y = originalLeftPos + Math.sin(time) * 0.1;
        rightLeg.position.y = originalRightPos + Math.sin(time + Math.PI) * 0.1;
        
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  resetMovingAnimation() {
    const body = this.bodyParts.body;
    if (!body) return;
    
    // Reset body rotation
    const animate = () => {
      if (!this.isMovingLeft && !this.isMovingRight) {
        body.rotation.z = lerp(body.rotation.z, 0, 0.1);
        
        if (Math.abs(body.rotation.z) < 0.01) {
          body.rotation.z = 0;
          return;
        }
        
        requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    // Reset leg positions
    if (this.bodyParts.leftLeg && this.bodyParts.rightLeg) {
      const leftLeg = this.bodyParts.leftLeg;
      const rightLeg = this.bodyParts.rightLeg;
      
      leftLeg.position.y = -this.radius * 0.8;
      rightLeg.position.y = -this.radius * 0.8;
    }
  }
  
  update() {
    // Update eyes to look in the direction of movement
    this.updateEyes();
  }
  
  updateEyes() {
    if (!this.bodyParts.leftPupil || !this.bodyParts.rightPupil) return;
    
    const leftPupil = this.bodyParts.leftPupil;
    const rightPupil = this.bodyParts.rightPupil;
    
    if (this.isMovingLeft) {
      leftPupil.position.x = -0.02;
      rightPupil.position.x = -0.02;
    } else if (this.isMovingRight) {
      leftPupil.position.x = 0.02;
      rightPupil.position.x = 0.02;
    } else {
      leftPupil.position.x = 0;
      rightPupil.position.x = 0;
    }
  }
  
  celebrate() {
    // Victory celebration animation
    if (!this.bodyParts.body) return;
    
    const body = this.bodyParts.body;
    const leftArm = this.bodyParts.leftArm;
    const rightArm = this.bodyParts.rightArm;
    const mouth = this.bodyParts.mouth;
    
    const originalY = this.mesh.position.y;
    const jumpHeight = 1;
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Jump up and down
      const jumpProgress = easeInOut(progress);
      this.mesh.position.y = originalY + jumpHeight * Math.sin(jumpProgress * Math.PI);
      
      // Raise arms
      if (leftArm) {
        leftArm.rotation.z = lerp(0.3, -0.5, easeInOut(progress));
      }
      if (rightArm) {
        rightArm.rotation.z = lerp(-0.3, 0.5, easeInOut(progress));
      }
      
      // Change facial expression to happy
      if (mouth) {
        // Make mouth curve upward for a smile
        mouth.scale.y = 1 + progress;
        mouth.position.y = -this.radius * 0.15 - progress * 0.05;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset after celebration
        setTimeout(() => {
          this.mesh.position.y = originalY;
          if (leftArm) leftArm.rotation.z = 0.3;
          if (rightArm) rightArm.rotation.z = -0.3;
          if (mouth) {
            mouth.scale.y = 1;
            mouth.position.y = -this.radius * 0.15;
          }
        }, 500);
      }
    };
    
    animate();
  }
  
  highlight() {
    if (this.isHighlighted) return;
    
    // Create a slightly larger circle behind the fighter for the highlight effect
    const highlightGeometry = createCircleGeometry(this.radius + 0.3);
    const highlightMaterial = createMaterial('#ffff00'); // Yellow highlight
    highlightMaterial.transparent = true;
    highlightMaterial.opacity = 0.6;
    
    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.position.set(0, 0, -0.1); // Behind the fighter
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
  }
} 