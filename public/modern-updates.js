// 🎨 Modern Design Updates for Pump Dex Mini App

// Function to add modern classes to existing elements
function applyModernStyling() {
    console.log('🎨 Applying modern styling...');
    
    // Update data items with modern classes
    const dataItems = document.querySelectorAll('.data-item');
    dataItems.forEach(item => {
        item.classList.add('token-card', 'modern-card');
    });
    
    // Update buttons with modern styling
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(btn => {
        btn.classList.add('modern-btn');
    });
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        if (!btn.classList.contains('modern-btn')) {
            btn.classList.add('modern-btn');
        }
    });
    
    // Add gradient text to token names
    const tokenNames = document.querySelectorAll('.token-name');
    tokenNames.forEach(name => {
        name.classList.add('gradient-text');
    });
    
    // Add neon glow to logo
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.classList.add('neon-glow');
    }
    
    // Update loading placeholders with shimmer effect
    const loadingElements = document.querySelectorAll('.loading-placeholder');
    loadingElements.forEach(element => {
        element.classList.add('shimmer');
    });
    
    console.log('✅ Modern styling applied successfully!');
}

// Function to enhance cards with modern effects
function enhanceCards() {
    console.log('✨ Enhancing cards with modern effects...');
    
    // Add hover effects to all cards
    const cards = document.querySelectorAll('.data-item, .stat-card, .analytics-card');
    cards.forEach(card => {
        card.classList.add('token-card');
        
        // Add floating animation to some cards
        if (Math.random() > 0.7) {
            card.classList.add('float-animation');
        }
    });
    
    console.log('✨ Cards enhanced successfully!');
}

// Function to add modern animations
function addModernAnimations() {
    console.log('🎭 Adding modern animations...');
    
    // Add pulse glow to important elements
    const importantElements = document.querySelectorAll('.logo, .refresh-button');
    importantElements.forEach(element => {
        element.classList.add('pulse-glow');
    });
    
    console.log('🎭 Modern animations added!');
}

// Function to update background with modern effects
function updateBackground() {
    console.log('🌌 Updating background...');
    
    const body = document.body;
    if (!body.querySelector('.animated-bg')) {
        const animatedBg = document.createElement('div');
        animatedBg.className = 'animated-bg';
        body.insertBefore(animatedBg, body.firstChild);
    }
    
    console.log('🌌 Background updated!');
}

// Function to apply all modern updates
function applyAllModernUpdates() {
    console.log('🚀 Starting modern design updates...');
    
    try {
        applyModernStyling();
        enhanceCards();
        addModernAnimations();
        updateBackground();
        
        console.log('🎉 All modern updates applied successfully!');
        
        // Show notification
        if (typeof showNotification === 'function') {
            showNotification('🎨 Modern design applied!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error applying modern updates:', error);
    }
}

// Auto-apply modern updates when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM loaded, applying modern updates...');
    
    // Apply updates after a short delay to ensure all elements are rendered
    setTimeout(() => {
        applyAllModernUpdates();
    }, 1000);
});

// Re-apply updates when new content is loaded
function reapplyModernStyling() {
    console.log('🔄 Re-applying modern styling...');
    applyModernStyling();
    enhanceCards();
}

// Export functions for use in main script
window.modernDesign = {
    applyModernStyling,
    enhanceCards,
    addModernAnimations,
    updateBackground,
    applyAllModernUpdates,
    reapplyModernStyling
};
