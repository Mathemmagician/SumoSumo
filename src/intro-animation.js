class IntroAnimation {
    constructor() {
        this.animationContainer = null;
        this.hasPlayed = false;
    }

    initialize() {
        // Create animation container
        this.animationContainer = document.createElement('div');
        this.animationContainer.id = 'intro-animation-container';
        document.body.appendChild(this.animationContainer);
        
        // Create flash element
        this.flashElement = document.createElement('div');
        this.flashElement.className = 'intro-flash';
        this.animationContainer.appendChild(this.flashElement);
    }

    async play() {
        if (this.hasPlayed) {
            return;
        }
        
        this.hasPlayed = true;
        
        // Create the title elements
        const titleElement = document.createElement('div');
        titleElement.className = 'intro-title title-pulse';
        
        const firstPart = document.createElement('div');
        firstPart.className = 'title-part first-part';
        firstPart.textContent = 'Sumo';
        
        const secondPart = document.createElement('div');
        secondPart.className = 'title-part second-part';
        secondPart.textContent = 'Sumo';
        
        titleElement.appendChild(firstPart);
        titleElement.appendChild(secondPart);
        
        // Add elements to container
        this.animationContainer.appendChild(titleElement);
        
        // Dramatic intro build-up
        await this.wait(2500);
        
        // Remove pulse animation
        titleElement.classList.remove('title-pulse');
        
        // Create a single powerful slash
        await this.createSingleSlash(titleElement);
        
        // Break title apart
        firstPart.style.transform = 'translateY(150vh) translateX(-40vw) rotate(-45deg)';
        secondPart.style.transform = 'translateY(150vh) translateX(40vw) rotate(45deg)';
        
        // Fade out background gradually
        await this.wait(300);
        this.animationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        
        await this.wait(300);
        this.animationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        
        // Wait for the transition to complete before removing
        await this.wait(800);
        this.animationContainer.remove();
    }
    
    async createSingleSlash(titleElement) {
        const titleRect = titleElement.getBoundingClientRect();
        
        // Create a canvas for the curved slash
        const canvas = document.createElement('canvas');
        canvas.className = 'slash-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.animationContainer.appendChild(canvas);
        
        // Position the canvas to cover the entire screen
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '1000';
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        
        // Define curve parameters
        const startX = window.innerWidth * 0.8; // Start from right side
        const startY = window.innerHeight * 0.1; // Near top
        const endX = window.innerWidth * 0.2; // End at left side
        const endY = window.innerHeight * 0.9; // Near bottom
        
        // Control points for the curve
        const controlX1 = window.innerWidth * 0.6;
        const controlY1 = window.innerHeight * 0.3;
        const controlX2 = window.innerWidth * 0.4;
        const controlY2 = window.innerHeight * 0.7;
        
        // Track where the slash intersects with the title for cutting effect
        const titleCenterX = titleRect.left + titleRect.width / 2;
        const titleCenterY = titleRect.top + titleRect.height / 2;
        let cutEffectTriggered = false;
        let cutProgress = 0;
        
        // Line parameters
        const lineWidth = 12; // Thicker for impact
        
        // Play slashing sound - using a more dramatic sound
        try {
            const slashSound = new Audio('https://assets.mixkit.co/sfx/download/mixkit-cinematic-metal-hit-swoosh-610.wav');
            slashSound.volume = 0.7;
            
            // Handle autoplay restrictions by using play() with catch
            slashSound.play().catch(e => {
                console.log('Audio autoplay was prevented due to browser policy. This is normal if no user interaction occurred yet.');
                // Continue with animation even if sound fails
            });
        } catch (error) {
            console.log('Audio creation failed:', error);
            // Continue with animation even if sound fails
        }
        
        // Create dramatic flash effect
        this.flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
        
        // Animate the slash
        const totalFrames = 20; // Fewer frames for faster animation
        const animationDuration = 250; // ms - faster animation
        const framesPerMs = totalFrames / animationDuration;
        
        let startTime = null;
        
        const animateSlash = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const currentFrame = Math.min(Math.floor(elapsed * framesPerMs), totalFrames);
            
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (currentFrame < totalFrames) {
                // Calculate progress (0 to 1)
                const progress = currentFrame / totalFrames;
                
                // Calculate the point along the curve at the current progress
                const t = progress;
                const currentX = Math.pow(1-t, 3) * startX + 
                                3 * Math.pow(1-t, 2) * t * controlX1 + 
                                3 * (1-t) * Math.pow(t, 2) * controlX2 + 
                                Math.pow(t, 3) * endX;
                
                const currentY = Math.pow(1-t, 3) * startY + 
                                3 * Math.pow(1-t, 2) * t * controlY1 + 
                                3 * (1-t) * Math.pow(t, 2) * controlY2 + 
                                Math.pow(t, 3) * endY;
                
                // Check if we're near the title center - trigger cut effect
                const distanceToTitle = Math.sqrt(
                    Math.pow(currentX - titleCenterX, 2) + 
                    Math.pow(currentY - titleCenterY, 2)
                );
                
                if (distanceToTitle < 50 && !cutEffectTriggered) {
                    cutEffectTriggered = true;
                    
                    // Add a bright flash when cutting through the title
                    this.flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
                    setTimeout(() => {
                        this.flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }, 100);
                }
                
                // Draw the curve up to the current point
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                
                // Calculate intermediate points for the partial curve
                for (let i = 0; i <= currentFrame; i++) {
                    const t = i / totalFrames;
                    const x = Math.pow(1-t, 3) * startX + 
                              3 * Math.pow(1-t, 2) * t * controlX1 + 
                              3 * (1-t) * Math.pow(t, 2) * controlX2 + 
                              Math.pow(t, 3) * endX;
                    
                    const y = Math.pow(1-t, 3) * startY + 
                              3 * Math.pow(1-t, 2) * t * controlY1 + 
                              3 * (1-t) * Math.pow(t, 2) * controlY2 + 
                              Math.pow(t, 3) * endY;
                    
                    // Create gradient effect
                    const gradient = ctx.createLinearGradient(startX, startY, x, y);
                    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)'); // Intense red at start
                    gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)'); // Orange-red in middle
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.7)'); // Fading to white
                    
                    ctx.strokeStyle = gradient;
                    
                    // Calculate line width - start small, get larger in middle, end small
                    const widthProgress = t < 0.5 ? t * 2 : (1 - t) * 2; // 0->1->0 curve
                    const dynamicWidth = lineWidth * (0.3 + 0.7 * widthProgress); // Scale between 30% and 100% of lineWidth
                    ctx.lineWidth = dynamicWidth;
                    ctx.lineCap = 'round';
                    
                    // Add glow effect based on position
                    ctx.shadowBlur = dynamicWidth * 2;
                    ctx.shadowColor = t < 0.5 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 150, 0, 0.8)';
                    
                    if (i === 0) {
                        ctx.moveTo(startX, startY);
                    } else {
                        const prevT = (i-1) / totalFrames;
                        const prevX = Math.pow(1-prevT, 3) * startX + 
                                      3 * Math.pow(1-prevT, 2) * prevT * controlX1 + 
                                      3 * (1-prevT) * Math.pow(prevT, 2) * controlX2 + 
                                      Math.pow(prevT, 3) * endX;
                        
                        const prevY = Math.pow(1-prevT, 3) * startY + 
                                      3 * Math.pow(1-prevT, 2) * prevT * controlY1 + 
                                      3 * (1-prevT) * Math.pow(prevT, 2) * controlY2 + 
                                      Math.pow(prevT, 3) * endY;
                        
                        ctx.beginPath();
                        ctx.moveTo(prevX, prevY);
                        ctx.lineTo(x, y);
                        ctx.stroke();
                    }
                }
                
                requestAnimationFrame(animateSlash);
            } else {
                // Add a fading trail effect
                setTimeout(() => {
                    // Fade out the canvas
                    canvas.style.transition = 'opacity 0.5s ease';
                    canvas.style.opacity = '0';
                    
                    // Reset flash
                    this.flashElement.style.backgroundColor = 'rgba(255, 255, 255, 0)';
                    
                    // Clean up the canvas
                    setTimeout(() => {
                        canvas.remove();
                    }, 500);
                }, 100);
            }
        };
        
        // Start animation
        await this.wait(50); // Short delay for anticipation
        requestAnimationFrame(animateSlash);
        
        // Wait for animation to complete
        await this.wait(animationDuration + 600); // Animation time + cleanup time
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const introAnimation = new IntroAnimation(); 