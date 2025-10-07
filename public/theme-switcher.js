// 🎨 Lovable Theme Switcher - Hybrid Integration

// Theme management with Lovable styles
function initLovableTheme() {
    console.log('🎨 Initializing Lovable theme system...');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('lovable-theme');
    const prefersLovable = localStorage.getItem('prefers-lovable') === 'true';
    
    if (savedTheme === 'lovable' || prefersLovable) {
        enableLovableTheme();
    } else {
        disableLovableTheme();
    }
    
    // Add theme toggle button
    addLovableThemeToggle();
}

function enableLovableTheme() {
    console.log('✨ Enabling Lovable theme...');
    
    document.body.classList.add('lovable-theme');
    localStorage.setItem('lovable-theme', 'lovable');
    
    // Update theme toggle button
    updateThemeToggleButton(true);
    
    // Apply Lovable styles to existing elements
    applyLovableStyles();
    
    console.log('✅ Lovable theme enabled!');
}

function disableLovableTheme() {
    console.log('🔄 Disabling Lovable theme...');
    
    document.body.classList.remove('lovable-theme');
    localStorage.setItem('lovable-theme', 'original');
    
    // Update theme toggle button
    updateThemeToggleButton(false);
    
    console.log('✅ Original theme restored!');
}

function toggleLovableTheme() {
    if (document.body.classList.contains('lovable-theme')) {
        disableLovableTheme();
    } else {
        enableLovableTheme();
    }
}

function addLovableThemeToggle() {
    // Find the existing theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;
    
    // Add click handler for Lovable theme
    themeToggle.addEventListener('click', function(e) {
        // If holding Shift, toggle Lovable theme instead
        if (e.shiftKey) {
            e.preventDefault();
            toggleLovableTheme();
            return;
        }
        
        // Otherwise, toggle original theme (existing behavior)
        // This will be handled by the existing toggleTheme function
    });
    
    // Add title to show keyboard shortcut
    themeToggle.title = 'Switch theme (Hold Shift for Lovable theme)';
}

function updateThemeToggleButton(isLovable) {
    const themeIcon = document.querySelector('.theme-toggle i');
    if (!themeIcon) return;
    
    if (isLovable) {
        themeIcon.className = 'fas fa-magic'; // Magic wand for Lovable
        themeIcon.title = 'Lovable theme active (Shift+Click for original)';
    } else {
        // Keep original theme icon logic
        if (document.body.classList.contains('theme-light')) {
            themeIcon.className = 'fas fa-sun';
        } else {
            themeIcon.className = 'fas fa-moon';
        }
        themeIcon.title = 'Original theme (Shift+Click for Lovable)';
    }
}

function applyLovableStyles() {
    console.log('🎨 Applying Lovable styles to existing elements...');
    
    // Update header
    const header = document.querySelector('.app-header');
    if (header) {
        header.classList.add('lovable-glass-card');
    }
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        btn.classList.add('lovable-nav-item');
    });
    
    // Update data items
    const dataItems = document.querySelectorAll('.data-item');
    dataItems.forEach(item => {
        item.classList.add('lovable-token-card');
    });
    
    // Update action buttons
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(btn => {
        if (btn.classList.contains('pump-btn')) {
            btn.classList.add('lovable-btn-primary');
        } else {
            btn.classList.add('lovable-btn-outline');
        }
    });
    
    // Update stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.add('lovable-glass-card');
    });
    
    // Update analytics cards
    const analyticsCards = document.querySelectorAll('.analytics-card');
    analyticsCards.forEach(card => {
        card.classList.add('lovable-glass-card-hover');
    });
    
    console.log('✅ Lovable styles applied!');
}

function removeLovableStyles() {
    console.log('🧹 Removing Lovable styles...');
    
    // Remove Lovable classes from all elements
    const elements = document.querySelectorAll('[class*="lovable-"]');
    elements.forEach(el => {
        const classes = Array.from(el.classList);
        classes.forEach(cls => {
            if (cls.startsWith('lovable-')) {
                el.classList.remove(cls);
            }
        });
    });
    
    console.log('✅ Lovable styles removed!');
}

// Function to reapply styles when new content is loaded
function reapplyLovableStyles() {
    if (document.body.classList.contains('lovable-theme')) {
        applyLovableStyles();
    }
}

// Auto-apply styles when DOM content changes
function observeContentChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if new data items were added
                const newDataItems = Array.from(mutation.addedNodes).filter(node => 
                    node.nodeType === Node.ELEMENT_NODE && 
                    (node.classList?.contains('data-item') || node.querySelector?.('.data-item'))
                );
                
                if (newDataItems.length > 0 && document.body.classList.contains('lovable-theme')) {
                    setTimeout(() => {
                        reapplyLovableStyles();
                    }, 100);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM loaded, initializing Lovable theme system...');
    
    initLovableTheme();
    observeContentChanges();
    
    // Reapply styles after a delay to ensure all content is loaded
    setTimeout(() => {
        if (document.body.classList.contains('lovable-theme')) {
            applyLovableStyles();
        }
    }, 2000);
});

// Export functions for use in main script
window.lovableTheme = {
    enable: enableLovableTheme,
    disable: disableLovableTheme,
    toggle: toggleLovableTheme,
    applyStyles: applyLovableStyles,
    reapplyStyles: reapplyLovableStyles
};
