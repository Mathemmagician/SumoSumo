class SumoFighter {
  constructor(id, position, color, scene) {
    this.id = id;
    this.position = position;
    this.color = color;
    this.scene = scene;
    this.radius = 1;
    this.mesh = null;
    this.nameLabel = null;
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.speed = 0.1;
    this.highlightMesh = null;
    this.isHighlighted = false;
    this.bodyParts = {};
    
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
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Mawashi (sumo belt)
    const mawashiGeometry = new THREE.RingGeometry(0.7, 0.9, 32);
    const mawashiMaterial = createMaterial('#FFFFFF'); // White belt
    const mawashi = new THREE.Mesh(mawashiGeometry, mawashiMaterial);
    mawashi.position.set(0, -0.1, 0.01);
    this.mesh.add(mawashi);
    this.bodyParts.mawashi = mawashi;
    
    // Head (smaller circle)
    const headGeometry = createCircleGeometry(0.5);
    const headMaterial = createMaterial(this.color);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 0.3, 0.02);
    this.mesh.add(head);
    this.bodyParts.head = head;
    
    // Hair (chonmage - traditional sumo hairstyle)
    const hairGeometry = new THREE.CircleGeometry(0.25, 32);
    const hairMaterial = createMaterial('#000000');
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, 0.6, 0.03);
    this.mesh.add(hair);
    this.bodyParts.hair = hair;
    
    // Face
    this.createFace(head);
    
    // Arms
    this.createArms();
    
    // Legs
    this.createLegs();
  }
  
  createFace(head) {
    // Eyes
    const eyeGeometry = createCircleGeometry(0.1);
    const eyeMaterial = createMaterial('#FFFFFF');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 0.05, 0.01);
    head.add(leftEye);
    this.bodyParts.leftEye = leftEye;
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 0.05, 0.01);
    head.add(rightEye);
    this.bodyParts.rightEye = rightEye;
    
    // Pupils
    const pupilGeometry = createCircleGeometry(0.05);
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
    
    // Eyebrows (showing determination)
    const eyebrowGeometry = new THREE.PlaneGeometry(0.15, 0.03);
    const eyebrowMaterial = createMaterial('#000000');
    
    // Left eyebrow
    const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    leftEyebrow.position.set(-0.15, 0.15, 0.01);
    leftEyebrow.rotation.z = -0.2;
    head.add(leftEyebrow);
    this.bodyParts.leftEyebrow = leftEyebrow;
    
    // Right eyebrow
    const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
    rightEyebrow.position.set(0.15, 0.15, 0.01);
    rightEyebrow.rotation.z = 0.2;
    head.add(rightEyebrow);
    this.bodyParts.rightEyebrow = rightEyebrow;
    
    // Mouth (determined expression)
    const mouthGeometry = new THREE.PlaneGeometry(0.2, 0.03);
    const mouthMaterial = createMaterial('#000000');
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.15, 0.01);
    head.add(mouth);
    this.bodyParts.mouth = mouth;
  }
  
  createArms() {
    // Arms (slightly curved rectangles)
    const armGeometry = new THREE.PlaneGeometry(0.2, 0.6);
    const armMaterial = createMaterial(this.color);
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 0, 0.01);
    leftArm.rotation.z = 0.3;
    this.mesh.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 0, 0.01);
    rightArm.rotation.z = -0.3;
    this.mesh.add(rightArm);
    this.bodyParts.rightArm = rightArm;
  }
  
  createLegs() {
    // Legs (short and stout)
    const legGeometry = new THREE.PlaneGeometry(0.3, 0.4);
    const legMaterial = createMaterial(this.color);
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.3, -0.8, 0.01);
    this.mesh.add(leftLeg);
    this.bodyParts.leftLeg = leftLeg;
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.3, -0.8, 0.01);
    this.mesh.add(rightLeg);
    this.bodyParts.rightLeg = rightLeg;
  }
  
  update() {
    // Handle movement
    if (this.isMovingLeft) {
      this.position.x -= this.speed;
      this.animateMovement('left');
    } else if (this.isMovingRight) {
      this.position.x += this.speed;
      this.animateMovement('right');
    } else {
      this.resetMovementAnimation();
    }
    
    // Update mesh position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
  }
  
  animateMovement(direction) {
    // Animate arms and legs while moving
    const time = Date.now() * 0.005;
    const swingAmount = 0.1;
    
    if (direction === 'left') {
      // Lean slightly in the direction of movement
      this.mesh.rotation.z = 0.1;
      
      // Swing arms and legs
      if (this.bodyParts.leftArm) {
        this.bodyParts.leftArm.rotation.z = 0.3 + Math.sin(time) * swingAmount;
      }
      if (this.bodyParts.rightArm) {
        this.bodyParts.rightArm.rotation.z = -0.3 + Math.sin(time) * swingAmount;
      }
    } else if (direction === 'right') {
      // Lean slightly in the direction of movement
      this.mesh.rotation.z = -0.1;
      
      // Swing arms and legs
      if (this.bodyParts.leftArm) {
        this.bodyParts.leftArm.rotation.z = 0.3 + Math.sin(time) * swingAmount;
      }
      if (this.bodyParts.rightArm) {
        this.bodyParts.rightArm.rotation.z = -0.3 + Math.sin(time) * swingAmount;
      }
    }
  }
  
  resetMovementAnimation() {
    // Reset to neutral stance
    this.mesh.rotation.z = 0;
    
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.z = 0.3;
    }
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.z = -0.3;
    }
  }
  
  startMoving(direction) {
    if (direction === 'left') {
      this.isMovingLeft = true;
    } else if (direction === 'right') {
      this.isMovingRight = true;
    }
  }
  
  stopMoving(direction) {
    if (direction === 'left') {
      this.isMovingLeft = false;
    } else if (direction === 'right') {
      this.isMovingRight = false;
    }
  }
  
  setPosition(position) {
    this.position = position;
    this.mesh.position.set(position.x, position.y, position.z);
  }
  
  celebrate() {
    // Victory animation
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Jump up and down
      const jumpHeight = Math.sin(progress * Math.PI) * 0.5;
      this.mesh.position.y = this.position.y + jumpHeight;
      
      // Raise arms
      if (this.bodyParts.leftArm) {
        this.bodyParts.leftArm.rotation.z = lerp(0.3, -0.5, easeInOut(progress));
      }
      if (this.bodyParts.rightArm) {
        this.bodyParts.rightArm.rotation.z = lerp(-0.3, 0.5, easeInOut(progress));
      }
      
      // Change facial expression to happy
      if (this.bodyParts.mouth) {
        // Make mouth curve upward for a smile
        this.bodyParts.mouth.scale.y = 1 + progress;
        this.bodyParts.mouth.position.y = -0.15 - progress * 0.05;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset after celebration
        setTimeout(() => {
          this.mesh.position.y = this.position.y;
          if (this.bodyParts.leftArm) this.bodyParts.leftArm.rotation.z = 0.3;
          if (this.bodyParts.rightArm) this.bodyParts.rightArm.rotation.z = -0.3;
          if (this.bodyParts.mouth) {
            this.bodyParts.mouth.scale.y = 1;
            this.bodyParts.mouth.position.y = -0.15;
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