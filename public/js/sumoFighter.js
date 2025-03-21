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
    
    this.specialMoveReady = true;
    this.specialMoveCooldown = 3000; // 3 seconds cooldown
    this.isCharging = false;
    this.isDefending = false;
    this.staggered = false;
    this.momentum = 0;
    this.maxMomentum = 5;
    this.lastMoveTime = 0;
    this.opponentId = null;
    this.techniques = {
      shove: { name: 'Oshi-dashi', power: 1.2, cooldown: 1000 },
      slap: { name: 'Harite', power: 0.8, cooldown: 500 },
      charge: { name: 'Tachi-ai', power: 2.0, cooldown: 2000 }
    };
    
    this.init();
  }
  
  init() {
    // Create main body group
    this.mesh = new THREE.Group();
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.mesh);
    
    // Create simplified sumo wrestler body
    this.createSumoBody();
    
    // Create momentum indicator
    this.createMomentumIndicator();
  }
  
  createSumoBody() {
    // Main body - large circle
    const bodyGeometry = createCircleGeometry(this.radius);
    const bodyMaterial = createMaterial(this.skinTone());
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);
    this.bodyParts.body = body;
    
    // Head - circle on top
    const headGeometry = createCircleGeometry(this.radius * 0.4);
    const headMaterial = createMaterial(this.skinTone());
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, this.radius * 0.7, 0.01);
    this.mesh.add(head);
    this.bodyParts.head = head;
    
    // Traditional sumo hair (chonmage)
    const hairGeometry = new THREE.CircleGeometry(this.radius * 0.2, 32, 0, Math.PI);
    const hairMaterial = createMaterial('#000000');
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(0, this.radius * 0.2, 0.01);
    hair.rotation.z = Math.PI;
    head.add(hair);
    this.bodyParts.hair = hair;
    
    // Eyes - simple black dots
    const eyeSize = this.radius * 0.05;
    const eyeGeometry = createCircleGeometry(eyeSize);
    const eyeMaterial = createMaterial('#000000');
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-this.radius * 0.1, 0, 0.01);
    head.add(leftEye);
    this.bodyParts.leftEye = leftEye;
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(this.radius * 0.1, 0, 0.01);
    head.add(rightEye);
    this.bodyParts.rightEye = rightEye;
    
    // Mawashi (belt/underwear) - horizontal belt and vertical strip
    this.createMawashi();
    
    // Arms - simple rectangles
    this.createArms();
    
    // Legs - simple rectangles
    this.createLegs();
  }
  
  createMawashi() {
    // Traditional mawashi colors
    const mawashiColors = ['#FFFFFF', '#000080', '#8B0000'];
    const mawashiColor = mawashiColors[Math.floor(Math.random() * mawashiColors.length)];
    const mawashiMaterial = createMaterial(mawashiColor);
    
    // Horizontal belt
    const beltWidth = this.radius * 1.8;
    const beltHeight = this.radius * 0.3;
    const beltGeometry = new THREE.PlaneGeometry(beltWidth, beltHeight);
    const belt = new THREE.Mesh(beltGeometry, mawashiMaterial);
    belt.position.set(0, -this.radius * 0.2, 0.01);
    this.mesh.add(belt);
    this.bodyParts.belt = belt;
    
    // Vertical strip down the middle
    const stripWidth = this.radius * 0.3;
    const stripHeight = this.radius * 0.6;
    const stripGeometry = new THREE.PlaneGeometry(stripWidth, stripHeight);
    const strip = new THREE.Mesh(stripGeometry, mawashiMaterial);
    strip.position.set(0, -this.radius * 0.6, 0.02); // Position below the belt
    this.mesh.add(strip);
    this.bodyParts.strip = strip;
  }
  
  createArms() {
    const armMaterial = createMaterial(this.skinTone());
    
    // Left arm - simple rectangle
    const armWidth = this.radius * 0.2;
    const armHeight = this.radius * 0.6;
    const leftArmGeometry = new THREE.PlaneGeometry(armWidth, armHeight);
    const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
    leftArm.position.set(-this.radius * 0.7, 0, 0.01);
    leftArm.rotation.z = 0.3; // Slightly outward
    this.mesh.add(leftArm);
    this.bodyParts.leftArm = leftArm;
    
    // Right arm - simple rectangle
    const rightArmGeometry = new THREE.PlaneGeometry(armWidth, armHeight);
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(this.radius * 0.7, 0, 0.01);
    rightArm.rotation.z = -0.3; // Slightly outward
    this.mesh.add(rightArm);
    this.bodyParts.rightArm = rightArm;
  }
  
  createLegs() {
    const legMaterial = createMaterial(this.skinTone());
    
    // Left leg - simple rectangle
    const legWidth = this.radius * 0.25;
    const legHeight = this.radius * 0.5;
    const leftLegGeometry = new THREE.PlaneGeometry(legWidth, legHeight);
    const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
    leftLeg.position.set(-this.radius * 0.3, -this.radius * 0.8, 0.01);
    this.mesh.add(leftLeg);
    this.bodyParts.leftLeg = leftLeg;
    
    // Right leg - simple rectangle
    const rightLegGeometry = new THREE.PlaneGeometry(legWidth, legHeight);
    const rightLeg = new THREE.Mesh(rightLegGeometry, legMaterial);
    rightLeg.position.set(this.radius * 0.3, -this.radius * 0.8, 0.01);
    this.mesh.add(rightLeg);
    this.bodyParts.rightLeg = rightLeg;
  }
  
  // Helper methods for color manipulation
  lightenColor(hex, percent) {
    return this.adjustColor(hex, percent);
  }
  
  darkenColor(hex, percent) {
    return this.adjustColor(hex, -percent);
  }
  
  adjustColor(hex, percent) {
    // Convert hex to RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Adjust color
    r = Math.min(255, Math.max(0, r + Math.floor(r * percent / 100)));
    g = Math.min(255, Math.max(0, g + Math.floor(g * percent / 100)));
    b = Math.min(255, Math.max(0, b + Math.floor(b * percent / 100)));
    
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
    
    // Update momentum bar
    this.updateMomentumBar();
    
    // Gradually decrease momentum over time
    if (this.momentum > 0 && !this.isCharging && Date.now() % 50 === 0) {
      this.momentum = Math.max(0, this.momentum - 0.01);
      this.updateMomentumBar();
    }
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
    
    // Create a red triangle above the head
    const triangleGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, -0.5, 0,    // top
      -0.3, 0, 0,   // bottom left
      0.3, 0, 0     // bottom right
    ]);
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    const triangleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFF0000,
      side: THREE.DoubleSide
    });
    
    this.highlightMesh = new THREE.Mesh(triangleGeometry, triangleMaterial);
    this.highlightMesh.position.set(0, this.radius * 2.0, 0); // Position above head
    
    // Add subtle floating animation
    this.startHighlightAnimation();
    
    this.mesh.add(this.highlightMesh);
    this.isHighlighted = true;
  }
  
  startHighlightAnimation() {
    if (!this.highlightMesh) return;
    
    const animate = () => {
      if (!this.highlightMesh || !this.isHighlighted) return;
      
      // Make the triangle float up and down slightly
      const floatOffset = Math.sin(Date.now() * 0.005) * 0.1;
      this.highlightMesh.position.y = this.radius * 2.2 + floatOffset;
      
      // Rotate the triangle slightly
      this.highlightMesh.rotation.z += 0.01;
      
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
  
  createMomentumIndicator() {
    // Create a momentum bar above the fighter
    const barWidth = this.radius * 2;
    const barHeight = 0.2;
    
    // Background bar
    const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.7
    });
    const bgBar = new THREE.Mesh(bgGeometry, bgMaterial);
    bgBar.position.set(0, this.radius * 1.5, 0.1);
    this.mesh.add(bgBar);
    this.bodyParts.momentumBarBg = bgBar;
    
    // Momentum fill bar
    const fillGeometry = new THREE.PlaneGeometry(0.001, barHeight - 0.05);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0xFF4500 }); // Orange-red
    const fillBar = new THREE.Mesh(fillGeometry, fillMaterial);
    fillBar.position.set(-barWidth/2 + 0.025, 0, 0.01);
    bgBar.add(fillBar);
    this.bodyParts.momentumBarFill = fillBar;
    
    // Hide initially
    bgBar.visible = false;
  }
  
  updateMomentumBar() {
    if (!this.bodyParts.momentumBarFill) return;
    
    const barWidth = this.radius * 2 - 0.05;
    const fillWidth = (this.momentum / this.maxMomentum) * barWidth;
    
    this.bodyParts.momentumBarFill.scale.x = fillWidth;
    this.bodyParts.momentumBarFill.position.x = -this.radius + fillWidth/2;
    
    // Show bar only during fights
    this.bodyParts.momentumBarBg.visible = this.momentum > 0;
    
    // Change color based on momentum
    if (this.momentum > this.maxMomentum * 0.7) {
      this.bodyParts.momentumBarFill.material.color.set(0xFF0000); // Red when high
    } else if (this.momentum > this.maxMomentum * 0.3) {
      this.bodyParts.momentumBarFill.material.color.set(0xFFA500); // Orange when medium
    } else {
      this.bodyParts.momentumBarFill.material.color.set(0xFFFF00); // Yellow when low
    }
  }
  
  performShove() {
    if (Date.now() - this.lastMoveTime < this.techniques.shove.cooldown) return;
    
    this.lastMoveTime = Date.now();
    const power = this.techniques.shove.power * (1 + this.momentum / this.maxMomentum);
    
    // Animation for shoving
    const duration = 500; // 0.5 seconds
    const startTime = Date.now();
    const originalArmRotations = {
      left: this.bodyParts.leftArm ? this.bodyParts.leftArm.rotation.z : 0,
      right: this.bodyParts.rightArm ? this.bodyParts.rightArm.rotation.z : 0
    };
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.3) {
        // Wind up
        if (this.bodyParts.leftArm) {
          this.bodyParts.leftArm.rotation.z = lerp(originalArmRotations.left, 0.8, easeInOut(progress / 0.3));
        }
        if (this.bodyParts.rightArm) {
          this.bodyParts.rightArm.rotation.z = lerp(originalArmRotations.right, -0.8, easeInOut(progress / 0.3));
        }
      } else if (progress < 0.6) {
        // Push forward
        if (this.bodyParts.leftArm) {
          this.bodyParts.leftArm.rotation.z = lerp(0.8, -0.2, easeInOut((progress - 0.3) / 0.3));
        }
        if (this.bodyParts.rightArm) {
          this.bodyParts.rightArm.rotation.z = lerp(-0.8, 0.2, easeInOut((progress - 0.3) / 0.3));
        }
        
        // Move body slightly forward
        this.mesh.position.x += (this.facingDirection === 'right' ? 0.1 : -0.1);
      } else {
        // Return to normal
        if (this.bodyParts.leftArm) {
          this.bodyParts.leftArm.rotation.z = lerp(-0.2, originalArmRotations.left, easeInOut((progress - 0.6) / 0.4));
        }
        if (this.bodyParts.rightArm) {
          this.bodyParts.rightArm.rotation.z = lerp(0.2, originalArmRotations.right, easeInOut((progress - 0.6) / 0.4));
        }
        
        // Move body back
        this.mesh.position.x -= (this.facingDirection === 'right' ? 0.1 : -0.1);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset
        if (this.bodyParts.leftArm) this.bodyParts.leftArm.rotation.z = originalArmRotations.left;
        if (this.bodyParts.rightArm) this.bodyParts.rightArm.rotation.z = originalArmRotations.right;
        
        // Emit the move to the server
        if (window.game && window.game.socket) {
          window.game.socket.emit('sumoTechnique', {
            technique: 'shove',
            power: power
          });
        }
        
        // Decrease momentum after use
        this.momentum = Math.max(0, this.momentum - 1);
        this.updateMomentumBar();
      }
    };
    
    animate();
  }
  
  performSlap() {
    if (Date.now() - this.lastMoveTime < this.techniques.slap.cooldown) return;
    
    this.lastMoveTime = Date.now();
    const power = this.techniques.slap.power * (1 + this.momentum / this.maxMomentum);
    
    // Animation for slapping
    const duration = 400; // 0.4 seconds
    const startTime = Date.now();
    const isRightSlap = Math.random() > 0.5; // Randomly choose right or left arm
    const arm = isRightSlap ? this.bodyParts.rightArm : this.bodyParts.leftArm;
    const originalRotation = arm ? arm.rotation.z : 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (arm) {
        if (progress < 0.4) {
          // Wind up
          arm.rotation.z = lerp(originalRotation, isRightSlap ? -1.2 : 1.2, easeInOut(progress / 0.4));
        } else if (progress < 0.6) {
          // Hold
          arm.rotation.z = isRightSlap ? -1.2 : 1.2;
        } else {
          // Return
          arm.rotation.z = lerp(isRightSlap ? -1.2 : 1.2, originalRotation, easeInOut((progress - 0.6) / 0.4));
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset
        if (arm) arm.rotation.z = originalRotation;
        
        // Emit the move to the server
        if (window.game && window.game.socket) {
          window.game.socket.emit('sumoTechnique', {
            technique: 'slap',
            power: power,
            isRightSlap: isRightSlap
          });
        }
        
        // Increase momentum slightly
        this.momentum = Math.min(this.maxMomentum, this.momentum + 0.5);
        this.updateMomentumBar();
      }
    };
    
    animate();
  }
  
  startCharge() {
    if (this.isCharging) return;
    
    this.isCharging = true;
    const chargeStartTime = Date.now();
    
    // Visual indicator for charging
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(0xFF6347); // Tomato red
    }
    
    // Charging animation - lower stance
    if (this.bodyParts.body) {
      this.bodyParts.body.position.y -= 0.2;
    }
    
    // Increase momentum while charging
    const chargeInterval = setInterval(() => {
      if (!this.isCharging) {
        clearInterval(chargeInterval);
        return;
      }
      
      this.momentum = Math.min(this.maxMomentum, this.momentum + 0.2);
      this.updateMomentumBar();
      
      // Max charge time is 3 seconds
      if (Date.now() - chargeStartTime > 3000) {
        this.releaseCharge();
        clearInterval(chargeInterval);
      }
    }, 100);
  }
  
  releaseCharge() {
    if (!this.isCharging) return;
    
    const power = this.techniques.charge.power * (1 + this.momentum / this.maxMomentum);
    this.isCharging = false;
    
    // Reset body color
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(this.color);
      this.bodyParts.body.position.y += 0.2; // Reset stance
    }
    
    // Charge forward animation
    const duration = 600; // 0.6 seconds
    const startTime = Date.now();
    const originalX = this.mesh.position.x;
    const chargeDistance = 1.5 * (this.momentum / this.maxMomentum);
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.7) {
        // Move forward quickly
        const moveX = chargeDistance * easeInOut(progress / 0.7);
        this.mesh.position.x = originalX + (this.facingDirection === 'right' ? moveX : -moveX);
      } else {
        // Slow down at the end
        const moveX = chargeDistance * (1 - easeInOut((progress - 0.7) / 0.3));
        this.mesh.position.x = originalX + (this.facingDirection === 'right' ? chargeDistance - moveX : -(chargeDistance - moveX));
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Emit the move to the server
        if (window.game && window.game.socket) {
          window.game.socket.emit('sumoTechnique', {
            technique: 'charge',
            power: power,
            distance: chargeDistance
          });
        }
        
        // Reset momentum after a charge
        this.momentum = 0;
        this.updateMomentumBar();
      }
    };
    
    animate();
  }
  
  startDefending() {
    if (this.isDefending) return;
    
    this.isDefending = true;
    
    // Visual indicator for defending
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(0x4682B4); // Steel blue
    }
    
    // Defensive stance - arms forward
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.z = 0;
    }
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.z = 0;
    }
    
    // Lower stance
    if (this.bodyParts.body) {
      this.bodyParts.body.position.y -= 0.1;
    }
    
    // Increase momentum slightly while defending
    this.momentum = Math.min(this.maxMomentum, this.momentum + 0.3);
    this.updateMomentumBar();
  }
  
  stopDefending() {
    if (!this.isDefending) return;
    
    this.isDefending = false;
    
    // Reset body color
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(this.color);
      this.bodyParts.body.position.y += 0.1; // Reset stance
    }
    
    // Reset arm positions
    if (this.bodyParts.leftArm) {
      this.bodyParts.leftArm.rotation.z = 0.3;
    }
    if (this.bodyParts.rightArm) {
      this.bodyParts.rightArm.rotation.z = -0.3;
    }
  }
  
  getStaggered() {
    if (this.staggered) return;
    
    this.staggered = true;
    
    // Visual effect for being staggered
    const originalColor = this.color;
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(0x808080); // Gray
    }
    
    // Wobble animation
    const duration = 1000; // 1 second
    const startTime = Date.now();
    const originalRotation = this.mesh.rotation.z;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Wobble back and forth
      this.mesh.rotation.z = originalRotation + Math.sin(progress * Math.PI * 6) * 0.2 * (1 - progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Reset
        this.mesh.rotation.z = originalRotation;
        if (this.bodyParts.body) {
          this.bodyParts.body.material.color.set(originalColor);
        }
        this.staggered = false;
        
        // Lose momentum when staggered
        this.momentum = Math.max(0, this.momentum - 2);
        this.updateMomentumBar();
      }
    };
    
    animate();
  }
  
  collide(intensity) {
    // Visual feedback for collision
    const flashDuration = 100; // ms
    const originalColor = this.color;
    
    // Flash the body
    if (this.bodyParts.body) {
      this.bodyParts.body.material.color.set(0xFFFFFF); // White flash
      
      // Reset color after flash
      setTimeout(() => {
        if (this.bodyParts.body) {
          this.bodyParts.body.material.color.set(originalColor);
        }
      }, flashDuration);
    }
    
    // Grunt sound effect
    if (window.game && window.game.audioContext) {
      const audioContext = window.game.audioContext;
      
      // Create noise for grunt
      const bufferSize = 4096;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Fill buffer with noise
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      // Create noise source
      const noise = audioContext.createBufferSource();
      noise.buffer = noiseBuffer;
      
      // Create filter for grunt sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      
      // Create gain node
      const gainNode = audioContext.createGain();
      gainNode.gain.value = Math.min(0.15, intensity * 0.2);
      
      // Connect nodes
      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Play grunt
      noise.start();
      
      // Quick fade out
      gainNode.gain.exponentialRampToValueAtTime(
        0.001, audioContext.currentTime + 0.3
      );
      
      // Stop after fade out
      setTimeout(() => {
        noise.stop();
      }, 300);
    }
    
    // Physical reaction - slight body rotation
    const rotationAmount = intensity * 0.2;
    const originalRotation = this.mesh.rotation.z;
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // Quick rotation
    this.mesh.rotation.z = originalRotation + (rotationAmount * direction);
    
    // Reset rotation
    setTimeout(() => {
      this.mesh.rotation.z = originalRotation;
    }, 200);
    
    // Increase momentum slightly on collision
    this.momentum = Math.min(this.maxMomentum, this.momentum + (intensity * 0.5));
    this.updateMomentumBar();
  }
  
  skinTone() {
    // Simplified skin tones
    const tones = [
      '#E8B99B', // Medium tan
      '#D2946B', // Darker tan
      '#C68642'  // Brown
    ];
    return tones[Math.floor(Math.random() * tones.length)];
  }
} 