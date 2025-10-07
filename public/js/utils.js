// 🛠️ Utility functions for Pump Dex Mini App

import { STORAGE_KEYS, CACHE_DURATION } from './constants.js';

// ===== FORMATTING UTILITIES =====

/**
 * Format SOL amount with proper decimals
 * @param {number|string} amount - SOL amount
 * @returns {string} Formatted string (e.g. "1.23 SOL", "1.2K SOL")
 */
export function formatSOL(amount) {
    if (!amount && amount !== 0) return '0 SOL';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    
    if (isNaN(numAmount)) return '0 SOL';
    if (numAmount >= 1000) return `${(numAmount / 1000).toFixed(1)}K SOL`;
    if (numAmount >= 1) return `${numAmount.toFixed(2)} SOL`;
    return `${numAmount.toFixed(4)} SOL`;
}

/**
 * Format time ago (e.g. "5 minutes ago")
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted string
 */
export function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

/**
 * Format number with K, M, B suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted string
 */
export function formatNumber(num) {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
}

/**
 * Format percentage with + or - sign
 * @param {number} value - Percentage value
 * @returns {string} Formatted string (e.g. "+15.5%", "-3.2%")
 */
export function formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format wallet address (truncate middle)
 * @param {string} address - Wallet address
 * @param {number} start - Characters to show at start (default: 4)
 * @param {number} end - Characters to show at end (default: 4)
 * @returns {string} Truncated address
 */
export function formatAddress(address, start = 4, end = 4) {
    if (!address || address.length < start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

// ===== LOCAL STORAGE UTILITIES =====

/**
 * Save data to localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to save
 * @returns {boolean} Success status
 */
export function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

/**
 * Load data from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Stored value or default
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return defaultValue;
    }
}

/**
 * Clear storage item
 * @param {string} key - Storage key
 */
export function clearStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
}

// ===== CACHE UTILITIES =====

/**
 * Cache data with expiration
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} duration - Cache duration in ms (default: 5 minutes)
 */
export function cacheData(key, data, duration = CACHE_DURATION.MEDIUM) {
    const cacheItem = {
        data: data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration
    };
    saveToStorage(`${STORAGE_KEYS.CACHE_PREFIX}${key}`, cacheItem);
}

/**
 * Get cached data if not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null if expired/not found
 */
export function getCachedData(key) {
    const cacheItem = loadFromStorage(`${STORAGE_KEYS.CACHE_PREFIX}${key}`);
    
    if (!cacheItem) return null;
    
    // Check if expired
    if (Date.now() > cacheItem.expiresAt) {
        clearStorage(`${STORAGE_KEYS.CACHE_PREFIX}${key}`);
        return null;
    }
    
    return cacheItem.data;
}

/**
 * Clear all cache
 */
export function clearAllCache() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEYS.CACHE_PREFIX)) {
            clearStorage(key);
        }
    });
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate Solana wallet address
 * @param {string} address - Wallet address to validate
 * @returns {boolean} Valid or not
 */
export function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') return false;
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Valid or not
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

// ===== DEBOUNCING / THROTTLING =====

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== ARRAY UTILITIES =====

/**
 * Remove duplicates from array
 * @param {Array} arr - Array with duplicates
 * @param {string} key - Key to check for objects
 * @returns {Array} Array without duplicates
 */
export function uniqueArray(arr, key = null) {
    if (!key) return [...new Set(arr)];
    
    const seen = new Set();
    return arr.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
    });
}

/**
 * Sort array by multiple keys
 * @param {Array} arr - Array to sort
 * @param {Array} keys - Keys to sort by
 * @returns {Array} Sorted array
 */
export function multiSort(arr, keys) {
    return arr.sort((a, b) => {
        for (const key of keys) {
            if (a[key] < b[key]) return -1;
            if (a[key] > b[key]) return 1;
        }
        return 0;
    });
}

// ===== DOM UTILITIES =====

/**
 * Wait for element to exist in DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<Element>} Element when found
 */
export function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            return resolve(element);
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Scroll to element smoothly
 * @param {string|Element} element - Selector or element
 */
export function scrollToElement(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ===== MISC UTILITIES =====

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        return false;
    }
}

/**
 * Generate random ID
 * @returns {string} Random ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if empty
 */
export function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Create HTML element with attributes
 * @param {string} tag - HTML tag
 * @param {Object} attrs - Attributes object
 * @param {string} content - Inner content
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, attrs = {}, content = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'class') {
            el.className = value;
        } else if (key === 'style') {
            Object.assign(el.style, value);
        } else {
            el.setAttribute(key, value);
        }
    });
    if (content) el.innerHTML = content;
    return el;
}

// ===== PERFORMANCE UTILITIES =====

/**
 * Measure function execution time
 * @param {Function} func - Function to measure
 * @param {string} label - Label for logging
 * @returns {Function} Wrapped function
 */
export function measurePerformance(func, label) {
    return async function(...args) {
        const start = performance.now();
        const result = await func(...args);
        const end = performance.now();
        console.log(`⏱️ [${label}] took ${(end - start).toFixed(2)}ms`);
        return result;
    };
}

/**
 * Batch operations to reduce DOM reflows
 * @param {Function} operations - Operations to batch
 */
export function batchDOMOperations(operations) {
    requestAnimationFrame(() => {
        operations();
    });
}

// ===== ERROR HANDLING =====

/**
 * Safe JSON parse with fallback
 * @param {string} json - JSON string
 * @param {any} fallback - Fallback value
 * @returns {any} Parsed object or fallback
 */
export function safeJSONParse(json, fallback = null) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.error('JSON parse error:', error);
        return fallback;
    }
}

/**
 * Retry function with exponential backoff
 * @param {Function} func - Async function to retry
 * @param {number} maxRetries - Max number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result or throws error
 */
export async function retryWithBackoff(func, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await func();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await sleep(delay * Math.pow(2, i));
        }
    }
}

// ===== TELEGRAM UTILITIES =====

/**
 * Get Telegram WebApp data
 * @returns {Object|null} Telegram data or null
 */
export function getTelegramData() {
    if (typeof window.Telegram === 'undefined') return null;
    return window.Telegram.WebApp || null;
}

/**
 * Show Telegram alert
 * @param {string} message - Alert message
 */
export function showTelegramAlert(message) {
    const tg = getTelegramData();
    if (tg) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

/**
 * Close Telegram WebApp
 */
export function closeTelegramApp() {
    const tg = getTelegramData();
    if (tg) {
        tg.close();
    }
}

// Export all utilities as default object
export default {
    // Formatting
    formatSOL,
    formatTimeAgo,
    formatNumber,
    formatPercentage,
    formatAddress,
    
    // Storage
    saveToStorage,
    loadFromStorage,
    clearStorage,
    
    // Cache
    cacheData,
    getCachedData,
    clearAllCache,
    
    // Validation
    isValidSolanaAddress,
    isValidEmail,
    sanitizeHTML,
    
    // Debouncing
    debounce,
    throttle,
    
    // Arrays
    uniqueArray,
    multiSort,
    
    // DOM
    waitForElement,
    scrollToElement,
    createElement,
    batchDOMOperations,
    
    // Misc
    sleep,
    copyToClipboard,
    generateId,
    deepClone,
    isEmpty,
    getQueryParam,
    
    // Performance
    measurePerformance,
    
    // Error handling
    safeJSONParse,
    retryWithBackoff,
    
    // Telegram
    getTelegramData,
    showTelegramAlert,
    closeTelegramApp
};

