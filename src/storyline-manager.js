// Story content - epic tale of SumoSumo tournament
const STORYLINE = [
  {
    image: "sumo-receiving-a-scroll-in-mountain.jpg",
    text: "From the sacred peaks, scrolls are sent. Only the strongest receive the call to the SumoSumo tournament."
  },
  {
    image: "sumo-is-traveling-throw-mountains.jpg",
    text: "Warriors journey through mountains and rivers, leaving behind all for a chance at glory."
  },
  {
    image: "sumo-on-arena.jpg",
    text: "At the ancient arena, the stage is set. Here, legends will clash, and destiny will be decided."
  },
  {
    image: "sumo-fighting-in-tournament-.jpg",
    text: "Titans clash with thunderous force. Only the strongest will survive the SumoSumo battle."
  },
  {
    image: "sumo-won-a-tournament.jpg",
    text: "One stands victorious. The champion of SumoSumo ascends, immortalized in legend."
  },
  {
    image: "sumo-won-a-tournament.jpg",
    type: "credits",
    title: "SumoSumo Credits",
    credits: [
      { role: "Executive Producer", name: "Murad & Ramil" },
      { role: "Game Director", name: "Murad" },
      { role: "Lead Developer", name: "Ramil" },
      { role: "Art Director", name: "Ramil & Murad" },
      { role: "Creative Director", name: "Murad" },
      { role: "Sound Designer", name: "Murad & Ramil" },
      { role: "Music Composer", name: "Ramil" },
      { role: "Lead Animator", name: "Murad" },
      { role: "Story Writer", name: "Ramil" },
      { role: "Gameplay Designer", name: "Murad" },
      { role: "Technical Director", name: "Murad" },
      { role: "Voice Director", name: "Ramil" },
      { role: "UI/UX Designer", name: "Murad" },
      { role: "Project Manager", name: "Ramil" },
      { role: "Quality Assurance Lead", name: "Ramil" },
      { role: "Performance Engineer", name: "Murad" },
      { role: "Physics Engineer", name: "Murad & Ramil" },
      { role: "Networking Engineer", name: "Ramil" },
      { role: "Audio Engineer", name: "Murad" },
      { role: "Concept Artist", name: "Murad" },
      { role: "Character Artist", name: "Ramil & Murad" },
      { role: "Environment Artist", name: "Ramil" },
      { role: "Technical Artist", name: "Murad" },
      { role: "VFX Artist", name: "Ramil" },
      { role: "Animation Director", name: "Murad" },
      { role: "Lead Programmer", name: "Murad & Ramil" },
      { role: "AI Programmer", name: "Ramil" },
      { role: "Graphics Programmer", name: "Murad" },
      { role: "Tools Programmer", name: "Ramil" },
      { role: "Gameplay Programmer", name: "Murad" },
      { role: "UI Programmer", name: "Ramil & Murad" },
      { role: "Web Developer", name: "Murad" },
      { role: "Database Engineer", name: "Murad & Ramil" },
      { role: "Localization Manager", name: "Murad" },
      { role: "Narrative Designer", name: "Ramil" },
      { role: "Worldbuilding", name: "Murad" },
      { role: "Character Designer", name: "Ramil" },
      { role: "Lead Rigger", name: "Murad" },
      { role: "3D Modeler", name: "Ramil & Murad" },
      { role: "Texture Artist", name: "Murad" },
      { role: "Lighting Artist", name: "Ramil" },
      { role: "Motion Capture Director", name: "Murad" },
      { role: "Foley Artist", name: "Ramil" },
      { role: "Sound Effects Editor", name: "Murad & Ramil" },
      { role: "Music Director", name: "Murad" },
      { role: "Orchestrator", name: "Ramil" },
      { role: "Vocal Director", name: "Murad" },
      { role: "Storyboard Artist", name: "Murad & Ramil" },
      { role: "Cinematics Director", name: "Ramil" },
      { role: "Assistant Director", name: "Murad" },
      { role: "Marketing Director", name: "Ramil" },
      { role: "Brand Manager", name: "Murad" },
      { role: "Social Media Manager", name: "Ramil" },
      { role: "Community Manager", name: "Murad & Ramil" },
      { role: "PR Manager", name: "Ramil" },
      { role: "User Research Lead", name: "Murad" },
      { role: "Accessibility Specialist", name: "Ramil" },
      { role: "Localization Tester", name: "Murad" },
      { role: "Compatibility Tester", name: "Ramil" },
      { role: "Gameplay Tester", name: "Murad & Ramil" },
      { role: "Balance Designer", name: "Murad" },
      { role: "Combat Designer", name: "Ramil" },
      { role: "Level Designer", name: "Murad" },
      { role: "Economy Designer", name: "Ramil" },
      { role: "Technical Designer", name: "Murad & Ramil" },
      { role: "Monetization Designer", name: "Murad" },
      { role: "Engagement Designer", name: "Ramil" },
      { role: "Retention Designer", name: "Murad" },
      { role: "Systems Designer", name: "Ramil" },
      { role: "Procedural Designer", name: "Murad & Ramil" },
      { role: "Build Engineer", name: "Ramil" },
      { role: "DevOps Engineer", name: "Murad" },
      { role: "Infrastructure Engineer", name: "Ramil" },
      { role: "Platform Engineer", name: "Murad" },
      { role: "Security Engineer", name: "Ramil" },
      { role: "Backend Developer", name: "Murad & Ramil" },
      { role: "Frontend Developer", name: "Murad" },
      { role: "Full-Stack Developer", name: "Ramil" },
      { role: "Release Manager", name: "Murad" },
      { role: "Legal Counsel", name: "Ramil" },
      { role: "Finance Director", name: "Murad" },
      { role: "Business Development", name: "Ramil" },
      { role: "Human Resources", name: "Murad" },
      { role: "IT Support", name: "Ramil" },
      { role: "Office Manager", name: "Murad" },
      { role: "Facilities Manager", name: "Ramil" },
      { role: "Customer Support Lead", name: "Murad" },
      { role: "Documentation Writer", name: "Ramil" },
      { role: "Historical Consultant", name: "Murad" },
      { role: "Martial Arts Consultant", name: "Ramil" },
      { role: "Cultural Consultant", name: "Murad & Ramil" },
      { role: "Japanese Language Consultant", name: "Ramil" },
      { role: "Sumo Expert", name: "Murad" },
      { role: "Ritual Consultant", name: "Ramil" },
      { role: "Tournament Designer", name: "Murad" },
      { role: "Gameplay Balancer", name: "Ramil" },
      { role: "User Interface Designer", name: "Murad" },
      { role: "User Experience Researcher", name: "Ramil" },
      { role: "Game Economist", name: "Murad" },
      { role: "Analytics Lead", name: "Ramil" },
      { role: "Data Scientist", name: "Murad & Ramil" },
      { role: "Machine Learning Engineer", name: "Ramil" },
      { role: "Content Strategist", name: "Murad" },
      { role: "Content Creator", name: "Ramil" },
      { role: "Streamer Relations", name: "Murad" },
      { role: "Esports Manager", name: "Ramil" },
      { role: "Tournament Organizer", name: "Murad" },
      { role: "Merchandise Designer", name: "Ramil" },
      { role: "Collectibles Designer", name: "Murad" },
      { role: "Licensing Manager", name: "Ramil" },
      { role: "Partnerships Manager", name: "Murad" },
      { role: "Hardware Specialist", name: "Ramil" },
      { role: "VR/AR Specialist", name: "Murad & Ramil" },
      { role: "Mobile Optimization", name: "Ramil" },
      { role: "Console Optimization", name: "Murad" },
      { role: "Platform Certification", name: "Ramil" },
      { role: "DLC Designer", name: "Murad" },
      { role: "Live Events Manager", name: "Ramil" },
      { role: "Season Content Designer", name: "Murad" },
      { role: "Dialog Writer", name: "Ramil" },
      { role: "Lore Master", name: "Murad & Ramil" },
      { role: "History Writer", name: "Ramil" },
      { role: "Copy Editor", name: "Murad" },
      { role: "Subtitle Editor", name: "Ramil" },
      { role: "Accessibility Tester", name: "Murad" },
      { role: "Difficulty Balancer", name: "Ramil" },
      { role: "Tutorial Designer", name: "Murad" },
      { role: "Onboarding Specialist", name: "Ramil" },
      { role: "Player Support", name: "Murad" },
      { role: "Community Events", name: "Ramil" },
      { role: "Fan Art Curator", name: "Murad" },
      { role: "Wiki Manager", name: "Ramil" },
      { role: "Moderator Lead", name: "Murad" },
      { role: "Loyalty Program Designer", name: "Ramil" },
      { role: "Influencer Relations", name: "Murad" },
      { role: "Press Relations", name: "Ramil" },
      { role: "Video Editor", name: "Murad" },
      { role: "Trailer Producer", name: "Ramil" },
      { role: "Photography Director", name: "Murad" },
      { role: "Motion Graphics", name: "Ramil" },
      { role: "Website Designer", name: "Murad" },
      { role: "SEO Specialist", name: "Ramil" },
      { role: "Analytics Interpreter", name: "Murad" },
      { role: "Playtester Coordinator", name: "Ramil" },
      { role: "Beta Test Manager", name: "Murad" },
      { role: "Focus Group Moderator", name: "Ramil" },
      { role: "Research Analyst", name: "Murad" },
      { role: "Competition Designer", name: "Ramil" },
      { role: "Matchmaking Designer", name: "Murad & Ramil" },
      { role: "Lobby Designer", name: "Ramil" },
      { role: "Social Features Designer", name: "Murad" },
      { role: "Voice Chat Engineer", name: "Ramil" },
      { role: "Anti-Cheat Specialist", name: "Murad" },
      { role: "Client-Server Engineer", name: "Ramil" },
      { role: "Authentication Engineer", name: "Murad" },
      { role: "Shader Programmer", name: "Ramil" },
      { role: "Physics Programmer", name: "Murad" },
      { role: "Input Systems Engineer", name: "Ramil" },
      { role: "Camera Systems Engineer", name: "Murad" },
      { role: "Movement Systems Engineer", name: "Ramil" },
      { role: "Cloth Simulation Engineer", name: "Murad" },
      { role: "Weather Systems Programmer", name: "Ramil" },
      { role: "Crowd Simulation Engineer", name: "Murad" },
      { role: "Landscape Artist", name: "Ramil" },
      { role: "Environment Prop Artist", name: "Murad" },
      { role: "Weapon Artist", name: "Ramil" },
      { role: "Clothing Artist", name: "Murad" },
      { role: "Prop Designer", name: "Ramil" },
      { role: "Set Decorator", name: "Murad" },
      { role: "Texture Lead", name: "Ramil" },
      { role: "Senior Engine Programmer", name: "Murad" },
      { role: "Server Administrator", name: "Ramil" },
      { role: "Database Administrator", name: "Murad" },
      { role: "Network Administrator", name: "Ramil" },
      { role: "Security Administrator", name: "Murad" },
      { role: "Cloud Infrastructure", name: "Ramil" },
      { role: "Containerization Specialist", name: "Murad" },
      { role: "Backup Systems Engineer", name: "Ramil" },
      { role: "Disaster Recovery", name: "Murad" },
      { role: "Hotfix Team Lead", name: "Ramil" },
      { role: "Patch Notes Writer", name: "Murad" },
      { role: "Version Control Manager", name: "Ramil" },
      { role: "Executive Assistant", name: "Murad" },
      { role: "Administrative Support", name: "Ramil" },
      { role: "Special Thanks", name: "Murad & Ramil" }
    ]
  }
];

// Voice options with different characteristics
const VOICE_OPTIONS = [
  {
    id: 'epic-narrator',
    name: 'Epic Narrator',
    settings: {
      rate: 0.85,  // Slower pace for drama
      pitch: 0.8,  // Deep, resonant voice
      volume: 1.0
    }
  },
  {
    id: 'battle-master',
    name: 'Battle Master',
    settings: {
      rate: 0.95,
      pitch: 0.7,  // Very deep
      volume: 1.0
    }
  },
  {
    id: 'ancient-sage',
    name: 'Ancient Sage',
    settings: {
      rate: 0.75,  // Very slow, deliberate
      pitch: 0.85,
      volume: 0.9
    }
  },
  {
    id: 'thunder-voice',
    name: 'Thunder Voice',
    settings: {
      rate: 1.0,
      pitch: 0.65,  // Deepest voice
      volume: 1.0
    }
  }
];

class StorylineManager {
  constructor() {
    this.currentSlide = 0;
    this.inStoryMode = false;
    this.storyBtn = null;
    this.storyModal = null;
    this.storyImage = null;
    this.storyText = null;
    this.nextBtn = null;
    this.prevBtn = null;
    this.closeBtn = null;
    this.previousUserRole = null;
    this.narrationButton = null;
    this.isNarrating = false;
    this.speechSynthesis = window.speechSynthesis;
    this.speechUtterance = null;
    this.voiceSelector = null;
    this.creditsContainer = null; // For credits slide scrolling
    // Use Thunder Voice as default
    this.currentVoiceOption = VOICE_OPTIONS.find(voice => voice.id === 'thunder-voice') || VOICE_OPTIONS[0];
    
    // Initialize after DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.createStoryButton();
    this.createStoryModal();
    this.initializeEventListeners();
  }

  createStoryButton() {
    const controlsPanel = document.getElementById('controls-panel');
    
    if (controlsPanel) {
      this.storyBtn = document.createElement('button');
      this.storyBtn.id = 'story-btn';
      this.storyBtn.className = 'ui-btn';
      this.storyBtn.innerHTML = `📖`;
      
      // Insert button before the first element in the controls panel
      if (controlsPanel.firstChild) {
        controlsPanel.insertBefore(this.storyBtn, controlsPanel.firstChild);
      } else {
        controlsPanel.appendChild(this.storyBtn);
      }
    }
  }

  createStoryModal() {
    this.storyModal = document.createElement('div');
    this.storyModal.id = 'story-modal';
    this.storyModal.className = 'modal fullscreen-modal';
    
    // Create fullscreen image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'story-image-container fullscreen';
    
    this.storyImage = document.createElement('img');
    this.storyImage.className = 'story-image';
    this.storyImage.alt = 'Story';
    
    // Add ink splash overlay
    const inkOverlay = document.createElement('div');
    inkOverlay.className = 'ink-overlay';
    
    imageContainer.appendChild(this.storyImage);
    imageContainer.appendChild(inkOverlay);
    this.storyModal.appendChild(imageContainer);
    
    // Create caption container at bottom
    const captionContainer = document.createElement('div');
    captionContainer.className = 'story-caption-container';
    
    this.storyText = document.createElement('p');
    this.storyText.className = 'story-text';
    
    captionContainer.appendChild(this.storyText);
    this.storyModal.appendChild(captionContainer);
    
    // Create close button
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'close-btn story-close-btn';
    this.closeBtn.innerHTML = '&times;';
    this.storyModal.appendChild(this.closeBtn);
    
    // Create narration button
    this.narrationButton = document.createElement('button');
    this.narrationButton.className = 'narration-btn';
    this.narrationButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    `;
    this.narrationButton.title = "Enable narration";
    this.storyModal.appendChild(this.narrationButton);
    
    // Create voice selector
    this.voiceSelector = document.createElement('div');
    this.voiceSelector.className = 'voice-selector';
    this.voiceSelector.style.display = 'none'; // Hide the voice selector
    
    const voiceSelectorLabel = document.createElement('span');
    voiceSelectorLabel.className = 'voice-selector-label';
    voiceSelectorLabel.textContent = 'Choose voice:';
    this.voiceSelector.appendChild(voiceSelectorLabel);
    
    const voiceDropdown = document.createElement('select');
    voiceDropdown.className = 'voice-dropdown';
    
    // Populate dropdown with voice options
    VOICE_OPTIONS.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.id;
      option.textContent = voice.name;
      voiceDropdown.appendChild(option);
    });
    
    voiceDropdown.addEventListener('change', (e) => {
      const selectedVoice = VOICE_OPTIONS.find(voice => voice.id === e.target.value);
      if (selectedVoice) {
        this.currentVoiceOption = selectedVoice;
        if (this.speechUtterance) {
          // Apply the new voice settings
          Object.assign(this.speechUtterance, selectedVoice.settings);
          
          // If currently narrating, restart with new voice
          if (this.isNarrating) {
            this.speakCurrentSlide();
          }
        }
      }
    });
    
    this.voiceSelector.appendChild(voiceDropdown);
    this.storyModal.appendChild(this.voiceSelector);
    
    // Create navigation buttons
    const navButtons = document.createElement('div');
    navButtons.className = 'story-nav-buttons';
    
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'story-nav-btn prev-btn';
    this.prevBtn.innerHTML = '&laquo;';
    
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'story-nav-btn next-btn';
    this.nextBtn.innerHTML = '&raquo;';
    
    // Create and add slide indicator
    const slideIndicator = document.createElement('div');
    slideIndicator.className = 'slide-indicator';
    
    navButtons.appendChild(this.prevBtn);
    navButtons.appendChild(slideIndicator);
    navButtons.appendChild(this.nextBtn);
    this.storyModal.appendChild(navButtons);
    
    document.body.appendChild(this.storyModal);
  }

  initializeEventListeners() {
    if (this.storyBtn) {
      this.storyBtn.addEventListener('click', () => this.openStoryline());
    }
    
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeStoryline());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.nextSlide());
    }
    
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prevSlide());
    }
    
    if (this.narrationButton) {
      this.narrationButton.addEventListener('click', () => this.toggleNarration());
    }
    
    // Close modal when clicking outside of content
    this.storyModal.addEventListener('click', (e) => {
      if (e.target === this.storyModal) {
        this.closeStoryline();
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.inStoryMode) return;
      
      if (e.key === 'Escape') {
        this.closeStoryline();
      } else if (e.key === 'ArrowRight') {
        this.nextSlide();
      } else if (e.key === 'ArrowLeft') {
        this.prevSlide();
      } else if (e.key === 'n') {
        this.toggleNarration();
      }
    });
    
    // Handle speech synthesis events
    if (this.speechSynthesis) {
      this.speechSynthesis.addEventListener('voiceschanged', () => {
        // Initialize voice when available
        this.setupVoice();
      });
    }
  }

  setupVoice() {
    if (!this.speechSynthesis) return;
    
    const voices = this.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    
    // Prefer a deep male voice for the narration
    let selectedVoice = voices.find(voice => 
      voice.name.includes('Male') && 
      (voice.name.includes('US') || voice.name.includes('UK') || voice.name.includes('English'))
    );
    
    // If no specific male voice found, try to get any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        voice.lang.includes('en') || voice.name.includes('English')
      );
    }
    
    // If still no voice found, use the first available
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices[0];
    }
    
    // Create utterance with selected voice
    if (selectedVoice) {
      this.speechUtterance = new SpeechSynthesisUtterance();
      this.speechUtterance.voice = selectedVoice;
      
      // Always use Thunder Voice settings regardless of the actual voice
      const thunderVoice = VOICE_OPTIONS.find(voice => voice.id === 'thunder-voice') || VOICE_OPTIONS[0];
      Object.assign(this.speechUtterance, thunderVoice.settings);
      
      // Set up event listeners for the utterance
      this.speechUtterance.onend = () => {
        if (this.isNarrating && this.currentSlide < STORYLINE.length - 1) {
          // Auto-advance to next slide when narration finishes
          setTimeout(() => {
            this.nextSlide();
          }, 500); // Wait 0.5 seconds before advancing (reduced from 1 second)
        }
      };
    }
  }

  toggleNarration() {
    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }
    
    this.isNarrating = !this.isNarrating;
    
    if (this.isNarrating) {
      // Start narration
      this.narrationButton.classList.add('active');
      this.narrationButton.title = "Disable narration";
      this.speakCurrentSlide();
    } else {
      // Stop narration
      this.narrationButton.classList.remove('active');
      this.narrationButton.title = "Enable narration";
      this.speechSynthesis.cancel();
    }
  }

  speakCurrentSlide() {
    if (!this.isNarrating || !this.speechSynthesis || !this.speechUtterance) return;
    
    // Cancel any ongoing speech
    this.speechSynthesis.cancel();
    
    // Ensure Thunder Voice settings are applied
    const thunderVoice = VOICE_OPTIONS.find(voice => voice.id === 'thunder-voice') || VOICE_OPTIONS[0];
    Object.assign(this.speechUtterance, thunderVoice.settings);
    
    // Set the text to be spoken
    const story = STORYLINE[this.currentSlide];
    this.speechUtterance.text = story.text;
    
    // Speak the text
    this.speechSynthesis.speak(this.speechUtterance);
  }

  openStoryline() {
    this.inStoryMode = true;
    this.storyModal.style.display = 'block';
    this.currentSlide = 0;
    this.updateSlide();
    
    // Initialize voice if not already done
    if (!this.speechUtterance && this.speechSynthesis) {
      this.setupVoice();
    }
    
    // Set narration to off by default
    this.isNarrating = false;
    if (this.narrationButton) {
      this.narrationButton.classList.remove('active');
      this.narrationButton.title = "Enable narration";
    }
    
    // Don't auto-start speaking
  }

  closeStoryline() {
    this.inStoryMode = false;
    this.storyModal.style.display = 'none';
    
    // Stop any ongoing narration
    if (this.speechSynthesis && this.isNarrating) {
      this.speechSynthesis.cancel();
      this.isNarrating = false;
      if (this.narrationButton) {
        this.narrationButton.classList.remove('active');
      }
    }
    
    // Clean up credits if any
    if (this.creditsContainer) {
      this.creditsContainer.remove();
      this.creditsContainer = null;
      
      // Reset image filter
      if (this.storyImage) {
        this.storyImage.style.filter = '';
      }
      
      // Show text again
      if (this.storyText) {
        this.storyText.style.display = '';
      }
      
      // Remove any credits animations
      const creditsStyleElements = document.querySelectorAll('style[data-credits-animation]');
      creditsStyleElements.forEach(el => el.remove());
    }
  }

  nextSlide() {
    if (this.currentSlide < STORYLINE.length - 1) {
      this.currentSlide++;
      this.updateSlide();
      
      // If narration is on, speak the new slide
      if (this.isNarrating) {
        this.speakCurrentSlide();
      }
    }
  }

  prevSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateSlide();
      
      // If narration is on, speak the new slide
      if (this.isNarrating) {
        this.speakCurrentSlide();
      }
    }
  }

  updateSlide() {
    const story = STORYLINE[this.currentSlide];
    
    // Clear any existing credits scrolling animation
    if (this.creditsContainer) {
      this.creditsContainer.remove();
      this.creditsContainer = null;
    }
    
    // Check if this is a credits slide
    if (story.type === 'credits') {
      // Handle credits slide differently
      this.storyImage.src = `/storyline/${story.image}`;
      this.storyImage.classList.remove('fade-in');
      void this.storyImage.offsetWidth; // Trigger reflow
      this.storyImage.classList.add('fade-in');
      
      // Add a semi-transparent overlay
      const overlayOpacity = '0.7';
      this.storyImage.style.filter = `brightness(0.4) blur(3px)`;
      
      // Hide the regular text
      this.storyText.style.display = 'none';
      
      // Create scrolling credits container
      this.creditsContainer = document.createElement('div');
      this.creditsContainer.className = 'credits-container';
      this.creditsContainer.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
        color: white;
        text-align: center;
        z-index: 10;
      `;
      
      // Create scrolling content div that will include the title
      const scrollingContent = document.createElement('div');
      scrollingContent.className = 'scrolling-content';
      scrollingContent.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        animation: credits-scroll 120s linear forwards;
        padding: 0 2rem;
      `;
      
      // Add title within the scrolling content
      const titleElement = document.createElement('h1');
      titleElement.className = 'credits-title';
      titleElement.textContent = story.title;
      titleElement.style.cssText = `
        font-size: 3rem;
        color: #FFD700;
        text-shadow: 0 0 10px rgba(0,0,0,0.8);
        margin-bottom: 2rem;
        margin-top: 50vh;
        padding-bottom: 1rem;
      `;
      scrollingContent.appendChild(titleElement);
      
      // Add each credit
      story.credits.forEach(credit => {
        const creditElement = document.createElement('div');
        creditElement.className = 'credit-item';
        
        const roleElement = document.createElement('div');
        roleElement.className = 'credit-role';
        roleElement.textContent = credit.role;
        roleElement.style.cssText = `
          font-size: 1.2rem;
          color: #FFD700;
          font-weight: bold;
          text-shadow: 0 0 5px rgba(0,0,0,0.8);
        `;
        
        const nameElement = document.createElement('div');
        nameElement.className = 'credit-name';
        nameElement.textContent = credit.name;
        nameElement.style.cssText = `
          font-size: 1.5rem;
          color: white;
          text-shadow: 0 0 5px rgba(0,0,0,0.8);
        `;
        
        creditElement.appendChild(roleElement);
        creditElement.appendChild(nameElement);
        scrollingContent.appendChild(creditElement);
      });
      
      this.creditsContainer.appendChild(scrollingContent);
      this.storyModal.appendChild(this.creditsContainer);
      
      // Add CSS animation
      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-credits-animation', 'true');
      styleElement.textContent = `
        @keyframes credits-scroll {
          0% {
            transform: translateY(100vh);
          }
          100% {
            transform: translateY(-${story.credits.length * 85 + 300}px);
          }
        }
      `;
      document.head.appendChild(styleElement);
      
    } else {
      // Regular slide
    // Update image with animation
    this.storyImage.src = `/storyline/${story.image}`;
    this.storyImage.classList.remove('fade-in');
    void this.storyImage.offsetWidth; // Trigger reflow
    this.storyImage.classList.add('fade-in');
      this.storyImage.style.filter = ''; // Reset any filter
    
    // Update text with animation
      this.storyText.style.display = ''; // Show text
    this.storyText.textContent = story.text;
    this.storyText.classList.remove('text-fade-in');
    void this.storyText.offsetWidth; // Trigger reflow
    this.storyText.classList.add('text-fade-in');
    }
    
    // Update navigation buttons
    this.prevBtn.disabled = this.currentSlide === 0;
    this.nextBtn.disabled = this.currentSlide === STORYLINE.length - 1;
    
    // Update slide indicator
    const slideIndicator = document.querySelector('.slide-indicator');
    if (slideIndicator) {
      slideIndicator.textContent = `${this.currentSlide + 1}/${STORYLINE.length}`;
    }
  }
}

// Export singleton instance
export const storylineManager = new StorylineManager(); 