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
    
    this.init();
  }
  
  init() {
    // Create fighter geometry and mesh
    const geometry = createCircleGeometry(this.radius);
    const material = createMaterial(this.color);
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create a simple face for the sumo fighter
    this.createFace();
  }
  
  createFace() {
    // Create eyes
    const eyeGeometry = createCircleGeometry(0.2);
    const eyeMaterial = createMaterial('#ffffff');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.2, 0.1);
    this.mesh.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.2, 0.1);
    this.mesh.add(rightEye);
    
    // Pupils
    const pupilGeometry = createCircleGeometry(0.1);
    const pupilMaterial = createMaterial('#000000');
    
    // Left pupil
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(0, 0, 0.1);
    leftEye.add(leftPupil);
    
    // Right pupil
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0, 0, 0.1);
    rightEye.add(rightPupil);
    
    // Mouth
    const mouthGeometry = new THREE.RingGeometry(0.2, 0.3, 32, 1, 0, Math.PI);
    const mouthMaterial = createMaterial('#000000');
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.3, 0.1);
    mouth.rotation.z = Math.PI;
    this.mesh.add(mouth);
  }
  
  update() {
    // Handle movement
    if (this.isMovingLeft) {
      this.position.x -= this.speed;
    }
    
    if (this.isMovingRight) {
      this.position.x += this.speed;
    }
    
    // Update mesh position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
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
    // Simple celebration animation
    const initialScale = { x: 1, y: 1, z: 1 };
    const targetScale = { x: 1.3, y: 1.3, z: 1.3 };
    
    // Scale up
    const scaleUp = () => {
      let t = 0;
      const animate = () => {
        t += 0.05;
        if (t <= 1) {
          const scale = easeInOut(t);
          this.mesh.scale.set(
            lerp(initialScale.x, targetScale.x, scale),
            lerp(initialScale.y, targetScale.y, scale),
            lerp(initialScale.z, targetScale.z, scale)
          );
          requestAnimationFrame(animate);
        } else {
          // Scale back down
          scaleDown();
        }
      };
      animate();
    };
    
    // Scale down
    const scaleDown = () => {
      let t = 0;
      const animate = () => {
        t += 0.05;
        if (t <= 1) {
          const scale = easeInOut(t);
          this.mesh.scale.set(
            lerp(targetScale.x, initialScale.x, scale),
            lerp(targetScale.y, initialScale.y, scale),
            lerp(targetScale.z, initialScale.z, scale)
          );
          requestAnimationFrame(animate);
        }
      };
      animate();
    };
    
    scaleUp();
  }
  
  highlight() {
    if (this.isHighlighted) return;
    
    // Create a slightly larger circle behind the fighter for the highlight effect
    const highlightGeometry = createCircleGeometry(this.radius + 0.2);
    const highlightMaterial = createMaterial('#ffff00'); // Yellow highlight
    highlightMaterial.transparent = true;
    highlightMaterial.opacity = 0.6;
    
    this.highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    this.highlightMesh.position.set(0, 0, -0.05); // Slightly behind the fighter
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