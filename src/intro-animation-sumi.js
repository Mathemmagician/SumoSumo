import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const INTRO_IMAGES = [
  { path: './Intro.png', weight: 40 },
  { path: './Intro2.png', weight: 30 },
  { path: './Intro3.png', weight: 30 },
];

class SumiEAnimation {
  constructor() {
    this.animationContainer = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.hasPlayed = false;
    this.animationStartTime = null;
    this.planeGeometry = null;
    this.imageMaterial = null;
    this.imagePlane = null;
    this.totalDuration = 4000; // 8 seconds total for the animation
    
    // Brush stroke timing and parameters
    this.brushStrokes = [
      { 
        startTime: 200,
        duration: 1000,
        direction: new THREE.Vector2(1, 0.2),
        start: new THREE.Vector2(0.0, 0.4),
        end: new THREE.Vector2(1.0, 0.5),
        width: 0.25,
        curve: 0.1
      },
      { 
        startTime: 1400,
        duration: 1000,
        direction: new THREE.Vector2(-1, 0.1),
        start: new THREE.Vector2(1.0, 0.1),
        end: new THREE.Vector2(0.0, 0.1),
        width: 0.25,
        curve: -0.15
      },
      { 
        startTime: 2600,
        duration: 1000,
        direction: new THREE.Vector2(0.2, 1.0),
        start: new THREE.Vector2(0.0, 0.7),
        end: new THREE.Vector2(1.0, 0.8),
        width: 0.35,
        curve: 0.05
      }
    ];

    // Add a property to store the selected image path
    this.selectedImagePath = null;
  }

  // Add a new method for weighted random selection
  selectRandomImage() {
    // Calculate total weight
    const totalWeight = INTRO_IMAGES.reduce((sum, image) => sum + image.weight, 0);
    
    // Generate a random number between 0 and totalWeight
    const randomValue = Math.random() * totalWeight;
    
    // Find the image that corresponds to the random value
    let cumulativeWeight = 0;
    
    for (const image of INTRO_IMAGES) {
      cumulativeWeight += image.weight;
      
      if (randomValue <= cumulativeWeight) {
        return image.path;
      }
    }
    
    // Fallback to the first image (should never get here unless weights are 0)
    return INTRO_IMAGES[0].path;
  }

  async initialize() {
    // Add CSS to ensure visibility
    const style = document.createElement('style');
    style.textContent = `
      #intro-animation-container {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 9999 !important;
        pointer-events: none;
      }
      
      #intro-animation-container canvas {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);
    
    // Create animation container
    this.animationContainer = document.createElement('div');
    this.animationContainer.id = 'intro-animation-container';
    this.animationContainer.style.position = 'fixed';
    this.animationContainer.style.top = '0';
    this.animationContainer.style.left = '0';
    this.animationContainer.style.width = '100%';
    this.animationContainer.style.height = '100%';
    this.animationContainer.style.zIndex = '9999';
    this.animationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    this.animationContainer.style.opacity = '0';
    this.animationContainer.style.transition = 'opacity 0.5s ease';
    document.body.appendChild(this.animationContainer);

    // Create a Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.animationContainer.appendChild(this.renderer.domElement);

    // Create scene and camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      1,
      1000
    );
    this.camera.position.z = 5;

    // Select a random image before loading
    this.selectedImagePath = this.selectRandomImage();
    console.log(`Selected intro image: ${this.selectedImagePath}`);
    
    // Load textures
    let imageTexture, brushTexture;
    
    try {
      // Load the randomly selected image
      imageTexture = await this.loadTexture(this.selectedImagePath);
    } catch (error) {
      console.error(`Failed to load image: ${this.selectedImagePath}`, error);
      // Try loading other images in sequence if the first one fails
      for (const image of INTRO_IMAGES) {
        if (image.path !== this.selectedImagePath) {
          try {
            console.log(`Trying alternative image: ${image.path}`);
            imageTexture = await this.loadTexture(image.path);
            this.selectedImagePath = image.path; // Update selected path
            break;
          } catch (altError) {
            console.error(`Failed to load alternative image: ${image.path}`, altError);
          }
        }
      }
      
      // If all images fail, create placeholder
      if (!imageTexture) {
        imageTexture = this.createPlaceholderTexture();
      }
    }
    
    try {
      brushTexture = await this.loadTexture('./brush-stroke.png');
    } catch (error) {
      brushTexture = this.createBrushTexture();
    }

    // Create shader material with the updated brush stroke effect
    this.imageMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tImage: { value: imageTexture },
        tBrush: { value: brushTexture },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        
        // Uniforms for the first brush stroke
        uStroke1Start: { value: this.brushStrokes[0].start },
        uStroke1End: { value: this.brushStrokes[0].end },
        uStroke1Direction: { value: this.brushStrokes[0].direction },
        uStroke1Width: { value: this.brushStrokes[0].width },
        uStroke1Progress: { value: 0.0 },
        uStroke1Curve: { value: this.brushStrokes[0].curve },
        
        // Uniforms for the second brush stroke
        uStroke2Start: { value: this.brushStrokes[1].start },
        uStroke2End: { value: this.brushStrokes[1].end },
        uStroke2Direction: { value: this.brushStrokes[1].direction },
        uStroke2Width: { value: this.brushStrokes[1].width },
        uStroke2Progress: { value: 0.0 },
        uStroke2Curve: { value: this.brushStrokes[1].curve },
        
        // Uniforms for the third brush stroke
        uStroke3Start: { value: this.brushStrokes[2].start },
        uStroke3End: { value: this.brushStrokes[2].end },
        uStroke3Direction: { value: this.brushStrokes[2].direction },
        uStroke3Width: { value: this.brushStrokes[2].width },
        uStroke3Progress: { value: 0.0 },
        uStroke3Curve: { value: this.brushStrokes[2].curve },
        
        // Visual effect parameters
        uInkOpacity: { value: 0.9 },
        uInkBleed: { value: 0.03 },
        uGrainStrength: { value: 0.1 },
        uVignetteStrength: { value: 0.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tImage;
        uniform sampler2D tBrush;
        uniform float uTime;
        uniform vec2 uResolution;
        
        // Brush stroke 1 parameters
        uniform vec2 uStroke1Start;
        uniform vec2 uStroke1End;
        uniform vec2 uStroke1Direction;
        uniform float uStroke1Width;
        uniform float uStroke1Progress;
        uniform float uStroke1Curve;
        
        // Brush stroke 2 parameters
        uniform vec2 uStroke2Start;
        uniform vec2 uStroke2End;
        uniform vec2 uStroke2Direction;
        uniform float uStroke2Width;
        uniform float uStroke2Progress;
        uniform float uStroke2Curve;
        
        // Brush stroke 3 parameters
        uniform vec2 uStroke3Start;
        uniform vec2 uStroke3End;
        uniform vec2 uStroke3Direction;
        uniform float uStroke3Width;
        uniform float uStroke3Progress;
        uniform float uStroke3Curve;
        
        // Effect parameters
        uniform float uInkOpacity;
        uniform float uInkBleed;
        uniform float uGrainStrength;
        uniform float uVignetteStrength;
        
        varying vec2 vUv;
        
        // Simple noise function
        float noise(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // Distance from point to line segment
        float distToLine(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a;
          vec2 ba = b - a;
          float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          vec2 closestPoint = a + t * ba;
          return distance(p, closestPoint);
        }
        
        // Calculate distance to a curved line
        float distToCurvedLine(vec2 p, vec2 start, vec2 end, float curvature) {
          // Calculate the midpoint and add curvature
          vec2 mid = (start + end) * 0.5;
          vec2 normal = vec2(-(end.y - start.y), end.x - start.x);
          normal = normalize(normal) * curvature;
          vec2 curvePoint = mid + normal;
          
          // Use quadratic bezier for the curve
          float minDist = 1.0;
          float steps = 10.0;
          
          for (float t = 0.0; t <= 1.0; t += 1.0/steps) {
            // Quadratic bezier point
            vec2 q0 = mix(start, curvePoint, t);
            vec2 q1 = mix(curvePoint, end, t);
            vec2 point = mix(q0, q1, t);
            
            float d = distance(p, point);
            minDist = min(minDist, d);
          }
          
          return minDist;
        }
        
        // Calculate brush stroke mask based on progress and distance
        float brushStrokeMask(vec2 uv, vec2 start, vec2 end, vec2 direction, float width, float progress, float curve) {
          // Calculate distance to the curved line
          float dist = distToCurvedLine(uv, start, end, curve);
          
          // Calculate progress along the line (0 to 1)
          vec2 lineVector = end - start;
          float lineLength = length(lineVector);
          vec2 dir = lineVector / lineLength;
          
          // Project uv onto the line
          vec2 toUv = uv - start;
          float projDist = dot(toUv, dir);
          float normalizedDist = projDist / lineLength;
          
          // Width modulation based on brush texture and position along line
          float widthMod = texture2D(tBrush, vec2(normalizedDist, 0.5)).r * 0.5 + 0.75;
          float strokeWidth = width * widthMod;
          
          // Sharp cutoff at the progress point
          float progressCutoff = step(normalizedDist, progress);
          
          // Feather the edges of the stroke
          float feather = 0.01; // Adjust for harder or softer edges
          float featheredEdge = smoothstep(strokeWidth, strokeWidth - feather, dist);
          
          // Apply the cutoff and feathering
          return featheredEdge * progressCutoff;
        }
        
        void main() {
          // Get the base image color
          vec4 imgColor = texture2D(tImage, vUv);
          
          // Calculate each brush stroke mask
          float stroke1 = brushStrokeMask(vUv, 
                                         uStroke1Start, 
                                         uStroke1End, 
                                         uStroke1Direction, 
                                         uStroke1Width, 
                                         uStroke1Progress,
                                         uStroke1Curve);
          
          float stroke2 = brushStrokeMask(vUv, 
                                         uStroke2Start, 
                                         uStroke2End, 
                                         uStroke2Direction, 
                                         uStroke2Width, 
                                         uStroke2Progress,
                                         uStroke2Curve);
          
          float stroke3 = brushStrokeMask(vUv, 
                                         uStroke3Start, 
                                         uStroke3End, 
                                         uStroke3Direction, 
                                         uStroke3Width, 
                                         uStroke3Progress,
                                         uStroke3Curve);
          
          // Combine all strokes
          float combinedMask = max(max(stroke1, stroke2), stroke3);
          
          // Create ink bleeding effect
          float brushNoise = texture2D(tBrush, vUv * 2.0 + uTime * 0.05).r;
          vec2 bleedOffset = vec2(
            (brushNoise * 2.0 - 1.0) * 0.01,
            (brushNoise * 2.0 - 1.0) * 0.01
          ) * uInkBleed * combinedMask;
          
          vec4 bleedColor = texture2D(tImage, vUv + bleedOffset);
          
          // Apply vignette effect
          float dist = distance(vUv, vec2(0.5, 0.5));
          float vignette = 1.0 - dist * uVignetteStrength * 2.0;
          vignette = smoothstep(0.0, 1.0, vignette);
          
          // Apply grain effect
          float grain = (noise(vUv * 500.0 + uTime) * 2.0 - 1.0) * uGrainStrength;
          
          // Create darker ink areas and lighter areas
          float inkVariation = noise(vUv * 3.0) * 0.2 - 0.1;
          
          // Mix the bleeding effect with the original
          vec4 finalColor = mix(imgColor, bleedColor, uInkBleed * 5.0 * combinedMask);
          
          // Apply effects
          finalColor.rgb *= vignette;
          finalColor.rgb += grain * combinedMask;
          finalColor.rgb += inkVariation * combinedMask;
          
          // Apply the combined mask for alpha
          finalColor.a = imgColor.a * combinedMask * uInkOpacity;
          
          gl_FragColor = finalColor;
        }
      `,
      transparent: true,
    });

    // Calculate aspect ratio to maintain image proportions
    const imageAspect = imageTexture.image ? imageTexture.image.width / imageTexture.image.height : 16/9;
    const screenAspect = window.innerWidth / window.innerHeight;
    
    let planeWidth, planeHeight;
    
    if (imageAspect > screenAspect) {
      // Image is wider than screen
      planeWidth = window.innerWidth;
      planeHeight = planeWidth / imageAspect;
    } else {
      // Image is taller than screen
      planeHeight = window.innerHeight;
      planeWidth = planeHeight * imageAspect;
    }

    // Create plane with correct aspect ratio
    this.planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    this.imagePlane = new THREE.Mesh(this.planeGeometry, this.imageMaterial);
    this.scene.add(this.imagePlane);

    // Set up post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Add subtle paper texture effect pass
    const paperTexturePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uPaperStrength: { value: 0.1 }, // Subtle paper texture
        uTime: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uPaperStrength;
        uniform float uTime;
        varying vec2 vUv;
        
        // A more subtle noise function that resembles paper texture
        float paperNoise(vec2 uv) {
          // Use multiple layers of noise for a more natural look
          float noise1 = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
          float noise2 = fract(sin(dot(uv * 2.5, vec2(12.9898, 78.233))) * 43758.5453);
          float noise3 = fract(sin(dot(uv * 5.0, vec2(12.9898, 78.233))) * 43758.5453);
          
          return (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2);
        }
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          
          // Generate paper texture
          float paper = paperNoise(vUv * 8.0 + uTime * 0.01);
          
          // Apply subtle paper texture effect
          texel.rgb += (paper * 2.0 - 1.0) * uPaperStrength;
          
          gl_FragColor = texel;
        }
      `
    });
    this.composer.addPass(paperTexturePass);

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  onWindowResize() {
    // Update camera
    this.camera.left = window.innerWidth / -2;
    this.camera.right = window.innerWidth / 2;
    this.camera.top = window.innerHeight / 2;
    this.camera.bottom = window.innerHeight / -2;
    this.camera.updateProjectionMatrix();

    // Update renderer and composer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // Update uniforms
    if (this.imageMaterial && this.imageMaterial.uniforms) {
      this.imageMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
  }

  loadTexture(url) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(url, resolve, undefined, reject);
    });
  }

  createPlaceholderTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("SUMO SUMO", canvas.width/2, canvas.height/2);
    return new THREE.CanvasTexture(canvas);
  }

  createBrushTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create gradient for brush stroke
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
    gradient.addColorStop(0.2, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some brush texture variations
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 2 + Math.random() * 8;
      const opacity = 0.1 + Math.random() * 0.3;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }

  async play() {
    if (this.hasPlayed) {
      return;
    }

    // Initialize if not already
    if (!this.animationContainer) {
      await this.initialize();
    }

    this.hasPlayed = true;
    this.animationStartTime = performance.now();

    // Fade in container
    this.animationContainer.style.opacity = '1';

    // Start animation loop
    this.animate();

    // Return promise that resolves when animation completes
    return new Promise(resolve => {
      setTimeout(() => {
        // Fade out container
        this.animationContainer.style.opacity = '0';
        
        // Clean up after fade out - reduced timeout from 500ms to 300ms
        setTimeout(() => {
          if (this.animationContainer) {
            this.animationContainer.remove();
            this.animationContainer = null;
          }
          resolve();
        }, 200);
      }, this.totalDuration);
    });
  }

  animate() {
    if (!this.animationContainer) {
      return;
    }

    try {
      const currentTime = performance.now();
      const elapsed = currentTime - this.animationStartTime;

      // Update time uniform for all shaders
      if (this.imageMaterial) {
        this.imageMaterial.uniforms.uTime.value = elapsed * 0.001; // in seconds
      }
      
      // Update each brush stroke progress based on timing
      for (let i = 0; i < this.brushStrokes.length; i++) {
        const stroke = this.brushStrokes[i];
        const strokeElapsed = Math.max(0, elapsed - stroke.startTime);
        const strokeProgress = Math.min(1.0, strokeElapsed / stroke.duration);
        
        // Calculate eased progress for more natural brush movements
        const easedProgress = this.easeOutQuart(strokeProgress);
        
        // Set the progress uniform for this stroke
        const uniformName = `uStroke${i+1}Progress`;
        if (this.imageMaterial && this.imageMaterial.uniforms[uniformName]) {
          this.imageMaterial.uniforms[uniformName].value = easedProgress;
        }
      }

      // Render scene with post-processing
      if (this.composer) {
        this.composer.render();
      } else if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      // Continue animation if still playing
      if (elapsed < this.totalDuration) {
        requestAnimationFrame(() => this.animate());
      }
    } catch (error) {
      console.error("Error in animation loop:", error);
    }
  }

  // Easing functions for more natural brush strokes
  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
}

// Export singleton instance
export const sumiEAnimation = new SumiEAnimation(); 