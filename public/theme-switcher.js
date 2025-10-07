// 🎨 Theme Switcher - Three Theme System (Light, Dark, Lovable)

// Theme management system - ONLY Lovable theme active
let currentTheme = 'lovable'; // Only lovable theme now

// Initialize theme system
function initThemeSystem() {
    console.log('🎨 Initializing theme system...');
    
    // Force Lovable theme (old themes hidden)
    currentTheme = 'lovable';
    
    applyTheme(currentTheme);
    updateThemeSwitcher();
    
    // Hide theme switcher since we only have one theme
    const themeSwitcher = document.querySelector('.theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.style.display = 'none';
    }
    
    console.log('✅ Theme system initialized with Lovable theme (only theme)');
}

// Cycle through themes (disabled - only Lovable now)
function cycleTheme() {
    // Only Lovable theme, no cycling
    return;
    
    currentTheme = themes[nextIndex];
    applyTheme(currentTheme);
    updateThemeSwitcher();
    
    // Save preference
    localStorage.setItem('currentTheme', currentTheme);
    
    console.log('🎨 Switched to theme:', currentTheme);
}

// Apply theme to the page
function applyTheme(theme) {
    // Remove all theme classes
    document.body.classList.remove('light-theme', 'dark-theme', 'lovable-theme');
    
    // Add current theme class
    document.body.classList.add(theme + '-theme');
    
    // Apply theme-specific styles
    if (theme === 'lovable') {
        applyLovableStyles();
    } else {
        removeLovableStyles();
    }
}

// Update theme switcher button
function updateThemeSwitcher() {
    const switcher = document.querySelector('.theme-switcher');
    if (!switcher) return;
    
    // Update data attribute
    switcher.setAttribute('data-theme', currentTheme);
    
    // Update icon and label
    const icon = switcher.querySelector('i');
    const label = switcher.querySelector('.theme-label');
    
    switch (currentTheme) {
        case 'light':
            icon.className = 'fas fa-sun';
            label.textContent = 'Light';
            break;
        case 'dark':
            icon.className = 'fas fa-moon';
            label.textContent = 'Dark';
            break;
        case 'lovable':
            icon.className = 'fas fa-magic';
            label.textContent = 'Lovable';
            break;
    }
    
    // Update title
    switcher.title = `Current: ${currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)} - Click to switch`;
}

// Apply Lovable styles to existing elements
function applyLovableStyles() {
    console.log('🎨 Applying Lovable styles to existing elements...');
    
    // Update header with glow effect
    const header = document.querySelector('.app-header h1');
    if (header) {
        header.classList.add('lovable-neon-glow-green');
    }
    
    // Update tab buttons with glass morphism
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        btn.classList.add('lovable-glass-card');
    });
    
    // Update data items with animations
    const dataItems = document.querySelectorAll('.data-item');
    dataItems.forEach((item, index) => {
        item.classList.add('lovable-glass-card', 'lovable-animate-fade-in');
        item.style.animationDelay = `${index * 0.05}s`;
        
        // Add floating animation to every 3rd item
        if (index % 3 === 0) {
            item.classList.add('lovable-animate-float');
        }
    });
    
    // Update action buttons with specific Lovable styles
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        if (btn.classList.contains('pump-btn')) {
            btn.classList.add('lovable-btn-pump');
        } else if (btn.classList.contains('dex-btn')) {
            btn.classList.add('lovable-btn-dex');
        } else {
            btn.classList.add('lovable-btn-outline');
        }
    });
    
    // Update all other buttons
    const allButtons = document.querySelectorAll('button:not(.action-btn):not(.tab-button):not(.theme-toggle):not(.theme-switcher):not(.admin-toggle):not(.refresh-button)');
    allButtons.forEach(btn => {
        if (btn.textContent.includes('Subscribe') || btn.textContent.includes('Pay') || btn.textContent.includes('Get Started')) {
            btn.classList.add('lovable-btn-primary');
        } else {
            btn.classList.add('lovable-btn-outline');
        }
    });
    
    // Update stat cards with glow effects
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.classList.add('lovable-glass-card', 'lovable-animate-fade-in');
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Update analytics cards
    const analyticsCards = document.querySelectorAll('.analytics-card');
    analyticsCards.forEach((card, index) => {
        card.classList.add('lovable-glass-card', 'lovable-animate-slide-in');
        card.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Update loading placeholders
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(element => {
        element.classList.add('lovable-animate-shimmer');
    });
    
    // Update token names with neon glow
    const tokenNames = document.querySelectorAll('.token-name');
    tokenNames.forEach(name => {
        name.classList.add('lovable-neon-glow-green');
    });
    
    // Add animated counter to win rate
    const winRateElement = document.getElementById('winRate');
    if (winRateElement) {
        animateCounter(winRateElement, 87, 2000);
    }
    
    // Add staggered animations to stat cards
    const statCards2 = document.querySelectorAll('.lovable-stat-card');
    statCards2.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('lovable-animate-fade-in');
    });
    
    // Add staggered animations to feature cards
    const featureCards = document.querySelectorAll('.lovable-feature-card');
    featureCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('lovable-animate-fade-in');
    });
    
    // Initialize live counters for stats (commented out - too buggy)
    // setTimeout(() => {
    //     initLiveCounters();
    // }, 1000);
    
    console.log('✅ Enhanced Lovable styles applied!');
}

// Remove Lovable styles
function removeLovableStyles() {
    console.log('🎨 Removing Lovable styles...');
    
    // Remove all Lovable classes
    const elements = document.querySelectorAll('[class*="lovable-"]');
    elements.forEach(element => {
        const classes = Array.from(element.classList);
        classes.forEach(cls => {
            if (cls.startsWith('lovable-')) {
                element.classList.remove(cls);
            }
        });
    });
    
    console.log('✅ Lovable styles removed!');
}

// Animated counter function
function animateCounter(element, endValue, duration) {
    const startValue = 0;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        
        element.textContent = currentValue + '%';
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = endValue + '%';
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Live animated counters for stats (disabled for now - too buggy)
let counterIntervals = [];

function initLiveCounters() {
    // Stop any existing counter intervals
    stopLiveCounters();
    
    // Only run counters on About page
    const aboutTab = document.getElementById('about');
    if (!aboutTab || !aboutTab.classList.contains('active')) {
        return;
    }
    
    // Find stat number elements only in About tab
    const statNumbers = aboutTab.querySelectorAll('.lovable-stat-number');
    
    if (statNumbers.length === 0) {
        console.log('No stat numbers found for animation');
        return;
    }
    
    statNumbers.forEach((element, index) => {
        const text = element.textContent.trim();
        
        // Extract base number and suffix
        let baseNumber, suffix = '';
        if (text.includes('+')) {
            baseNumber = parseInt(text.replace('+', ''));
            suffix = '+';
        } else if (text.includes('%')) {
            baseNumber = parseInt(text.replace('%', ''));
            suffix = '%';
        } else {
            const parsed = parseInt(text);
            if (!isNaN(parsed)) {
                baseNumber = parsed;
            } else {
                return; // Skip if not a number
            }
        }
        
        // Skip if baseNumber is invalid
        if (isNaN(baseNumber)) return;
        
        // Start live animation with slower, smoother updates
        startLiveCounter(element, baseNumber, suffix, index);
    });
}

function stopLiveCounters() {
    // Clear all counter intervals
    counterIntervals.forEach(interval => clearInterval(interval));
    counterIntervals = [];
}

function startLiveCounter(element, baseNumber, suffix, index) {
    let currentValue = baseNumber;
    let targetValue = baseNumber;
    let direction = 1;
    let changeAmount = 1;
    
    // Different behavior for different stats  
    const updateInterval = setInterval(() => {
        // Smoothly move towards target
        if (currentValue < targetValue) {
            currentValue = Math.min(currentValue + 1, targetValue);
        } else if (currentValue > targetValue) {
            currentValue = Math.max(currentValue - 1, targetValue);
        }
        
        // Update display
        element.textContent = currentValue + suffix;
        
        // Set new target occasionally (every 2-5 seconds)
        if (currentValue === targetValue && Math.random() < 0.3) {
            const range = Math.floor(baseNumber * 0.05); // 5% variation
            targetValue = baseNumber + Math.floor(Math.random() * range * 2) - range;
            targetValue = Math.max(baseNumber - range, Math.min(baseNumber + range, targetValue));
        }
    }, 1000); // Update every second for smooth animation
    
    counterIntervals.push(updateInterval);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initThemeSystem();
});

// Export for global access
window.cycleTheme = cycleTheme;
window.initThemeSystem = initThemeSystem;