// Student Reflection Page JavaScript
class ReflectionApp {
    constructor() {
        this.currentLanguage = 'en';
        this.init();
    }

    init() {
        this.detectBrowserLanguage();
        this.setupEventListeners();
        this.updateContent();
        this.loadSavedData();
    }

    // Detect browser language and set as default if supported
    detectBrowserLanguage() {
        const browserLang = navigator.language.slice(0, 2);
        const supportedLanguages = Object.keys(translations);
        
        if (supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
        }

        // Check for saved language preference
        const savedLanguage = localStorage.getItem('reflectionLanguage');
        if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
            this.currentLanguage = savedLanguage;
        }
    }

    // Set up all event listeners
    setupEventListeners() {
        // Language switcher buttons
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.switchLanguage(lang);
            });
        });

        // Rating slider
        const ratingSlider = document.getElementById('overall-rating');
        const ratingValue = document.getElementById('rating-value');
        
        ratingSlider.addEventListener('input', (e) => {
            ratingValue.textContent = e.target.value;
        });

        // Form submission
        document.getElementById('reflection-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Auto-save form data
        document.querySelectorAll('textarea, input[type="range"]').forEach(input => {
            input.addEventListener('input', () => {
                this.saveFormData();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchLanguage('en');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchLanguage('fr');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchLanguage('es');
                        break;
                }
            }
        });
    }

    // Switch language and update content
    switchLanguage(lang) {
        if (!translations[lang]) return;

        this.currentLanguage = lang;
        localStorage.setItem('reflectionLanguage', lang);
        
        // Add fade transition
        document.body.classList.add('fade-transition');
        
        setTimeout(() => {
            this.updateContent();
            this.updateActiveLanguageButton();
            document.body.classList.remove('fade-transition');
            document.body.classList.add('active');
        }, 150);

        // Announce language change for accessibility
        this.announceLanguageChange(lang);
    }

    // Update all content based on current language
    updateContent() {
        const t = translations[this.currentLanguage];
        
        // Update document title
        document.title = t.pageTitle;
        
        // Update all text content
        const elements = {
            'page-title': t.pageTitle,
            'welcome-title': t.welcomeTitle,
            'welcome-message': t.welcomeMessage,
            'question1-label': t.question1Label,
            'question2-label': t.question2Label,
            'question3-label': t.question3Label,
            'rating-label': t.ratingLabel,
            'rating-text': t.ratingText,
            'submit-btn': t.submitBtn,
            'info-title': t.infoTitle,
            'info-text': t.infoText,
            'footer-text': t.footerText,
            'language-info': t.languageInfo,
            'current-language': t.currentLanguage
        };

        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
            }
        });

        // Update placeholders
        const placeholders = {
            'question1': t.question1Placeholder,
            'question2': t.question2Placeholder,
            'question3': t.question3Placeholder
        };

        Object.entries(placeholders).forEach(([id, placeholder]) => {
            const element = document.getElementById(id);
            if (element) {
                element.placeholder = placeholder;
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLanguage;
    }

    // Update active language button
    updateActiveLanguageButton() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === this.currentLanguage) {
                btn.classList.add('active');
            }
        });
    }

    // Handle form submission
    handleFormSubmission() {
        const formData = this.getFormData();
        
        // Validate form
        if (!this.validateForm(formData)) {
            return;
        }

        // Simulate form submission
        this.submitReflection(formData);
    }

    // Get form data
    getFormData() {
        return {
            question1: document.getElementById('question1').value.trim(),
            question2: document.getElementById('question2').value.trim(),
            question3: document.getElementById('question3').value.trim(),
            rating: document.getElementById('overall-rating').value,
            language: this.currentLanguage,
            timestamp: new Date().toISOString()
        };
    }

    // Validate form data
    validateForm(data) {
        const requiredFields = ['question1', 'question2', 'question3'];
        const emptyFields = requiredFields.filter(field => !data[field]);

        if (emptyFields.length > 0) {
            const t = translations[this.currentLanguage];
            alert(`Please fill in all required fields.`);
            
            // Focus on first empty field
            const firstEmptyField = document.getElementById(emptyFields[0]);
            if (firstEmptyField) {
                firstEmptyField.focus();
            }
            
            return false;
        }

        return true;
    }

    // Submit reflection (simulated)
    submitReflection(data) {
        const submitBtn = document.getElementById('submit-btn');
        const originalText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        // Simulate API call
        setTimeout(() => {
            // Store submission data
            localStorage.setItem('reflectionSubmission', JSON.stringify(data));
            
            // Show success message
            this.showSuccessMessage();
            
            // Reset form
            document.getElementById('reflection-form').reset();
            document.getElementById('rating-value').textContent = '3';
            
            // Clear saved form data
            localStorage.removeItem('reflectionFormData');
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
        }, 2000);
    }

    // Show success message
    showSuccessMessage() {
        const t = translations[this.currentLanguage];
        
        // Create success message element
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = t.successMessage;
        
        // Insert before form
        const form = document.querySelector('.reflection-form');
        form.parentNode.insertBefore(successDiv, form);
        
        // Remove after 5 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 5000);
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Save form data to localStorage
    saveFormData() {
        const formData = this.getFormData();
        localStorage.setItem('reflectionFormData', JSON.stringify(formData));
    }

    // Load saved form data
    loadSavedData() {
        const savedData = localStorage.getItem('reflectionFormData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                // Restore form values
                if (data.question1) document.getElementById('question1').value = data.question1;
                if (data.question2) document.getElementById('question2').value = data.question2;
                if (data.question3) document.getElementById('question3').value = data.question3;
                if (data.rating) {
                    document.getElementById('overall-rating').value = data.rating;
                    document.getElementById('rating-value').textContent = data.rating;
                }
            } catch (error) {
                console.error('Error loading saved form data:', error);
            }
        }
    }

    // Announce language change for screen readers
    announceLanguageChange(lang) {
        const langNames = {
            en: 'English',
            fr: 'Français',
            es: 'Español'
        };
        
        // Create temporary announcement element
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = `Language changed to ${langNames[lang]}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // Get analytics data (for future use)
    getAnalytics() {
        return {
            language: this.currentLanguage,
            formInteractions: this.formInteractions || 0,
            timeSpent: Date.now() - (this.startTime || Date.now()),
            browserInfo: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform
            }
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reflectionApp = new ReflectionApp();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Save form data when page becomes hidden
        if (window.reflectionApp) {
            window.reflectionApp.saveFormData();
        }
    }
});

// Handle beforeunload to save data
window.addEventListener('beforeunload', () => {
    if (window.reflectionApp) {
        window.reflectionApp.saveFormData();
    }
});