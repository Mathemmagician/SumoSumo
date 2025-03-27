import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { StadiumFactory } from './models';
import { 
  RING_RADIUS,
  RING_HEIGHT,
  FIRST_ROW_DISTANCE,
  SEATS_PER_FIRST_ROW,
  SEATS_INCREMENT,
  ELEVATION_INCREMENT,
  ROW_SPACING
} from './constants';

export class Renderer {
  constructor() {
    console.log('Renderer constructor called');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.stadium = null;
    this.controls = null;
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
  }

  initialize() {
    console.log('Initializing renderer');
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    console.log('Scene created');

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(-15, 15, 15);
    this.camera.lookAt(0, 0, 0);
    console.log('Camera created and positioned');

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, highPerformance: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    const container = document.createElement('div');
    container.id = 'canvas-container';
    document.body.appendChild(container);
    container.appendChild(this.renderer.domElement);
    console.log('Renderer created and added to DOM');

    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Add smooth damping
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    console.log('Orbit controls initialized');

    // Set up lighting
    this.setupLighting();
    console.log('Lighting setup complete');

    // Create test cube to verify rendering
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
    console.log('Test cube added');

    // Create the complete stadium (includes ring)
    this.createStadium();
    console.log('Stadium created');

    // Add event listeners
    window.addEventListener('resize', this.onWindowResize);

    // Start animation loop
    console.log('Starting animation loop');
    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(-50, 50, -30);
    sunLight.castShadow = true;
    
    // Adjust shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0005;
    
    this.scene.add(sunLight);

    // Add some fill lights
    const fillLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight1.position.set(50, 30, 50);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight2.position.set(-50, 30, 50);
    this.scene.add(fillLight2);
  }

  createStadium() {
    // Create complete stadium using the factory
    const stadium = StadiumFactory.createCompleteStadium(
      RING_RADIUS, 
      RING_HEIGHT,
      {
        seatsPerFirstRow: SEATS_PER_FIRST_ROW,
        firstRowDistance: FIRST_ROW_DISTANCE,
        seatsIncrement: SEATS_INCREMENT,
        rowSpacing: ROW_SPACING,
        elevationIncrement: ELEVATION_INCREMENT
      }
    );
    
    this.scene.add(stadium);
    
    // Remove the separate ring creation since it's now part of the complete stadium
    this.scene.remove(this.ring); // Remove the old ring if it exists
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    
    // Log first frame render
    if (!this._hasLoggedFirstFrame) {
      console.log('First frame rendering');
      this._hasLoggedFirstFrame = true;
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Create and export a singleton instance
export const renderer = new Renderer();