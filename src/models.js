import * as THREE from 'three';
import { 
  RING_RADIUS,
  RING_HEIGHT,
  FLOOR_SIZE,
  SQUARE_RING_RADIUS,
  BENCH_WIDTH,
  BENCH_HEIGHT,
  BENCH_DEPTH
} from './constants';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Model dimension constants
export const MODEL_CONSTANTS = {
  FIGHTER: {
    BODY_RADIUS: 1,
    ARM_RADIUS: 0.2,
    ARM_LENGTH: 1,
    LEG_RADIUS: 0.25,
    LEG_LENGTH: 1,
    HEAD_RADIUS: 0.4
  },
  REFEREE: {
    BODY_RADIUS: 0.4,
    BODY_HEIGHT: 1.2,
    ROBE_RADIUS: 0.6,
    ROBE_HEIGHT: 1.6,
    FAN_WIDTH: 0.4,
    FAN_HEIGHT: 0.6,
    SASH_WIDTH: 0.3,
    SASH_HEIGHT: 1.0,
    HAT_RADIUS: 0.3,
    HAT_HEIGHT: 0.2
  },
  VIEWER: {
    BODY_RADIUS: 0.3,
    BODY_HEIGHT: 1.2,
    ARM_RADIUS: 0.05,
    ARM_LENGTH: 0.8
  },
  COMMON: {
    FACE_SIZE: 0.8,
    EMOTE_SIZE: 1,
    TEXT_BUBBLE_WIDTH: 2.4,
    TEXT_BUBBLE_HEIGHT: 1.2
  },
  STADIUM: {
    FLOOR_SIZE: RING_RADIUS * 8,
    WALL_HEIGHT: 16,
    WALL_THICKNESS: 2,
    COLUMN_RADIUS: 0.8,
    COLUMN_HEIGHT: 18,
    COLUMN_SEGMENTS: 6,
    BEAM_HEIGHT: 1.5,
    BEAM_DEPTH: 0.8,
    WALL_COLOR: 0x5D4037,
    COLUMN_COLOR: 0x4E342E,
    BEAM_COLOR: 0x3E2723,
    TRIM_COLOR: 0x795548,
    ROOF_COLOR: 0x4E342E,
    FLOOR_COLOR: 0xA1887F
  }
};

// At the top, add these configurations
export const MATERIALS = {
  RING: new THREE.MeshStandardMaterial({
    color: 0xD2B48C,
    roughness: 0.7,
    metalness: 0.1
  }),
  BORDER: new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.2
  }),
  FLOOR: new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2
  }),
  BENCH: new THREE.MeshStandardMaterial({
    color: 0x8B4513,
    roughness: 0.8,
    metalness: 0.2
  })
};

// Update geometry constants
export const GEOMETRY_SETTINGS = {
  RING_SEGMENTS: 32,
  FLOOR_MULTIPLIER: 8,
  BORDER_HEIGHT_RATIO: 1.2,
  MAX_ROW_COUNT: 30
};

// Add a ModelLoader class to handle 3D models
export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.loadedModels = {
      fighters: [], // Change to array to hold multiple fighter models
      referee: null,
      viewers: [],
      roof: null // Add roof model
    };
    this.isLoading = false;
    this.loadPromise = null;
  }

  async loadModels() {
    // Only load models once - if already loading, return the existing promise
    if (this.isLoading) {
      console.log('Models already loading, returning existing promise');
      return this.loadPromise;
    }
    
    // If models are already loaded, return immediately
    if (this.loadedModels.fighters.length >= 2 && this.loadedModels.referee && this.loadedModels.viewers.length === 4 && this.loadedModels.roof) {
      console.log('Models already loaded, returning immediately');
      return this.loadedModels;
    }
    
    console.log('Starting model loading...');
    this.isLoading = true;
    
    // Create a promise for the loading process
    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        // Load all models in parallel
        const [sumo0Gltf, sumo1Gltf, sumo2Gltf, refereeGltf, viewer0Gltf, viewer1Gltf, viewer2Gltf, viewer3Gltf, roofGltf] = await Promise.all([
          this.loadModel('/models3d/sumo.glb'),
          this.loadModel('/models3d/sumo_1.glb'),
          this.loadModel('/models3d/sumo_2.glb'),
          this.loadModel('/models3d/referee.glb'),
          this.loadModel('/models3d/viewer_0.glb'),
          this.loadModel('/models3d/viewer_1.glb'),
          this.loadModel('/models3d/viewer_2.glb'),
          this.loadModel('/models3d/viewer_3.glb'),
          this.loadModel('/models3d/roof.glb')
        ]);

        // Process and store the models
        this.loadedModels.fighters = [
          this.processModel(sumo0Gltf.scene),
          this.processModel(sumo1Gltf.scene),
          this.processModel(sumo2Gltf.scene)
        ];
        this.loadedModels.referee = this.processModel(refereeGltf.scene);
        this.loadedModels.viewers = [
          this.processModel(viewer0Gltf.scene),
          this.processModel(viewer1Gltf.scene),
          this.processModel(viewer2Gltf.scene),
          this.processModel(viewer3Gltf.scene)
        ];
        this.loadedModels.roof = this.processModel(roofGltf.scene);

        console.log('All models loaded successfully');
        resolve(this.loadedModels);
      } catch (error) {
        console.error('Error loading models:', error);
        this.isLoading = false;
        reject(error);
      }
    });
    
    // When loading completes, reset loading flag
    this.loadPromise.then(() => {
      this.isLoading = false;
    }).catch(() => {
      this.isLoading = false;
    });
    
    return this.loadPromise;
  }

  processModel(model) {
    // Apply standard material adjustments
    model.traverse((child) => {
      if (child.isMesh) {
        // Enable smooth normals
        child.geometry.computeVertexNormals();
        
        // Increase mesh smoothness by setting flat shading to false
        child.material.flatShading = false;
        
        // Update the material to show the changes
        child.material.needsUpdate = true;
        
        // Existing shadow settings
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = 0.7;
          child.material.metalness = 0.3;
          child.material.needsUpdate = true;
        }
      }
    });
    return model;
  }

  loadModel(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => resolve(gltf),
        (progress) => console.log(`Loading ${url}:`, (progress.loaded / progress.total * 100) + '%'),
        (error) => reject(error)
      );
    });
  }

  createPlayerModel(player) {
    if (!player || !player.role) {
      console.error('Invalid player data for model creation:', player);
      return null;
    }
    
    // Get the appropriate base model
    let baseModel = null;
    
    if (player.role === 'fighter') {
      // Select fighter model based on player.seed or random if no seed
      const fighterModelIndex = player.seed ? 
        Math.abs(player.seed) % this.loadedModels.fighters.length :
        Math.floor(Math.random() * this.loadedModels.fighters.length);
      baseModel = this.loadedModels.fighters[fighterModelIndex];
    } else if (player.role === 'referee') {
      baseModel = this.loadedModels.referee;
    } else {
      // For viewers, select a model based on player.seed
      const viewerModelIndex = player.seed % this.loadedModels.viewers.length;
      baseModel = this.loadedModels.viewers[viewerModelIndex];
    }
    
    if (!baseModel) {
      console.error(`No model loaded for role: ${player.role}`);
      return null;
    }

    // Clone the model
    const model = baseModel.clone();
    model.name = `player-${player.id}`;
    
    // Store player data in userData
    model.userData = {
      id: player.id,
      role: player.role,
      modelIndex: player.role === 'fighter' ? 
        Math.abs(player.seed) % this.loadedModels.fighters.length : 
        player.seed % this.loadedModels.viewers.length
    };
    
    // Scale up the model by a factor of 3    
    if (player.role === 'fighter') {
      model.scale.set(4, 4, 4);
    } else if (player.role === 'referee') {
      model.scale.set(4, 4, 4);
    } else {
      // Default to viewer
      model.scale.set(3, 3, 3);
    }

    return model;
  }
}

// Create a singleton instance of ModelLoader
const modelLoaderInstance = new ModelLoader();

// Modify ModelFactory to use the singleton
export class ModelFactory {
  constructor() {
    // Use the singleton instance
    this.modelLoader = modelLoaderInstance;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      console.log('ModelFactory already initialized');
      return;
    }
    
    await this.modelLoader.loadModels();
    this.initialized = true;
    console.log('ModelFactory initialized successfully');
  }

  createPlayerModel(player) {
    if (!this.initialized) {
      console.error('ModelFactory not initialized. Call initialize() first');
      return null;
    }

    if (!player || !player.id) {
      console.error('Invalid player data:', player);
      return null;
    }

    console.log(`Creating model for player ${player.id} with role ${player.role}`);
    
    // Use the modelLoader to create a player model
    const model = this.modelLoader.createPlayerModel(player);
    
    if (!model) {
      console.error('Failed to create model for player:', player);
      return null;
    }
    
    return model;
  }
}

export class StadiumFactory {
  /**
   * Creates the walls and structural elements of the stadium
   * @param {number} ringRadius - The radius of the sumo ring for scaling
   * @param {number} seatingDistance - Distance to last row of seating
   * @returns {THREE.Group} A group containing all stadium wall elements
   */
  static createStadiumWalls(ringRadius, seatingDistance) {
    const s = MODEL_CONSTANTS.STADIUM;
    const stadiumGroup = new THREE.Group();
    
    // Calculate wall placement - should be after the last row of seating
    const wallDistance = seatingDistance + 5; // 5 units beyond last row
    
    // Create the four walls (North, East, South, West)
    const wallPositions = [
      {x: 0, z: -wallDistance, rotation: 0}, // North
      {x: wallDistance, z: 0, rotation: Math.PI / 2}, // East
      {x: 0, z: wallDistance, rotation: Math.PI}, // South
      {x: -wallDistance, z: 0, rotation: -Math.PI / 2} // West
    ];
    
    // Wall length - slightly larger than the distance between opposite walls
    const wallLength = wallDistance * 2 + 10;
    
    // Create each wall
    wallPositions.forEach(pos => {
      // Wall base
      const wallGeometry = new THREE.BoxGeometry(wallLength, s.WALL_HEIGHT, s.WALL_THICKNESS);
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: s.WALL_COLOR,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(pos.x, s.WALL_HEIGHT / 2, pos.z);
      wall.rotation.y = pos.rotation;
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      stadiumGroup.add(wall);
      
      // Add decorative trim at top of wall
      const trimGeometry = new THREE.BoxGeometry(wallLength, 0.8, s.WALL_THICKNESS + 0.4);
      const trimMaterial = new THREE.MeshStandardMaterial({
        color: s.TRIM_COLOR,
        roughness: 0.7,
        metalness: 0.3
      });
      
      const trim = new THREE.Mesh(trimGeometry, trimMaterial);
      trim.position.set(pos.x, s.WALL_HEIGHT + 0.4, pos.z);
      trim.rotation.y = pos.rotation;
      trim.castShadow = true;
      trim.receiveShadow = true;
      
      stadiumGroup.add(trim);
      
      // Add support columns along the wall
      const numColumns = 5; // Number of columns along each wall
      const columnSpacing = wallLength / (numColumns + 1);
      
      for (let i = 1; i <= numColumns; i++) {
        const offset = (i * columnSpacing) - (wallLength / 2);
        let columnX = pos.x;
        let columnZ = pos.z;
        
        // Adjust position based on wall orientation
        if (pos.rotation === 0 || pos.rotation === Math.PI) {
          columnX += offset;
        } else {
          columnZ += offset;
        }
        
        // Adjust the column position to be against the wall
        if (pos.rotation === 0) columnZ += s.WALL_THICKNESS / 2;
        else if (pos.rotation === Math.PI) columnZ -= s.WALL_THICKNESS / 2;
        else if (pos.rotation === Math.PI / 2) columnX -= s.WALL_THICKNESS / 2;
        else if (pos.rotation === -Math.PI / 2) columnX += s.WALL_THICKNESS / 2;
        
        // Create column
        const columnGeometry = new THREE.CylinderGeometry(
          s.COLUMN_RADIUS, s.COLUMN_RADIUS * 1.2, s.COLUMN_HEIGHT, s.COLUMN_SEGMENTS
        );
        const columnMaterial = new THREE.MeshStandardMaterial({
          color: s.COLUMN_COLOR,
          roughness: 0.7,
          metalness: 0.2
        });
        
        const column = new THREE.Mesh(columnGeometry, columnMaterial);
        column.position.set(columnX, s.COLUMN_HEIGHT / 2, columnZ);
        column.castShadow = true;
        column.receiveShadow = true;
        
        stadiumGroup.add(column);
        
        // Add horizontal support beam on top of the column
        const beamGeometry = new THREE.BoxGeometry(s.COLUMN_RADIUS * 4, s.BEAM_HEIGHT, s.BEAM_DEPTH);
        const beamMaterial = new THREE.MeshStandardMaterial({
          color: s.BEAM_COLOR,
          roughness: 0.8,
          metalness: 0.1
        });
        
        const beam = new THREE.Mesh(beamGeometry, beamMaterial);
        beam.position.set(columnX, s.COLUMN_HEIGHT + (s.BEAM_HEIGHT / 2), columnZ);
        beam.rotation.y = pos.rotation + Math.PI / 2; // Rotate beam to align with wall
        beam.castShadow = true;
        beam.receiveShadow = true;
        
        stadiumGroup.add(beam);
      }
    });
    
    // Create corners with decorative elements
    const cornerPositions = [
      {x: wallDistance, z: -wallDistance}, // NE
      {x: wallDistance, z: wallDistance},  // SE
      {x: -wallDistance, z: wallDistance}, // SW
      {x: -wallDistance, z: -wallDistance} // NW
    ];
    
    cornerPositions.forEach(pos => {
      // Large corner column
      const cornerGeometry = new THREE.CylinderGeometry(
        s.COLUMN_RADIUS * 1.5, s.COLUMN_RADIUS * 1.8, s.COLUMN_HEIGHT * 1.2, s.COLUMN_SEGMENTS
      );
      const cornerMaterial = new THREE.MeshStandardMaterial({
        color: s.COLUMN_COLOR,
        roughness: 0.7,
        metalness: 0.2
      });
      
      const cornerColumn = new THREE.Mesh(cornerGeometry, cornerMaterial);
      cornerColumn.position.set(pos.x, s.COLUMN_HEIGHT * 0.6, pos.z);
      cornerColumn.castShadow = true;
      cornerColumn.receiveShadow = true;
      
      stadiumGroup.add(cornerColumn);
      
      // Decorative top cap for corner
      const capGeometry = new THREE.CylinderGeometry(
        s.COLUMN_RADIUS * 2, s.COLUMN_RADIUS * 1.5, s.BEAM_HEIGHT, s.COLUMN_SEGMENTS
      );
      const capMaterial = new THREE.MeshStandardMaterial({
        color: s.TRIM_COLOR,
        roughness: 0.6,
        metalness: 0.3
      });
      
      const cornerCap = new THREE.Mesh(capGeometry, capMaterial);
      cornerCap.position.set(pos.x, s.COLUMN_HEIGHT * 1.2, pos.z);
      cornerCap.castShadow = true;
      cornerCap.receiveShadow = true;
      
      stadiumGroup.add(cornerCap);
    });
    
    // Create the extended floor to match the walls
    const floorSize = wallDistance * 2 + 10; // Match wall dimensions
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize); // Define floorGeometry before using it
    const floorTexture = StadiumFactory.createFloorTexture();
    
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: s.FLOOR_COLOR,
      roughness: 0.8,
      metalness: 0.05,
      map: floorTexture,
      side: THREE.DoubleSide
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -0.01; // Slightly below current floor to avoid z-fighting
    floor.receiveShadow = true;
    
    stadiumGroup.add(floor);
    
    // Add roof structure
    const roofDistance = wallDistance - 2; // Slightly inset from walls
    const roofHeight = s.WALL_HEIGHT + 2;
    const roofStructure = this.createRoofStructure(roofDistance, roofHeight);
    stadiumGroup.add(roofStructure);
    
    // Add the imported roof.glb model
    const importedRoof = this.addImportedRoof(roofDistance, roofHeight);
    stadiumGroup.add(importedRoof);
    
    // Add some lanterns for ambient lighting
    this.addStageLighting(stadiumGroup, wallDistance);

    // Add sponsor banners between pillars on East and West walls
    const availableAdSpaces = [
      {
        text: "",
        subtext: "",
        color: 0x5D4037,
        isAvailableSpace: true
      },
      {
        text: "",
        subtext: "",
        color: 0x5D4037,
        isAvailableSpace: true
      }
    ];

    // Define ads with custom font sizes
    const eastWallBanners = [
      {
        text: "SUMO SLIM",
        subtext: "Lose Weight While\nYou Wait for Your Turn!",
        color: 0x2E8B57, // Sea green
        mainFontSize: 72,  // Base size
        subFontSize: 48    // Base size
      },
      {
        text: "MIGHTY MAWASHI",
        subtext: "The Only Underwear That\nCan Handle Your Ambitions",
        color: 0xDB7093, // Pale violet red
        mainFontSize: 55,  // Slightly smaller due to longer text
        subFontSize: 40
      },
      {
        text: "SUMO SNACKS",
        subtext: "Gain Weight Fast!\nResults Guaranteed or\nDouble Your Mass Back",
        color: 0xFF8C00, // Dark orange
        mainFontSize: 55,  // Slightly smaller due to longer text
        subFontSize: 30
      },
      {
        text: "Make $1,000,000",
        subtext: "By Giving Us $1,000\nPlaySumoSumo.com/sponsor",
        color: 0x4d7734, // Rich money color
        mainFontSize: 55,
        subFontSize: 35
      },
      // ...availableAdSpaces
    ];

    const westWallBanners = [
      {
        text: "Got $1?",
        subtext: "Send It Our Way\nOr Else. You don't want to know.",
        color: 0x4d7734, // Rich money color
        mainFontSize: 75,
        subFontSize: 35
      },
      {
        text: "BIG BOI BURGERS",
        subtext: "Eat Like a Champion\nMove Like... Well, Just Eat",
        color: 0xB8860B, // Dark golden rod
        mainFontSize: 53,  // 15% smaller than base
        subFontSize: 42
      },
      {
        text: "SUMO VPN",
        subtext: "We Hide Your Data\nLike You Hide Your Moves",
        color: 0x4682B4, // Steel blue
        mainFontSize: 72,  // Can be large due to short text
        subFontSize: 42
      },
      {
        text: "BOUNCE BACK",
        subtext: "Because Sometimes\nYou Land Outside the Ring",
        color: 0x8B4513, // Saddle brown
        mainFontSize: 65,  // Can be large due to short text
        subFontSize: 42
      },
      // ...availableAdSpaces
    ];

    // Only add to East and West walls
    const adWalls = [
      {x: wallDistance, z: 0, rotation: Math.PI / 2, banners: eastWallBanners}, // East
      {x: -wallDistance, z: 0, rotation: -Math.PI / 2, banners: westWallBanners} // West
    ];

    adWalls.forEach(wall => {
      // Space between pillars was defined earlier as wallLength / (numColumns + 1)
      const numColumns = 5;
      const wallLength = wallDistance * 2 + 10;
      const spacing = wallLength / (numColumns + 1);

      // Add banners between pillars
      for (let i = 0; i < numColumns - 1; i++) {
        const bannerInfo = wall.banners[i % wall.banners.length];
        
        // Create banner background
        const bannerWidth = spacing * 0.9; // Slightly smaller than space between pillars
        const bannerHeight = s.WALL_HEIGHT * 0.4;
        const bannerGeometry = new THREE.PlaneGeometry(bannerWidth, bannerHeight);
        
        // Create canvas for the banner texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        // Fill background with color
        ctx.fillStyle = `#${bannerInfo.color.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 512, 256);

        if (!bannerInfo.isAvailableSpace) {
            // Add darker gradient overlay for better contrast
            const gradient = ctx.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 512, 256);

            // Add text shadow for better readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Add main text with border using custom font size
            ctx.fillStyle = 'white';
            ctx.font = `bold ${bannerInfo.mainFontSize || 72}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Draw text border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 4;
            ctx.strokeText(bannerInfo.text, 256, 90);
            // Draw text
            ctx.fillText(bannerInfo.text, 256, 90);

            // Add subtext with border using custom font size
            ctx.font = `italic ${bannerInfo.subFontSize || 48}px Arial`;
            ctx.lineWidth = 3;
            const subtextLines = bannerInfo.subtext.split('\n');
            const lineHeight = Math.floor(bannerInfo.subFontSize * 1.125); // Dynamic line height based on font size
            const startY = 160; // Keep consistent starting position
            
            subtextLines.forEach((line, index) => {
                const y = startY + (index * lineHeight);
                ctx.strokeText(line, 256, y);
                ctx.fillText(line, 256, y);
            });
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        const bannerMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: bannerInfo.color,
            emissiveIntensity: bannerInfo.isAvailableSpace ? 0.05 : 0.1,
            roughness: 0.7,
            metalness: 0.2
        });

        const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);

        // Position banner between pillars
        const offset = (i - (numColumns - 2) / 2) * spacing;
        if (wall.rotation === Math.PI / 2) {
          banner.position.set(wall.x - 1.5, s.WALL_HEIGHT * 0.7, offset);
          banner.rotation.y = wall.rotation + Math.PI; // Add PI to face inward
        } else {
          banner.position.set(wall.x + 1.5, s.WALL_HEIGHT * 0.7, offset);
          banner.rotation.y = wall.rotation + Math.PI; // Add PI to face inward
        }

        // Add subtle glow effect
        const glowGeometry = new THREE.PlaneGeometry(bannerWidth * 1.1, bannerHeight * 1.1);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: bannerInfo.color,
          transparent: true,
          opacity: 0.1, // Reduced from 0.2
          side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(banner.position);
        if (wall.rotation === Math.PI / 2) {
          glow.position.x -= 0.1;
          glow.rotation.y = wall.rotation + Math.PI; // Match banner rotation
        } else {
          glow.position.x += 0.1;
          glow.rotation.y = wall.rotation + Math.PI; // Match banner rotation
        }

        // Modify the glow effect for available spaces
        if (bannerInfo.isAvailableSpace) {
          glowMaterial.opacity = 0.05 + Math.sin(Date.now() * 0.001) * 0.05; // Subtle pulsing effect
        }

        stadiumGroup.add(glow);
        stadiumGroup.add(banner);
      }
    });

    return stadiumGroup;
  }
  
  /**
   * Creates a wood floor texture
   * @returns {THREE.Texture} Canvas texture for floor
   */
  static createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Darker base color
    ctx.fillStyle = '#A1887F'; // Darker floor color
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add darker wood grain pattern
    for (let i = 0; i < 40; i++) {
      const y = i * 26 + Math.random() * 10;
      const colorVariation = Math.random() * 15 - 7;
      
      // Darker wood grain
      ctx.strokeStyle = `rgba(${145 + colorVariation}, ${110 + colorVariation}, ${60 + colorVariation}, 0.4)`;
      ctx.lineWidth = 15 + Math.random() * 10;
      
      // Create wavy line for wood grain
      ctx.beginPath();
      ctx.moveTo(0, y);
      
      let x = 0;
      while (x < 1024) {
        const nextX = x + 50 + Math.random() * 50;
        const nextY = y + Math.random() * 10 - 5;
        ctx.lineTo(nextX, nextY);
        x = nextX;
      }
      
      ctx.stroke();
    }
    
    // Add darker knots in the wood
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 5 + Math.random() * 15;
      
      const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
      gradient.addColorStop(0, 'rgba(60, 40, 20, 0.8)'); // Darker center
      gradient.addColorStop(1, 'rgba(120, 90, 70, 0)'); // Darker fade
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Creates a roof structure for the stadium
   * @param {number} distance - Distance from center to roof edge
   * @param {number} height - Height of the roof from ground
   * @returns {THREE.Group} The roof structure
   */
  static createRoofStructure(distance, height) {
    const s = MODEL_CONSTANTS.STADIUM;
    const roofGroup = new THREE.Group();
    
    // Create a large pyramid-like roof
    const roofSize = distance * 2 + 10;
    const roofPeakHeight = 8; // How tall the roof peak is from its base
    
    // Create each of the four sloped roof sections
    const roofSections = [
      {x: 0, z: -distance, rotation: Math.PI}, // North
      {x: distance, z: 0, rotation: Math.PI / 2}, // East
      {x: 0, z: distance, rotation: 0}, // South
      {x: -distance, z: 0, rotation: -Math.PI / 2} // West
    ];
    
    roofSections.forEach(section => {
      // Create a triangular roof section
      const roofGeometry = new THREE.BufferGeometry();
      
      // Define roof vertices for this section (triangular shape)
      const halfWidth = roofSize / 2;
      const vertices = new Float32Array([
        // Base of the triangle
        -halfWidth, 0, 0,
        halfWidth, 0, 0,
        // Peak of the triangle
        0, roofPeakHeight, -distance,
      ]);
      
      roofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      roofGeometry.computeVertexNormals();
      
      // Basic indices for a triangle
      roofGeometry.setIndex([0, 1, 2]);
      
      // Roof material with darker wood texture
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: s.ROOF_COLOR,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      
      const roofSection = new THREE.Mesh(roofGeometry, roofMaterial);
      roofSection.position.set(section.x, height, section.z);
      roofSection.rotation.y = section.rotation;
      roofSection.castShadow = true;
      roofSection.receiveShadow = true;
      
      roofGroup.add(roofSection);
      
      // Add decorative ridge beams along the roof edges
      const edgeBeamGeometry = new THREE.BoxGeometry(roofSize, 0.4, 0.6);
      const edgeBeamMaterial = new THREE.MeshStandardMaterial({
        color: s.TRIM_COLOR,
        roughness: 0.6,
        metalness: 0.2
      });
      
      const edgeBeam = new THREE.Mesh(edgeBeamGeometry, edgeBeamMaterial);
      edgeBeam.position.set(section.x, height, section.z);
      edgeBeam.rotation.y = section.rotation;
      
      // Move the beam to the base edge of the roof section
      if (section.rotation === 0) {
        edgeBeam.position.z += 0.3;
      } else if (section.rotation === Math.PI) {
        edgeBeam.position.z -= 0.3;
      } else if (section.rotation === Math.PI / 2) {
        edgeBeam.position.x -= 0.3;
      } else {
        edgeBeam.position.x += 0.3;
      }
      
      edgeBeam.castShadow = true;
      edgeBeam.receiveShadow = true;
      
      roofGroup.add(edgeBeam);
    });
    
    // Add central peak ornament
    const peakOrnamentGeometry = new THREE.ConeGeometry(1.2, 3, 8);
    const peakOrnamentMaterial = new THREE.MeshStandardMaterial({
      color: 0xB22222, // Dark red ornament
      roughness: 0.5,
      metalness: 0.5
    });
    
    const peakOrnament = new THREE.Mesh(peakOrnamentGeometry, peakOrnamentMaterial);
    peakOrnament.position.set(0, height + roofPeakHeight + 1.5, 0);
    peakOrnament.castShadow = true;
    
    roofGroup.add(peakOrnament);
    
    return roofGroup;
  }

  /**
   * Adds the imported roof.glb model to the stadium
   * @param {number} distance - Distance from center to roof edge
   * @param {number} height - Height of the roof from ground
   * @returns {THREE.Group} The imported roof group
   */
  static addImportedRoof(distance, height) {
    const importedRoofGroup = new THREE.Group();
    
    // Add the imported roof.glb model if it has been loaded
    const modelLoader = this.getModelLoader();
    if (modelLoader && modelLoader.loadedModels && modelLoader.loadedModels.roof) {
      const importedRoof = modelLoader.loadedModels.roof.clone();
      
      // Position the imported roof below the existing roof structure
      importedRoof.position.set(0, height - 1.5, 0);
      
      // Scale the imported roof to match the stadium dimensions
      const roofScale = 15; // Increased scale by adjusting divisor
      importedRoof.scale.set(roofScale, roofScale, roofScale);
      
      // Rotate the roof by 90 degrees around the Y axis
      importedRoof.rotation.y = Math.PI / 2; // 90 degrees in radians
      
      // Name the imported roof for easy identification
      importedRoof.name = "imported-roof";
      
      // Add the roof to the group
      importedRoofGroup.add(importedRoof);
      
      // Add "SumoSumo" sign as a 2D plane with the same width as the roof model
      // Use PlaneGeometry instead of BoxGeometry for a 2D sign
      const signWidth = 0.58; // Width based on the roof scale
      const signHeight = 0.15; // Height proportional to width
      const signGeometry = new THREE.PlaneGeometry(signWidth, signHeight);
      
      // Create canvas for the sign texture
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // Add text
      ctx.fillStyle = '#917536'; // Brighter gold text
      ctx.font = 'bold 160px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add stronger shadow for depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      
      // Draw the text
      ctx.fillText('SumoSumo', 512, 128);
      
      // Create texture from canvas
      const signTexture = new THREE.CanvasTexture(canvas);
      signTexture.needsUpdate = true;
      
      const signMaterial = new THREE.MeshBasicMaterial({
        map: signTexture,
        side: THREE.DoubleSide, // Make it visible from both sides
        transparent: true, // Enable transparency
        opacity: 1.0
      });
      
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      
      // Position the sign in front of the roof model
      sign.position.set(-0.22, -0.075, 0); // Just slightly in front
      sign.rotation.y = -Math.PI / 2; // Rotate -90 degrees to fix reversed text
      
      // Add the sign directly to the imported roof model
      importedRoof.add(sign);
      
      console.log("Added imported roof.glb model to stadium with 2D sign");
    } else {
      console.warn("roof.glb model not loaded, skipping imported roof");
    }
    
    return importedRoofGroup;
  }

  // Helper method to get the model loader singleton
  static getModelLoader() {
    // If we already have a reference, return it
    if (this._modelLoader) {
      return this._modelLoader;
    }
    
    // Check if the renderer has initialized it
    if (window.renderer && window.renderer.modelFactory) {
      this._modelLoader = window.renderer.modelFactory.modelLoader;
      return this._modelLoader;
    }
    
    // Otherwise create a new instance
    this._modelLoader = new ModelLoader();
    return this._modelLoader;
  }

  // Add method for creating stadium lighting
  static addStageLighting(stadiumGroup, wallDistance) {
    const s = MODEL_CONSTANTS.STADIUM;
    const lanternPositions = [
      // Corners
      {x: wallDistance * 0.7, y: s.WALL_HEIGHT * 0.6, z: -wallDistance * 0.7},
      {x: wallDistance * 0.7, y: s.WALL_HEIGHT * 0.6, z: wallDistance * 0.7},
      {x: -wallDistance * 0.7, y: s.WALL_HEIGHT * 0.6, z: wallDistance * 0.7},
      {x: -wallDistance * 0.7, y: s.WALL_HEIGHT * 0.6, z: -wallDistance * 0.7},
      // Center
      {x: 0, y: s.WALL_HEIGHT + 10, z: 0}
    ];
    
    lanternPositions.forEach((pos, index) => {
      // Lantern body
      const isCenter = index === lanternPositions.length - 1;
      const lanternSize = isCenter ? 1.5 : 1.0;
      
      const lanternGeometry = new THREE.CylinderGeometry(
        lanternSize * 0.6, lanternSize * 0.8, lanternSize * 1.6, 8
      );
      const lanternMaterial = new THREE.MeshStandardMaterial({
        color: 0xA83232, // Dark red
        roughness: 0.7,
        metalness: 0.3,
        emissive: 0x441111, // Slight glow
        emissiveIntensity: 0.2
      });
      
      const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
      lantern.position.set(pos.x, pos.y, pos.z);
      lantern.castShadow = true;
      stadiumGroup.add(lantern);
      
      // Add a point light inside each lantern
      const lanternLight = new THREE.PointLight(
        0xffaa55, // Warm light color
        isCenter ? 0.8 : 0.4, // Intensity
        isCenter ? 40 : 20 // Distance
      );
      lanternLight.position.set(pos.x, pos.y, pos.z);
      stadiumGroup.add(lanternLight);
      
      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(
        isCenter ? 2.0 : 1.2, 16, 16
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9933,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(pos.x, pos.y, pos.z);
      stadiumGroup.add(glow);
      
      // For the center lantern, add a chain to hang it
      if (isCenter) {
        const chainHeight = 5;
        const chainGeometry = new THREE.CylinderGeometry(0.1, 0.1, chainHeight, 8);
        const chainMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333, // Dark metal
          roughness: 0.7,
          metalness: 0.8
        });
        
        const chain = new THREE.Mesh(chainGeometry, chainMaterial);
        chain.position.set(pos.x, pos.y + (chainHeight/2) + (lanternSize * 0.8), pos.z);
        stadiumGroup.add(chain);
      }
    });
    
    // Add subtle fog to the scene
    const fogColor = new THREE.Color(0x221813); // Very dark brown fog
    stadiumGroup.fog = new THREE.FogExp2(fogColor, 0.008);
  }

  /**
   * Calculates the seating layout parameters
   * @param {number} seatsPerFirstRow - Number of seats in the first row
   * @param {number} firstRowDistance - Distance of first row from center
   * @param {number} seatsIncrement - How many seats to add per row
   * @param {number} rowSpacing - Distance between rows
   * @param {number} maxRowCount - Maximum number of rows to generate
   * @returns {Object} Layout parameters including totalRows and maxDistance
   */
  static calculateSeatingLayout(seatsPerFirstRow, firstRowDistance, seatsIncrement, rowSpacing, maxRowCount = 30) {
    let currentRowSeats = seatsPerFirstRow;
    let currentDistance = firstRowDistance;
    let maxDistance = firstRowDistance;
    let totalRows = 0;

    // Calculate maximum seating distance
    while (currentRowSeats < maxRowCount) {
      currentRowSeats += seatsIncrement;
      currentDistance += rowSpacing;
      maxDistance = currentDistance;
      totalRows++;
    }

    return {
      totalRows,
      maxDistance
    };
  }

  /**
   * Creates a complete stadium including walls, seating, and ring
   * @param {number} ringRadius - The radius of the sumo ring
   * @param {number} ringHeight - The height of the ring platform
   * @param {Object} seatingOptions - Options for seating layout
   * @param {number} [fixedRows=20] - Use a fixed number of rows instead of calculating
   * @returns {THREE.Group} A group containing the complete stadium
   */
  static createCompleteStadium(ringRadius, ringHeight, seatingOptions, fixedRows = 20) {
    const stadiumGroup = new THREE.Group();
    
    // Calculate seating layout (or use fixed rows)
    const { totalRows, maxDistance } = fixedRows ? 
      { totalRows: fixedRows, maxDistance: seatingOptions.firstRowDistance + (fixedRows * seatingOptions.rowSpacing) } :
      this.calculateSeatingLayout(
        seatingOptions.seatsPerFirstRow,
        seatingOptions.firstRowDistance,
        seatingOptions.seatsIncrement,
        seatingOptions.rowSpacing
      );

    // Add ring
    const ring = this.createRing(ringRadius, ringHeight);
    stadiumGroup.add(ring);
    
    // Add walls
    const walls = this.createStadiumWalls(ringRadius, maxDistance);
    stadiumGroup.add(walls);
    
    // Add seating
    const seating = this.createAudienceAreas({
      totalRows,
      ...seatingOptions
    });
    stadiumGroup.add(seating);
    
    return stadiumGroup;
  }

  /**
   * Creates the sumo ring structure with traditional elements
   * @param {number} ringRadius - The radius of the sumo ring
   * @param {number} ringHeight - The height of the ring platform
   * @returns {THREE.Group} A group containing the ring elements
   */
  static createRing(ringRadius, ringHeight) {
    const ringGroup = new THREE.Group();

    // Create base platform with sloped sides
    const squareBase = new THREE.BufferGeometry();
    const squareRingRadius = ringRadius + 0.3;
    const squareBottomRadius = squareRingRadius + 0.5;
    
    squareBase.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      // Bottom (y=0): 4 vertices
      -squareBottomRadius, 0, -squareBottomRadius,  
      squareBottomRadius, 0, -squareBottomRadius,   
      squareBottomRadius, 0, squareBottomRadius,    
      -squareBottomRadius, 0, squareBottomRadius,
      // Top (y=ringHeight): 4 vertices
      -squareRingRadius, ringHeight, -squareRingRadius,  
      squareRingRadius, ringHeight, -squareRingRadius,   
      squareRingRadius, ringHeight, squareRingRadius,    
      -squareRingRadius, ringHeight, squareRingRadius
    ]), 3));
    
    squareBase.setIndex([
      0,1,2, 0,2,3,    // bottom face
      4,6,5, 4,7,6,    // top face
      0,4,5, 0,5,1,    // front vertical
      1,5,6, 1,6,2,    // right vertical
      2,6,7, 2,7,3,    // back vertical
      3,7,4, 3,4,0     // left vertical
    ]);
    
    squareBase.computeVertexNormals();
    
    // Create texture for clay-like material
    const clayTexture = new THREE.CanvasTexture(this.createClayTexture());
    
    const baseMesh = new THREE.Mesh(squareBase, new THREE.MeshStandardMaterial({ 
      color: 0xD9B382, // Warmer clay color
      roughness: 0.8,
      metalness: 0.1,
      map: clayTexture
    }));
    
    baseMesh.position.y = -0.05;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    ringGroup.add(baseMesh);

    // Dohyo cylinder with detailed texture
    const ringGeometry = new THREE.CylinderGeometry(ringRadius, ringRadius, ringHeight, 64);
    const ringTexture = new THREE.CanvasTexture(this.createDohyoTexture());
    
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xD9B382, 
      roughness: 0.7,
      metalness: 0.1,
      map: ringTexture
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = ringHeight / 2;
    ring.castShadow = true;
    ring.receiveShadow = true;
    ringGroup.add(ring);

    // Traditional straw border (tawara)
    const tawaraGeometry = new THREE.TorusGeometry(ringRadius + 0.05, 0.25, 16, 64);
    const tawaraMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xC9A165, // Straw color
      roughness: 0.9,
      metalness: 0.0,
      map: this.createStrawTexture()
    });
    
    const tawara = new THREE.Mesh(tawaraGeometry, tawaraMaterial);
    tawara.position.y = ringHeight - 0.2;
    tawara.rotation.x = Math.PI / 2;
    tawara.receiveShadow = true;
    tawara.castShadow = true;
    ringGroup.add(tawara);

    // Create shikirisen (starting lines)
    const lineWidth = 0.1;
    const lineDepth = ringRadius * 0.6;
    const lineGeometry = new THREE.BoxGeometry(lineWidth, 0.02, lineDepth);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Create two starting lines
    const line1 = new THREE.Mesh(lineGeometry, lineMaterial);
    line1.position.set(-0.75, ringHeight + 0.01, 0);
    ringGroup.add(line1);
    
    const line2 = new THREE.Mesh(lineGeometry, lineMaterial);
    line2.position.set(0.75, ringHeight + 0.01, 0);
    ringGroup.add(line2);

    // Create center circle (nakabashira)
    const centerCircleGeometry = new THREE.CircleGeometry(0.5, 32);
    const centerCircleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const centerCircle = new THREE.Mesh(centerCircleGeometry, centerCircleMaterial);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = ringHeight + 0.02;
    ringGroup.add(centerCircle);

    // Add traditional corner markers (hyoushigi)
    const markerPositions = [
      {x: 0, z: ringRadius * 0.8}, // North
      {x: ringRadius * 0.8, z: 0}, // East
      {x: 0, z: -ringRadius * 0.8}, // South
      {x: -ringRadius * 0.8, z: 0}  // West
    ];
    
    markerPositions.forEach(pos => {
      const markerGeometry = new THREE.BoxGeometry(0.3, 0.03, 0.3);
      const markerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        roughness: 0.5,
        metalness: 0.2
      });
      
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(pos.x, ringHeight + 0.015, pos.z);
      ringGroup.add(marker);
    });

    // Create the floor
    const floorGeometry = new THREE.PlaneGeometry(ringRadius * 8, ringRadius * 8);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    ringGroup.add(floor);

    return ringGroup;
  }

  /**
   * Creates a texture for the clay surface
   * @returns {HTMLCanvasElement} Canvas for texture
   */
  static createClayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = '#D9B382';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add subtle noise for clay texture
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 2 + 0.5;
      
      // Randomly vary the clay color
      const variation = Math.random() * 15 - 7;
      const r = 217 + variation;
      const g = 179 + variation;
      const b = 130 + variation;
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return canvas;
  }

  /**
   * Creates a texture for the dohyo top surface
   * @returns {HTMLCanvasElement} Canvas for texture
   */
  static createDohyoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = '#D9B382';
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Draw circular boundary
    ctx.strokeStyle = '#BF9E76';
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.arc(512, 512, 450, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add salt scatter pattern (subtle white dots)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    for (let i = 0; i < 2000; i++) {
      // Keep salt mostly in the center area
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 350; // Within the ring
      const x = 512 + Math.cos(angle) * distance;
      const y = 512 + Math.sin(angle) * distance;
      const radius = Math.random() * 2 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add footprint-like marks (subtle indentations)
    ctx.fillStyle = 'rgba(185, 152, 115, 0.3)';
    
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 400; // Within the ring
      const x = 512 + Math.cos(angle) * distance;
      const y = 512 + Math.sin(angle) * distance;
      
      // Create oval-shaped footprint
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI * 2);
      ctx.scale(1, 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, 15 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    return canvas;
  }

  /**
   * Creates a straw texture for the tawara
   * @returns {THREE.Texture} Canvas texture
   */
  static createStrawTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Base color
    ctx.fillStyle = '#C9A165';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw straw-like lines
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256;
      ctx.strokeStyle = `rgba(${150 + Math.random() * 60}, ${110 + Math.random() * 50}, ${40 + Math.random() * 40}, 0.7)`;
      ctx.lineWidth = 1 + Math.random();
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    
    // Add horizontal bindings
    for (let i = 0; i < 10; i++) {
      const y = i * 25 + Math.random() * 10;
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 3 + Math.random() * 2;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Creates the audience seating areas around the ring using InstancedMesh for better performance
   * @param {number} totalRows - Number of seating rows
   * @param {number} seatsPerFirstRow - Number of seats in the first row
   * @param {number} firstRowDistance - Distance of first row from center
   * @param {number} seatsIncrement - How many seats to add per row
   * @param {number} rowSpacing - Distance between rows
   * @param {number} elevationIncrement - Height increase per row
   * @returns {THREE.Group} A group containing all seating elements
   */
  static createAudienceAreas({
    totalRows,
    seatsPerFirstRow,
    firstRowDistance,
    seatsIncrement,
    rowSpacing,
    elevationIncrement
  }) {
    const audienceGroup = new THREE.Group();
    
    // Use a consistent number of rows if not specified
    const NUM_ROWS = totalRows || 20;
    
    // Materials for benches/mats
    const benchMaterial = MATERIALS.BENCH;
    const matMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xAA0000, 
      roughness: 0.7,
      metalness: 0.2 
    });
    
    // Single geometry for bench and mat
    const benchGeometry = new THREE.BoxGeometry(BENCH_WIDTH * 0.9, BENCH_HEIGHT, BENCH_DEPTH * 0.9);
    const matGeometry = new THREE.BoxGeometry(BENCH_WIDTH * 0.8, 0.05, BENCH_DEPTH * 0.8);
    
    // Calculate total seat count for InstancedMesh
    let totalSeats = 0;
    const sides = ['North', 'East', 'West', 'South'];
    sides.forEach(() => {
      for (let rowIndex = 0; rowIndex < NUM_ROWS; rowIndex++) {
        const seatsInRow = seatsPerFirstRow + (rowIndex * seatsIncrement);
        totalSeats += seatsInRow;
      }
    });
    
    // Create InstancedMesh for benches & mats
    const benchInstancedMesh = new THREE.InstancedMesh(benchGeometry, benchMaterial, totalSeats);
    const matInstancedMesh = new THREE.InstancedMesh(matGeometry, matMaterial, totalSeats);
    benchInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    matInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    
    let seatIndex = 0;
    
    // Define sides for positioning
    const sideData = [
      { name: 'North', rotation: 0, x: 0, z: -1 },
      { name: 'East', rotation: Math.PI / 2, x: 1, z: 0 },
      { name: 'West', rotation: -Math.PI / 2, x: -1, z: 0 },
      { name: 'South', rotation: Math.PI, x: 0, z: 1 }
    ];
    
    sideData.forEach(side => {
      for (let rowIndex = 0; rowIndex < NUM_ROWS; rowIndex++) {
        // Row properties
        const distance = firstRowDistance + (rowIndex * rowSpacing);
        const seatsInRow = seatsPerFirstRow + (rowIndex * seatsIncrement);
        const elevationLevel = Math.floor(rowIndex / 2);
        const elevation = elevationLevel * elevationIncrement;
        
        // Create platform if elevated
        if (elevation > 0) {
          const platformWidth = BENCH_WIDTH * seatsInRow;
          const platformGeometry = new THREE.BoxGeometry(
            (side.z !== 0 ? platformWidth : BENCH_DEPTH),
            elevation,
            (side.x !== 0 ? platformWidth : BENCH_DEPTH)
          );
          const platform = new THREE.Mesh(platformGeometry, benchMaterial);
          
          if (side.x !== 0) {
            platform.position.set(side.x * distance, elevation / 2, 0);
          } else {
            platform.position.set(0, elevation / 2, side.z * distance);
          }
          platform.receiveShadow = true;
          audienceGroup.add(platform);
        }
        
        for (let i = 0; i < seatsInRow; i++) {
          // offset from center
          const offset = (i - (seatsInRow - 1) / 2) * BENCH_WIDTH;
          
          let x = 0, y = BENCH_HEIGHT / 2, z = 0;
          if (elevation > 0) y += elevation;
          
          if (side.x !== 0) {
            x = side.x * distance;
            z = offset;
          } else {
            x = offset;
            z = side.z * distance;
          }
          
          // Build a transform matrix for the bench
          const benchMatrix = new THREE.Matrix4();
          benchMatrix.makeTranslation(x, y, z);
          benchMatrix.multiply(new THREE.Matrix4().makeRotationY(side.rotation));
          
          // For the mat, we place it slightly above the bench
          const matMatrix = benchMatrix.clone();
          // We can shift the mat up a little bit
          const matOffset = new THREE.Matrix4().makeTranslation(0, BENCH_HEIGHT / 2 + 0.025, 0);
          matMatrix.multiply(matOffset);
          
          // Set the instance matrix
          benchInstancedMesh.setMatrixAt(seatIndex, benchMatrix);
          matInstancedMesh.setMatrixAt(seatIndex, matMatrix);
          
          // Configure shadows for instances
          benchInstancedMesh.castShadow = true;
          benchInstancedMesh.receiveShadow = true;
          matInstancedMesh.castShadow = true;
          matInstancedMesh.receiveShadow = true;
          
          seatIndex++;
        }
      }
    });
    
    // Add the instance meshes to the audience group
    audienceGroup.add(benchInstancedMesh);
    audienceGroup.add(matInstancedMesh);
    
    return audienceGroup;
  }
} 