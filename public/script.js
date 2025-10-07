// Lovable Design Integration - Pump Dex Mini App
class PumpDexApp {
    constructor() {
        this.currentTab = 'about';
        this.isLoading = true;
        this.telegram = window.Telegram?.WebApp;
        this.user = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Pump Dex App with Lovable design...');
        
        // Initialize Telegram Web App
        if (this.telegram) {
            this.telegram.ready();
            this.user = this.telegram.initDataUnsafe?.user;
            console.log('📱 Telegram user:', this.user);
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial content
        await this.loadContent();
        
        // Hide loading state
        this.hideLoading();
        
        console.log('✅ Pump Dex App initialized successfully!');
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Subscription modal
        const subscriptionBtn = document.getElementById('subscriptionBtn');
        const subscriptionModal = document.getElementById('subscriptionModal');
        const closeModal = document.getElementById('closeModal');
        
        subscriptionBtn?.addEventListener('click', () => {
            subscriptionModal?.classList.remove('hidden');
        });
        
        closeModal?.addEventListener('click', () => {
            subscriptionModal?.classList.add('hidden');
        });
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }
    
    async loadContent() {
        try {
            // Load fresh tokens for demo
            if (this.currentTab === 'fresh-tokens') {
                await this.loadFreshTokens();
            }
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }
    
    async switchTab(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show target tab content
        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.remove('hidden');
            targetContent.classList.add('fade-in');
        }
        
        this.currentTab = tabName;
        
        // Load tab-specific content
        await this.loadTabContent(tabName);
    }
    
    async loadTabContent(tabName) {
        switch (tabName) {
            case 'fresh-tokens':
                await this.loadFreshTokens();
                break;
            case 'most-bought':
                await this.loadMostBought();
                break;
            case 'trending-meta':
                await this.loadTrendingMeta();
                break;
            case 'kol-wallet':
                await this.loadKOLWallet();
                break;
            case 'trader-portfolio':
                await this.loadTraderPortfolio();
                break;
            case 'whale-moves':
                await this.loadWhaleMoves();
                break;
            case 'coins-market':
                await this.loadCoinsMarket();
                break;
            case 'volume-surge':
                await this.loadVolumeSurge();
                break;
            case 'cluster-buy':
                await this.loadClusterBuy();
                break;
            case 'cobuy':
                await this.loadCoBuy();
                break;
            case 'recent-activity':
                await this.loadRecentActivity();
                break;
            case 'wallet':
                await this.loadWalletAnalytics();
                break;
        }
    }
    
    async loadFreshTokens() {
        const container = document.getElementById('freshTokensList');
        if (!container) return;
        
        try {
            // Show loading state
            container.innerHTML = `
                <div class="flex items-center justify-center py-8">
                    <div class="loading-spinner w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            `;
            
            // Fetch data from API
            const response = await fetch('/api/freshtokens');
            const data = await response.json();
            
            // Render tokens
            if (data && data.length > 0) {
                container.innerHTML = data.map((token, index) => `
                    <div class="token-card p-4 rounded-lg fade-in">
                        <div class="flex items-center space-x-3">
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-700">
                                <img src="${token.image || '/img/token-placeholder.png'}" 
                                     alt="${token.symbol}" 
                                     class="w-full h-full object-cover"
                                     onerror="this.src='/img/token-placeholder.png'">
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center space-x-2">
                                    <h3 class="font-medium">${token.symbol || 'UNKNOWN'}</h3>
                                    <span class="text-xs bg-green-500 text-white px-2 py-1 rounded">NEW</span>
                                </div>
                                <p class="text-sm text-gray-400">${token.name || 'Unknown Token'}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-sm font-medium">$${token.price || '0.00'}</div>
                                <div class="text-xs text-gray-400">${token.market_cap || '0'} MC</div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-400">
                        <p>No fresh tokens found</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading fresh tokens:', error);
            container.innerHTML = `
                <div class="text-center py-8 text-red-400">
                    <p>Error loading fresh tokens</p>
                </div>
            `;
        }
    }
    
    async loadMostBought() {
        // Implementation for most bought tokens
        console.log('Loading most bought tokens...');
    }
    
    async loadTrendingMeta() {
        // Implementation for trending meta
        console.log('Loading trending meta...');
    }
    
    async loadKOLWallet() {
        // Implementation for KOL wallet scan
        console.log('Loading KOL wallet...');
    }
    
    async loadTraderPortfolio() {
        // Implementation for trader portfolio
        console.log('Loading trader portfolio...');
    }
    
    async loadWhaleMoves() {
        // Implementation for whale moves
        console.log('Loading whale moves...');
    }
    
    async loadCoinsMarket() {
        // Implementation for coins market
        console.log('Loading coins market...');
    }
    
    async loadVolumeSurge() {
        // Implementation for volume surge
        console.log('Loading volume surge...');
    }
    
    async loadClusterBuy() {
        // Implementation for cluster buy
        console.log('Loading cluster buy...');
    }
    
    async loadCoBuy() {
        // Implementation for co-buy
        console.log('Loading co-buy...');
    }
    
    async loadRecentActivity() {
        // Implementation for recent activity
        console.log('Loading recent activity...');
    }
    
    async loadWalletAnalytics() {
        // Implementation for wallet analytics
        console.log('Loading wallet analytics...');
    }
    
    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        const contentArea = document.getElementById('contentArea');
        
        if (loadingState) loadingState.classList.add('hidden');
        if (contentArea) contentArea.classList.remove('hidden');
        
        this.isLoading = false;
    }
    
    toggleTheme() {
        // Theme toggle implementation
        console.log('Toggling theme...');
    }
    
    // Utility methods
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    formatPrice(price) {
        return parseFloat(price).toFixed(4);
    }
    
    formatMarketCap(marketCap) {
        if (marketCap >= 1000000) return '$' + (marketCap / 1000000).toFixed(1) + 'M';
        if (marketCap >= 1000) return '$' + (marketCap / 1000).toFixed(1) + 'K';
        return '$' + marketCap.toString();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pumpDexApp = new PumpDexApp();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PumpDexApp;
}

