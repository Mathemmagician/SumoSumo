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
    
    this.init();
  }
  
  init() {
    // Create viewer geometry and mesh
    const geometry = createCircleGeometry(this.radius);
    const material = createMaterial(this.color);
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Set initial position
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create a simple face for the viewer
    this.createFace();
  }
  
  createFace() {
    // Create eyes
    const eyeGeometry = createCircleGeometry(0.15);
    const eyeMaterial = createMaterial('#ffffff');
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.25, 0.1, 0.1);
    this.mesh.add(leftEye);
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.25, 0.1, 0.1);
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
    
    // Mouth (neutral)
    const mouthGeometry = new THREE.BufferGeometry();
    const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    
    const points = [
      new THREE.Vector3(-0.2, -0.2, 0.1),
      new THREE.Vector3(0.2, -0.2, 0.1)
    ];
    
    mouthGeometry.setFromPoints(points);
    const mouth = new THREE.Line(mouthGeometry, mouthMaterial);
    this.mesh.add(mouth);
  }
  
  emote(emoteType) {
    // Create an emote bubble
    let emoteText = '';
    
    switch (emoteType) {
      case 'cheer':
        emoteText = '🎉';
        break;
      case 'laugh':
        emoteText = '😂';
        break;
      case 'wow':
        emoteText = '😮';
        break;
      case 'clap':
        emoteText = '👏';
        break;
      case 'heart':
        emoteText = '❤️';
        break;
      default:
        emoteText = '👍';
    }
    
    const bubble = createEmoteBubble(emoteText, this.container);
    positionBubbleAt3DPoint(bubble, {
      x: this.position.x,
      y: this.position.y + 1.5,
      z: this.position.z
    }, this.camera, this.container);
    
    // Also do a small animation
    const initialScale = { x: 1, y: 1, z: 1 };
    const targetScale = { x: 1.2, y: 1.2, z: 1.2 };
    
    // Scale up
    const scaleUp = () => {
      let t = 0;
      const animate = () => {
        t += 0.1;
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
        t += 0.1;
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
  
  update() {
    // Any continuous updates for the viewer
  }
  
  remove() {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }
  }
} 