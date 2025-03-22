// Main entry point for the game

// Create assets directory and placeholder face textures
function createPlaceholderAssets() {
  // This would normally be done on the server, but for demo purposes
  // we'll create placeholder face textures dynamically
  
  const assetsDir = '/assets';
  
  // Check if we need to create placeholder face textures
  // In a real app, you'd have actual image files
  for (let i = 0; i < 10; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Draw a colored background
    ctx.fillStyle = `hsl(${i * 36}, 100%, 80%)`;
    ctx.fillRect(0, 0, 128, 128);
    
    // Draw eyes
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(40, 50, 10, 0, Math.PI * 2);
    ctx.arc(88, 50, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mouth (different for each face)
    ctx.beginPath();
    if (i % 3 === 0) {
      // Happy face
      ctx.arc(64, 80, 30, 0, Math.PI);
    } else if (i % 3 === 1) {
      // Neutral face
      ctx.moveTo(44, 80);
      ctx.lineTo(84, 80);
    } else {
      // Surprised face
      ctx.arc(64, 90, 15, 0, Math.PI * 2);
    }
    ctx.stroke();
    
    // Convert to blob and create object URL
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      
      // Store in a global variable for the renderer to use
      if (typeof window.placeholderFaceUrls === 'undefined') {
        window.placeholderFaceUrls = [];
      }
      window.placeholderFaceUrls[i] = url;
    });
  }
}

// Initialize the game
function initGame() {
  createPlaceholderAssets();
  
  // The rest of the initialization is handled by socket-client.js
  // which will connect to the server and set up the game state
}

// Start the game when the page loads
window.addEventListener('load', initGame); 