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
        
        // Add CSS classes and set styles through JS to keep everything in one file
        this.setupStyles();
    }

    setupStyles() {
        // Add styles to head
        const style = document.createElement('style');
        style.textContent = `
            #intro-animation-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                overflow: hidden;
                pointer-events: none;
            }
            
            .intro-title {
                font-family: 'Yuji Mai', serif;
                font-size: 10vw;
                color: #fff;
                display: flex;
                flex-direction: row;
                position: relative;
                text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            
            .title-part {
                position: relative;
                transition: transform 1.2s cubic-bezier(0.6, 0.2, 0.1, 1), 
                            rotate 1.2s cubic-bezier(0.6, 0.1, 0.3, 1);
            }
            
            .slash-line {
                position: absolute;
                width: 0;
                height: 3px;
                background-color:rgb(255, 255, 255);
                transform-origin: top center;
                box-shadow: 0 0 8px rgb(255, 255, 255);
                z-index: 10001;
                transition: height 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
            }
        `;
        document.head.appendChild(style);
    }

    async play() {
        if (this.hasPlayed) {
            return;
        }
        
        this.hasPlayed = true;
        
        // Create the title elements
        const titleElement = document.createElement('div');
        titleElement.className = 'intro-title';
        
        const firstPart = document.createElement('div');
        firstPart.className = 'title-part first-part';
        firstPart.textContent = 'Sumo';
        
        const secondPart = document.createElement('div');
        secondPart.className = 'title-part second-part';
        secondPart.textContent = 'Sumo';
        
        titleElement.appendChild(firstPart);
        titleElement.appendChild(secondPart);
        
        // Create slash line
        const slashLine = document.createElement('div');
        slashLine.className = 'slash-line';
        
        // Add elements to container
        this.animationContainer.appendChild(titleElement);
        this.animationContainer.appendChild(slashLine);
        
        // Animation sequence
        await this.wait(2000); // Keep text for 2 seconds
        
        // Position the slash line to cut through the middle of the text
        const titleRect = titleElement.getBoundingClientRect();
        const middleX = titleRect.left + titleRect.width / 2;
        
        // Position slash line at the middle-top of text with slight angle
        slashLine.style.top = `${titleRect.top + 10}px`;
        slashLine.style.left = `${middleX - 35}px`;
        slashLine.style.width = `3px`; // Fixed width
        slashLine.style.height = `0`;
        slashLine.style.transform = `rotate(-20deg)`; // Slight angle
        
        // Animate the slash growing from top to bottom
        slashLine.style.height = `${titleRect.height + 20}px`;
        
        await this.wait(100);
        
        // Make slashed parts fall with physics
        firstPart.style.transform = 'translateY(100vh) translateX(-30vw) rotate(-25deg)';
        secondPart.style.transform = 'translateY(100vh) translateX(30vw) rotate(25deg)';
        
        // Clean up after animation completes
        await this.wait(500);
        this.animationContainer.remove();
    }
    
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const introAnimation = new IntroAnimation(); 