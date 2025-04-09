// Storyline Manager for SumoSumo
import { socketClient } from './socket-client';

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
    
    // Automatically start narration with Thunder Voice
    this.isNarrating = true;
    if (this.narrationButton) {
      this.narrationButton.classList.add('active');
      this.narrationButton.title = "Disable narration";
    }
    
    // Start speaking with Thunder Voice
    this.speakCurrentSlide();
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
    
    // Update image with animation
    this.storyImage.src = `/storyline/${story.image}`;
    this.storyImage.classList.remove('fade-in');
    void this.storyImage.offsetWidth; // Trigger reflow
    this.storyImage.classList.add('fade-in');
    
    // Update text with animation
    this.storyText.textContent = story.text;
    this.storyText.classList.remove('text-fade-in');
    void this.storyText.offsetWidth; // Trigger reflow
    this.storyText.classList.add('text-fade-in');
    
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