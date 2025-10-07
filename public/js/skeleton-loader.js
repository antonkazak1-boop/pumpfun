// 💀 Skeleton Loader - Beautiful loading states
// Вместо "Loading..." показываем skeleton UI

/**
 * Show skeleton loader for token list
 * @param {string} containerId - ID контейнера
 */
export function showSkeletonLoader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeletonHTML = `
        <div class="skeleton-container">
            ${generateSkeletonCard()}
            ${generateSkeletonCard()}
            ${generateSkeletonCard()}
            ${generateSkeletonCard()}
            ${generateSkeletonCard()}
        </div>
    `;
    
    container.innerHTML = skeletonHTML;
}

/**
 * Generate single skeleton card
 * @returns {string} HTML for skeleton card
 */
function generateSkeletonCard() {
    return `
        <div class="skeleton-card">
            <div class="skeleton-row">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-subtitle"></div>
                </div>
            </div>
            <div class="skeleton-stats">
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
                <div class="skeleton-stat"></div>
            </div>
        </div>
    `;
}

/**
 * Show skeleton for Dashboard stats
 * @param {string} containerId - Container ID
 */
export function showDashboardSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-dashboard-stat"></div>
            <div class="skeleton-dashboard-stat"></div>
            <div class="skeleton-dashboard-stat"></div>
            <div class="skeleton-dashboard-stat"></div>
        </div>
    `;
}

/**
 * Hide skeleton and show content
 * @param {string} containerId - Container ID
 */
export function hideSkeletonLoader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const skeleton = container.querySelector('.skeleton-container');
    if (skeleton) {
        skeleton.classList.add('fade-out');
        setTimeout(() => skeleton.remove(), 300);
    }
}

// Export default object
export default {
    showSkeletonLoader,
    showDashboardSkeleton,
    hideSkeletonLoader,
    generateSkeletonCard
};

