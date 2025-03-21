// Utility functions for the SumoSumo game

// Create a random color
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Create a simple circle geometry
function createCircleGeometry(radius, segments = 32) {
  return new THREE.CircleGeometry(radius, segments);
}

// Create a simple material with the given color
function createMaterial(color) {
  return new THREE.MeshBasicMaterial({ color: color });
}

// Create a text bubble for emotes
function createEmoteBubble(text, parentElement) {
  const bubble = document.createElement('div');
  bubble.className = 'emote-bubble';
  bubble.textContent = text;
  parentElement.appendChild(bubble);
  
  // Remove the bubble after animation completes
  setTimeout(() => {
    bubble.remove();
  }, 2000);
  
  return bubble;
}

// Position a 2D bubble at a 3D position
function positionBubbleAt3DPoint(bubble, position, camera, container) {
  // Convert 3D position to screen coordinates
  const vector = new THREE.Vector3(position.x, position.y, position.z);
  vector.project(camera);
  
  const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
  const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;
  
  // Position the bubble
  bubble.style.left = `${x}px`;
  bubble.style.top = `${y}px`;
}

// Create a ring geometry
function createRingGeometry(innerRadius, outerRadius, segments = 32) {
  return new THREE.RingGeometry(innerRadius, outerRadius, segments);
}

// Linear interpolation function
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

// Ease in-out function
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Check if a point is inside the ring
function isInsideRing(position, ringRadius) {
  return Math.sqrt(position.x * position.x + position.y * position.y) < ringRadius;
} 