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
    COLUMN_SEGMENTS: 12,
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

export class ModelFactory {
  constructor(faceTextures) {
    this.faceTextures = faceTextures;
  }

  createPlayerModel(player) {
    const model = new THREE.Group();
    model.userData = {
      id: player.id,
      role: player.role
    };

    if (player.role === 'fighter') {
      this.addFighterModel(model, player);
    } else if (player.role === 'referee') {
      this.addRefereeModel(model, player);
    } else {
      this.addViewerModel(model, player);
    }

    this.addCommonElements(model);

    model.position.set(player.position.x, player.position.y, player.position.z);
    model.rotation.y = player.rotation || 0;

    return model;
  }

  addFighterModel(model, player) {
    const c = MODEL_CONSTANTS.FIGHTER;
    
    // Body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(c.BODY_RADIUS, 32, 32);
    const bodyColor = new THREE.Color().setHSL(player.colorId * 0.1, 0.8, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    model.add(body);

    // Head with face
    this.addHead(model, player);

    // Make sure all limbs cast shadows
    const armGeometry = new THREE.CylinderGeometry(c.ARM_RADIUS, c.ARM_RADIUS, c.ARM_LENGTH, 32);
    const armMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.2 
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 0.2, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.castShadow = true;
    leftArm.receiveShadow = true;
    model.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 0.2, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.castShadow = true;
    rightArm.receiveShadow = true;
    model.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(c.LEG_RADIUS, c.LEG_RADIUS, c.LEG_LENGTH, 32);
    const legMaterial = new THREE.MeshStandardMaterial({ 
      color: bodyColor,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.4, -0.8, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.4, -0.8, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    model.add(rightLeg);
  }

  addRefereeModel(model, player) {
    const c = MODEL_CONSTANTS.REFEREE;

    // Body (slim capsule)
    const bodyGeometry = new THREE.CapsuleGeometry(c.BODY_RADIUS, c.BODY_HEIGHT, 8, 16);
    const bodyColor = new THREE.Color().setHSL(player.colorId * 0.1, 0.5, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    model.add(body);

    // Head with face (slightly higher than other models)
    const headGroup = new THREE.Group();
    headGroup.position.y = c.BODY_HEIGHT / 2 + 0.2;
    model.add(headGroup);
    
    // Add face to the head group
    this.addHead(headGroup, player);

    // Traditional flat-top hat
    const hatGeometry = new THREE.CylinderGeometry(c.HAT_RADIUS, c.HAT_RADIUS, c.HAT_HEIGHT, 16);
    const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 1.3;
    model.add(hat);

    // Decorative hat band
    const hatBandGeometry = new THREE.TorusGeometry(c.HAT_RADIUS + 0.01, 0.05, 8, 16);
    const hatBandMaterial = new THREE.MeshStandardMaterial({ color: 0xB8860B });
    const hatBand = new THREE.Mesh(hatBandGeometry, hatBandMaterial);
    hatBand.position.y = 1.3;
    hatBand.rotation.x = Math.PI / 2;
    model.add(hatBand);

    // Ceremonial Robe
    const robeGeometry = new THREE.ConeGeometry(c.ROBE_RADIUS, c.ROBE_HEIGHT, 16);
    const robeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      side: THREE.DoubleSide 
    });
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.y = -0.3;
    model.add(robe);

    // Decorative Sash
    const sashGeometry = new THREE.BoxGeometry(c.SASH_WIDTH, c.SASH_HEIGHT, 0.05);
    const sashMaterial = new THREE.MeshStandardMaterial({ color: 0xB8860B });
    const sash = new THREE.Mesh(sashGeometry, sashMaterial);
    sash.position.set(0, 0.2, 0.3);
    model.add(sash);

    // Ceremonial Fan
    const fanGroup = new THREE.Group();
    
    // Fan base
    const fanBaseGeometry = new THREE.BoxGeometry(c.FAN_WIDTH, c.FAN_HEIGHT, 0.02);
    const fanMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf1c40f,
      side: THREE.DoubleSide 
    });
    const fanBase = new THREE.Mesh(fanBaseGeometry, fanMaterial);
    fanGroup.add(fanBase);

    // Fan decorative lines
    for (let i = 0; i < 5; i++) {
      const lineGeometry = new THREE.BoxGeometry(c.FAN_WIDTH * 0.9, 0.02, 0.03);
      const lineMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.y = -c.FAN_HEIGHT/2 + (i + 1) * c.FAN_HEIGHT/6;
      fanGroup.add(line);
    }

    // Fan handle
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, c.FAN_HEIGHT * 0.3, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.1;
    handle.position.y = -c.FAN_HEIGHT/2;
    fanGroup.add(handle);

    // Position the entire fan group
    fanGroup.position.set(0.8, 0.4, 0);
    fanGroup.rotation.z = Math.PI / 6;
    model.add(fanGroup);

    // Add sleeve details to the robe
    const sleeveGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 8);
    const sleeveMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      side: THREE.DoubleSide 
    });

    // Left sleeve
    const leftSleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
    leftSleeve.position.set(-0.5, 0.3, 0);
    leftSleeve.rotation.z = Math.PI / 4;
    model.add(leftSleeve);

    // Right sleeve
    const rightSleeve = new THREE.Mesh(sleeveGeometry, sleeveMaterial);
    rightSleeve.position.set(0.5, 0.3, 0);
    rightSleeve.rotation.z = -Math.PI / 4;
    model.add(rightSleeve);

    model.rotation.y = Math.PI / 2;
  }

  addViewerModel(model, player) {
    const c = MODEL_CONSTANTS.VIEWER;

    // Body (slim capsule)
    const bodyGeometry = new THREE.CapsuleGeometry(c.BODY_RADIUS, c.BODY_HEIGHT, 4, 8);
    const bodyColor = new THREE.Color().setHSL(player.colorId * 0.1, 0.7, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    model.add(body);

    // Head with face
    this.addHead(model, player);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(c.ARM_RADIUS, c.ARM_RADIUS, c.ARM_LENGTH, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.2, 0);
    leftArm.rotation.z = Math.PI / 6;
    model.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    model.add(rightArm);
  }

  addHead(model, player) {
    const c = MODEL_CONSTANTS.COMMON;

    // Head sphere
    const headGeometry = new THREE.SphereGeometry(MODEL_CONSTANTS.FIGHTER.HEAD_RADIUS, 32, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      map: this.faceTextures[player.faceId]
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1;
    model.add(head);

    // Face plane
    const faceGeometry = new THREE.PlaneGeometry(c.FACE_SIZE, c.FACE_SIZE);
    const faceMaterial = new THREE.MeshBasicMaterial({ 
      map: this.faceTextures[player.faceId],
      transparent: true
    });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.set(0, 1, 0.41);
    model.add(face);
  }

  addCommonElements(model) {
    const c = MODEL_CONSTANTS.COMMON;

    // Emote bubble
    const emoteBubbleGeometry = new THREE.PlaneGeometry(c.EMOTE_SIZE, c.EMOTE_SIZE);
    const emoteBubbleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    const emoteBubble = new THREE.Mesh(emoteBubbleGeometry, emoteBubbleMaterial);
    emoteBubble.position.set(0, 2, 0);
    emoteBubble.visible = false;
    emoteBubble.name = 'emoteBubble';
    model.add(emoteBubble);

    // Text bubble
    const textBubbleGeometry = new THREE.PlaneGeometry(c.TEXT_BUBBLE_WIDTH, c.TEXT_BUBBLE_HEIGHT);
    const textBubbleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false
    });
    const textBubble = new THREE.Mesh(textBubbleGeometry, textBubbleMaterial);
    textBubble.position.set(0, 2.8, 0);
    textBubble.visible = false;
    textBubble.name = 'textBubble';
    model.add(textBubble);
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
    
    // Add some lanterns for ambient lighting
    this.addStageLighting(stadiumGroup, wallDistance);
    
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
    
    // Add additional cross-beams for structural appearance
    const directions = [
      {x: distance, z: 0},
      {x: 0, z: distance},
      {x: -distance, z: 0},
      {x: 0, z: -distance}
    ];
    
    directions.forEach(dir => {
      const beamGeometry = new THREE.BoxGeometry(distance * 2, 0.6, 0.6);
      const beamMaterial = new THREE.MeshStandardMaterial({
        color: s.BEAM_COLOR,
        roughness: 0.7,
        metalness: 0.2
      });
      
      const crossBeam = new THREE.Mesh(beamGeometry, beamMaterial);
      
      // Position at center of the roof
      crossBeam.position.y = height + roofPeakHeight * 0.6;
      
      // Rotate and position based on direction
      if (dir.x === 0) {
        // North-South beam
        crossBeam.rotation.y = Math.PI / 2;
      }
      
      crossBeam.castShadow = true;
      roofGroup.add(crossBeam);
    });
    
    return roofGroup;
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
   * @returns {THREE.Group} A group containing the complete stadium
   */
  static createCompleteStadium(ringRadius, ringHeight, seatingOptions) {
    const stadiumGroup = new THREE.Group();
    
    // Calculate seating layout
    const { totalRows, maxDistance } = this.calculateSeatingLayout(
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
   * Creates the sumo ring structure including the platform and border
   * @param {number} ringRadius - The radius of the sumo ring
   * @param {number} ringHeight - The height of the ring platform
   * @returns {THREE.Group} A group containing the ring elements
   */
  static createRing(ringRadius, ringHeight) {
    const ringGroup = new THREE.Group();

    // Create the main circular platform
    const ringGeometry = new THREE.CylinderGeometry(
      ringRadius,
      ringRadius,
      ringHeight,
      32
    );
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xD2B48C,
      roughness: 0.7,
      metalness: 0.1
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = ringHeight / 2;
    ring.receiveShadow = true;
    ringGroup.add(ring);

    // Create the square border
    const borderGeometry = new THREE.BoxGeometry(
      ringRadius * 2,
      ringHeight * 1.2,
      ringRadius * 2
    );
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.2
    });
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = ringHeight / 2;
    border.receiveShadow = true;
    ringGroup.add(border);

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
   * Creates the audience seating areas around the ring
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

    const benchGeometry = new THREE.BoxGeometry(BENCH_WIDTH, BENCH_HEIGHT, BENCH_DEPTH);
    const benchMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8,
      metalness: 0.2
    });

    let currentRowSeats = seatsPerFirstRow;
    let currentDistance = firstRowDistance;
    let currentElevation = 0;

    for (let row = 0; row < totalRows; row++) {
      const rowAngleStep = (Math.PI * 2) / currentRowSeats;
      
      for (let seat = 0; seat < currentRowSeats; seat++) {
        const angle = rowAngleStep * seat;
        
        const bench = new THREE.Mesh(benchGeometry, benchMaterial);
        
        bench.position.x = Math.sin(angle) * currentDistance;
        bench.position.y = currentElevation;
        bench.position.z = Math.cos(angle) * currentDistance;
        
        bench.rotation.y = angle + Math.PI / 2;
        
        bench.castShadow = true;
        bench.receiveShadow = true;
        
        audienceGroup.add(bench);
      }
      
      currentRowSeats += seatsIncrement;
      currentDistance += rowSpacing;
      currentElevation += elevationIncrement;
    }

    return audienceGroup;
  }
} 