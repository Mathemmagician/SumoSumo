class Referee {
  constructor(position, scene) {
    this.position = position;
    this.scene = scene;
    this.mesh = null;
    this.radius = 0.7;
    
    this.init();
  }
  
  init() {
    // Create referee geometry and mesh
    const geometry = createCircleGeometry(this.radius);
    const material = createMaterial('#ffcc00'); // Yellow color for referee
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create a face for the referee
    this.createFace();
  }
  
  createFace() {
    // Create eyes
    const eyeGeometry = createCircleGeometry(0.15);
    const eyeMaterial = createMaterial('#ffffff');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 0.1, 0.1);
    this.mesh.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 0.1, 0.1);
    this.mesh.add(rightEye);
    
    // Pupils
    const pupilGeometry = createCircleGeometry(0.07);
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
    const mouthGeometry = new THREE.RingGeometry(0.15, 0.2, 32, 1, 0, Math.PI);
    const mouthMaterial = createMaterial('#000000');
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -0.2, 0.1);
    this.mesh.add(mouth);
    
    // Referee hat
    const hatGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.1);
    const hatMaterial = createMaterial('#000000');
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.set(0, 0.5, 0);
    this.mesh.add(hat);
  }
  
  startFight() {
    // Animation for starting the fight
    const initialY = this.position.y;
    const jumpHeight = 1;
    
    // Jump up
    const jumpUp = () => {
      let t = 0;
      const animate = () => {
        t += 0.05;
        if (t <= 1) {
          const y = initialY + jumpHeight * Math.sin(Math.PI * t);
          this.mesh.position.y = y;
          requestAnimationFrame(animate);
        } else {
          // Return to original position
          this.mesh.position.y = initialY;
        }
      };
      animate();
    };
    
    jumpUp();
  }
  
  declareFightResult(winnerId) {
    // Animation for declaring the winner
    const initialRotation = this.mesh.rotation.z;
    const rotations = 2; // Number of full rotations
    
    const rotate = () => {
      let t = 0;
      const animate = () => {
        t += 0.02;
        if (t <= 1) {
          this.mesh.rotation.z = initialRotation + rotations * Math.PI * 2 * t;
          requestAnimationFrame(animate);
        } else {
          this.mesh.rotation.z = initialRotation;
        }
      };
      animate();
    };
    
    rotate();
  }
  
  update() {
    // Any continuous updates for the referee
  }
} 