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
    
    // Make pupils look toward the center (where the fight happens)
    this.updatePupilsLookDirection();
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
    this.leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.leftPupil.position.set(0, 0, 0.1);
    leftEye.add(this.leftPupil);
    
    // Right pupil
    this.rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    this.rightPupil.position.set(0, 0, 0.1);
    rightEye.add(this.rightPupil);
    
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
  
  updatePupilsLookDirection() {
    if (!this.leftPupil || !this.rightPupil) return;
    
    // Calculate direction to center (where the fight is)
    const directionX = -this.position.x;
    const directionY = -this.position.y;
    
    // Normalize the direction
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    const normalizedX = directionX / length;
    const normalizedY = directionY / length;
    
    // Scale the movement (how far pupils can move within the eyes)
    const maxOffset = 0.05;
    const offsetX = normalizedX * maxOffset;
    const offsetY = normalizedY * maxOffset;
    
    // Apply the offset to pupils
    this.leftPupil.position.set(offsetX, offsetY, 0.1);
    this.rightPupil.position.set(offsetX, offsetY, 0.1);
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
  
  chat(message) {
    // Create a chat bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = message;
    this.container.appendChild(bubble);
    
    // Position the bubble above the viewer
    positionBubbleAt3DPoint(bubble, {
      x: this.position.x,
      y: this.position.y + 1.8,
      z: this.position.z
    }, this.camera, this.container);
    
    // Remove the bubble after animation completes
    setTimeout(() => {
      bubble.remove();
    }, 4000);
    
    // Also do a small animation
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
  
  update() {
    // Update pupils to look toward the center
    this.updatePupilsLookDirection();
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
  }
} 