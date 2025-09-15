// Theme toggle functionality
let isDarkTheme = true;

// Initialize theme from localStorage or default to light
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkTheme = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon();
    } else {
        isDarkTheme = false;
        document.documentElement.removeAttribute('data-theme');
        updateThemeIcon();
    }
}

// Toggle between light and dark themes
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    
    if (isDarkTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    
    updateThemeIcon();
}

// Update the theme toggle icon
function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-toggle-icon');
    if (themeIcon) {
        themeIcon.textContent = isDarkTheme ? '☀️' : '🌙';
    }
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
});
