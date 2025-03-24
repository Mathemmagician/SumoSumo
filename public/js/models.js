// Import THREE if needed (if using modules)
// import * as THREE from 'three';

// Constants for model dimensions
const MODEL_CONSTANTS = {
  FIGHTER: {
    BODY_RADIUS: 1,
    ARM_RADIUS: 0.2,
    ARM_LENGTH: 1,
    LEG_RADIUS: 0.25,
    LEG_LENGTH: 1,
    HEAD_RADIUS: 0.4
  },
  REFEREE: {
    BODY_RADIUS: 0.5,
    BODY_HEIGHT: 1.5,
    ROBE_RADIUS: 0.8,
    ROBE_HEIGHT: 1.8,
    FAN_WIDTH: 0.1,
    FAN_HEIGHT: 0.4
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
  }
};

class ModelFactory {
  constructor(faceTextures) {
    this.faceTextures = faceTextures;
  }

  createPlayerModel(player) {
    const model = new THREE.Group();
    model.userData = {
      id: player.id,
      role: player.role
    };

    // Create the appropriate model based on role
    if (player.role === 'fighter') {
      this.addFighterModel(model, player);
    } else if (player.role === 'referee') {
      this.addRefereeModel(model, player);
    } else {
      this.addViewerModel(model, player);
    }

    // Add common elements (emote/text bubbles)
    this.addCommonElements(model);

    // Set initial transform
    model.position.set(player.position.x, player.position.y, player.position.z);
    model.rotation.y = player.rotation || 0;

    return model;
  }

  addFighterModel(model, player) {
    const c = MODEL_CONSTANTS.FIGHTER;
    
    // Body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(c.BODY_RADIUS, 32, 32);
    const bodyColor = new THREE.Color().setHSL(player.colorId * 0.1, 0.8, 0.6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    model.add(body);

    // Head with face
    this.addHead(model, player);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(c.ARM_RADIUS, c.ARM_RADIUS, c.ARM_LENGTH, 32);
    const armMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.8, 0.2, 0);
    leftArm.rotation.z = Math.PI / 4;
    model.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.8, 0.2, 0);
    rightArm.rotation.z = -Math.PI / 4;
    model.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(c.LEG_RADIUS, c.LEG_RADIUS, c.LEG_LENGTH, 32);
    const legMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.4, -0.8, 0);
    model.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.4, -0.8, 0);
    model.add(rightLeg);
  }

  addRefereeModel(model, player) {
    const c = MODEL_CONSTANTS.REFEREE;

    // Body (tall capsule)
    const bodyGeometry = new THREE.CapsuleGeometry(c.BODY_RADIUS, c.BODY_HEIGHT, 4, 8);
    const bodyColor = new THREE.Color().setHSL(player.colorId * 0.1, 0.5, 0.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    model.add(body);

    // Head with face
    this.addHead(model, player);

    // Robe (cone)
    const robeGeometry = new THREE.ConeGeometry(c.ROBE_RADIUS, c.ROBE_HEIGHT, 8);
    const robeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      side: THREE.DoubleSide 
    });
    const robe = new THREE.Mesh(robeGeometry, robeMaterial);
    robe.position.y = -0.5;
    model.add(robe);

    // Fan
    const fanGeometry = new THREE.BoxGeometry(c.FAN_WIDTH, c.FAN_HEIGHT, 0.02);
    const fanMaterial = new THREE.MeshStandardMaterial({ color: 0xf1c40f });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    fan.position.set(0.6, 0.2, 0);
    fan.rotation.z = Math.PI / 4;
    model.add(fan);
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

// Export the factory and constants
window.ModelFactory = ModelFactory;
window.MODEL_CONSTANTS = MODEL_CONSTANTS; 