// Window management system
class WindowManager {
    constructor() {
        this.activeWindow = null;
        this.dragData = null;
        this.resizeData = null;
        this.windowStates = {};
        this.isMobile = this.detectMobile();
        this.init();
    }

    detectMobile() {
        return window.innerWidth <= 768;
    }

    init() {
        this.setupEventListeners();
        this.initializeWindows();
        this.handleResponsiveLayout();
    }

    handleResponsiveLayout() {
        // Listen for window resize to handle orientation changes
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();
            
            // If switching between mobile and desktop, reinitialize
            if (wasMobile !== this.isMobile) {
                this.reinitializeForLayout();
            }
        });
    }

    reinitializeForLayout() {
        if (this.isMobile) {
            // Mobile layout: adjust window styles for stacking
            document.querySelectorAll('.window').forEach(window => {
                const windowId = window.id;
                const state = this.windowStates[windowId];
                
                // Reset window styles for mobile (but preserve minimized state)
                window.style.position = 'static';
                window.style.width = 'calc(100% - 20px)';
                window.style.height = 'auto';
                window.style.left = 'auto';
                window.style.top = 'auto';
                window.classList.remove('fullscreen');
                
                // Ensure window is visible in mobile
                window.classList.add('positioned');
                
                // Update maximized state but preserve minimized
                state.maximized = false;
                
                // Show hidden windows on mobile (except explicitly hidden ones)
                if (state.hidden && !window.hasAttribute('data-keep-hidden')) {
                    window.classList.remove('hidden');
                    state.hidden = false;
                    this.updateTaskbar(windowId, false);
                }
            });
        } else {
            // Desktop layout: restore original positioning with new random positions
            this.initializeWindows();
        }
    }

    setupEventListeners() {
        document.addEventListener('selectstart', e => {
            if (this.dragData || this.resizeData) {
                e.preventDefault();
            }
        });
    }

    async initializeWindows() {
        const defaultSizes = {
            'experience-window': { width: 560, height: 440 },
            'education-window': { width: 735, height: 500 },
            'projects-window': { width: 750, height: 420 },
            'contact-window': { width: 400, height: 280 },
            'mnist-window': { width: 705, height: 600 },
            'sentiment-window': { width: 625, height: 545 },
        };

        const windows = Array.from(document.querySelectorAll('.window'));

        // Hide all windows initially
        windows.forEach(window => {
            window.classList.remove('positioned');
            window.style.opacity = '0';
            window.style.transform = 'scale(0.96)';
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        for (let i = 0; i < windows.length; i++) {
            const window = windows[i];
            const windowId = window.id;
            const size = defaultSizes[windowId] || { width: 500, height: 400 };
            const position = this.getRandomPosition(size.width, size.height);

            if (!this.isMobile) {
                window.style.position = 'absolute';
                window.style.left = position.x + 'px';
                window.style.top = position.y + 'px';
            }
            
            window.style.width = size.width + 'px';
            window.style.height = size.height + 'px';
            window.classList.add('positioned');

            this.windowStates[windowId] = {
                minimized: window.classList.contains('minimized'),
                maximized: false,
                hidden: window.classList.contains('hidden'),
                originalSize: { 
                    width: window.style.width, 
                    height: window.style.height, 
                    top: window.style.top, 
                    left: window.style.left 
                }
            };

            if (window.classList.contains('hidden')) {
                this.updateTaskbar(windowId, true);
            }

            this.makeWindowInteractive(window);

            // Animate window in
            setTimeout(() => {
                window.style.opacity = '1';
                window.style.transform = 'scale(1)';
            }, 10);

            if (i < windows.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
    }

    getRandomPosition(windowWidth = 500, windowHeight = 400) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight - 60;

        // Get hero section bounds
        const heroSection = document.querySelector('.hero-section');
        let heroRect = { left: 0, top: 0, right: 0, bottom: 0 };
        if (heroSection) {
            const rect = heroSection.getBoundingClientRect();
            heroRect = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        }

        let attempts = 0;
        const maxAttempts = 20; // Reduced attempts

        while (attempts < maxAttempts) {
            const x = Math.random() * (screenWidth - windowWidth);
            const y = Math.random() * (screenHeight - windowHeight);

            // Simple overlap check with hero section
            const overlapsHero = !(x + windowWidth < heroRect.left || 
                                   x > heroRect.right || 
                                   y + windowHeight < heroRect.top || 
                                   y > heroRect.bottom);

            if (!overlapsHero) {
                const position = {
                    x: Math.max(20, Math.min(x, screenWidth - windowWidth - 20)),
                    y: Math.max(20, Math.min(y, screenHeight - windowHeight - 20))
                };
                return position;
            }
            attempts++;
        }

        // Fallback position
        return {
            x: Math.max(20, Math.min(100 + attempts * 30, screenWidth - windowWidth - 20)),
            y: Math.max(20, Math.min(100 + attempts * 30, screenHeight - windowHeight - 20))
        };
    }

    makeWindowInteractive(window) {
        // Skip drag/resize setup for mobile
        if (this.isMobile) {
            window.addEventListener('mousedown', () => this.setActiveWindow(window));
            return;
        }

        const titleBar = window.querySelector('.title-bar');
        const resizeHandle = window.querySelector('.resize-handle');
        
        window.addEventListener('mousedown', () => this.setActiveWindow(window));
        titleBar.addEventListener('mousedown', (e) => this.startDrag(e));
        
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => this.startResize(e));
        }
    }

    setActiveWindow(window) {
        document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
        window.classList.add('active');
        this.activeWindow = window;
    }

    startDrag(e) {
        if (e.target.classList.contains('control-btn')) return;
        if (this.isMobile) return; // Disable dragging on mobile
        
        const window = e.target.closest('.window');
        if (this.windowStates[window.id].maximized || this.windowStates[window.id].minimized) return;
        
        this.setActiveWindow(window);
        
        this.dragData = {
            window: window,
            startX: e.clientX - window.offsetLeft,
            startY: e.clientY - window.offsetTop
        };
        
        document.addEventListener('mousemove', (e) => this.handleDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        e.preventDefault();
    }

    handleDrag(e) {
        if (!this.dragData) return;
        
        const newX = e.clientX - this.dragData.startX;
        const newY = e.clientY - this.dragData.startY;
        
        this.dragData.window.style.left = Math.max(0, Math.min(newX, window.innerWidth - this.dragData.window.offsetWidth)) + 'px';
        this.dragData.window.style.top = Math.max(0, Math.min(newY, window.innerHeight - this.dragData.window.offsetHeight - 60)) + 'px';
    }

    stopDrag() {
        this.dragData = null;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.stopDrag);
    }

    startResize(e) {
        if (this.isMobile) return; // Disable resizing on mobile
        
        const window = e.target.closest('.window');
        if (this.windowStates[window.id].maximized || this.windowStates[window.id].minimized) return;
        
        this.setActiveWindow(window);
        
        this.resizeData = {
            window: window,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: parseInt(window.style.width),
            startHeight: parseInt(window.style.height)
        };
        
        document.addEventListener('mousemove', (e) => this.handleResize(e));
        document.addEventListener('mouseup', () => this.stopResize());
        e.preventDefault();
        e.stopPropagation();
    }

    handleResize(e) {
        if (!this.resizeData) return;
        
        const newWidth = this.resizeData.startWidth + (e.clientX - this.resizeData.startX);
        const newHeight = this.resizeData.startHeight + (e.clientY - this.resizeData.startY);
        
        this.resizeData.window.style.width = Math.max(300, newWidth) + 'px';
        this.resizeData.window.style.height = Math.max(200, newHeight) + 'px';
    }

    stopResize() {
        this.resizeData = null;
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.stopResize);
    }

    minimizeWindow(windowId) {
        const window = document.getElementById(windowId);
        const state = this.windowStates[windowId];
        
        if (state.minimized) {
            window.classList.remove('minimized');
            state.minimized = false;
        } else {
            window.classList.add('minimized');
            window.classList.remove('fullscreen');
            state.minimized = true;
            state.maximized = false;
        }
        this.updateTaskbar(windowId, false);
        this.checkEasterEggCondition();
    }

    toggleMaximize(windowId) {
        const window = document.getElementById(windowId);
        const state = this.windowStates[windowId];
        
        if (state.maximized) {
            window.classList.remove('fullscreen');
            const original = state.originalSize;
            window.style.width = original.width;
            window.style.height = original.height;
            window.style.top = original.top;
            window.style.left = original.left;
            state.maximized = false;
        } else {
            if (!state.maximized) {
                state.originalSize = {
                    width: window.style.width,
                    height: window.style.height,
                    top: window.style.top,
                    left: window.style.left
                };
            }
            window.classList.add('fullscreen');
            window.classList.remove('minimized');
            state.maximized = true;
            state.minimized = false;
        }
        this.updateTaskbar(windowId, false);
    }

    hideWindow(windowId) {
        const window = document.getElementById(windowId);
        const state = this.windowStates[windowId];
        
        if (state.hidden) {
            window.classList.remove('hidden');
            state.hidden = false;
        } else {
            // Add animation before hiding
            window.style.transition = 'opacity 0.4s, transform 0.4s';
            window.style.opacity = '0';
            window.style.transform = 'scale(0.96)';
            
            // Wait for animation to complete before hiding
            setTimeout(() => {
                window.classList.add('hidden');
                window.classList.remove('minimized', 'fullscreen');
                state.hidden = true;
                state.minimized = false;
                state.maximized = false;
            }, 400);
        }
        this.updateTaskbar(windowId, !state.hidden);
        this.checkEasterEggCondition();
    }

    showWindow(windowId) {
        const window = document.getElementById(windowId);
        const state = this.windowStates[windowId];
        
        // Set initial animation state before showing
        window.style.transition = 'opacity 0.4s, transform 0.4s';
        window.style.opacity = '0';
        window.style.transform = 'scale(0.96)';
        
        window.classList.remove('hidden');
        state.hidden = false;
        this.updateTaskbar(windowId, false);
        this.setActiveWindow(window);
        
        // Trigger animation after a small delay
        setTimeout(() => {
            window.style.opacity = '1';
            window.style.transform = 'scale(1)';
        }, 10);
    }

    toggleWindow(windowId) {
        const window = document.getElementById(windowId);
        const state = this.windowStates[windowId];
        
        if (state.hidden) {
            this.showWindow(windowId);
        } else if (state.minimized) {
            // Animate unminimize
            window.style.transition = 'opacity 0.4s, transform 0.4s';
            window.style.opacity = '0';
            window.style.transform = 'scale(0.96)';
            
            setTimeout(() => {
                this.minimizeWindow(windowId); // This will unminimize
                // Animate in
                setTimeout(() => {
                    window.style.opacity = '1';
                    window.style.transform = 'scale(1)';
                }, 10);
            }, 50);
        } else {
            this.hideWindow(windowId);
        }
        this.checkEasterEggCondition();
    }

    checkEasterEggCondition() {
        // Notify easter egg system that window states have changed
        if (window.easterEgg && window.easterEgg.isActive) {
            // If easter egg is active and conditions no longer met, deactivate
            if (!window.easterEgg.canActivate()) {
                window.easterEgg.deactivate();
            } else {
                // Update platforms since window positions might have changed
                window.easterEgg.updatePlatforms();
            }
        }
    }

    updateTaskbar(windowId, isHidden) {
        const taskbarItem = document.getElementById('taskbar-' + windowId.replace('-window', ''));
        if (taskbarItem) {
            if (isHidden) {
                taskbarItem.classList.add('hidden');
            } else {
                taskbarItem.classList.remove('hidden');
            }
        }
    }
}

// Global window manager instance
let windowManager;

// Global functions for HTML onclick handlers
function minimizeWindow(windowId) {
    windowManager.minimizeWindow(windowId);
}

function toggleMaximize(windowId) {
    windowManager.toggleMaximize(windowId);
}

function hideWindow(windowId) {
    windowManager.hideWindow(windowId);
}

function toggleWindow(windowId) {
    windowManager.toggleWindow(windowId);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    windowManager = new WindowManager();
});
