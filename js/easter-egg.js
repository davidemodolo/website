// Easter Egg: Jumping Square Game
class EasterEgg {
    constructor() {
        this.isActive = false;
        this.character = null;
        this.platforms = [];
        this.physics = {
            x: 0,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            gravity: 0.8,
            jumpForce: -25,
            friction: 0.85,
            groundFriction: 0.9
        };
        this.keys = {};
        this.gameLoop = null;
        this.characterSize = 40;
        this.hasWon = false;
        this.confetti = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for spacebar to activate/deactivate
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.canActivate() && !this.isActive) {
                    e.preventDefault();
                    this.activate();
                }
            }

            // Game controls
            if (this.isActive) {
                this.keys[e.code] = true;

                // ESC to exit
                if (e.code === 'Escape') {
                    this.deactivate();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.isActive) {
                this.keys[e.code] = false;
            }
        });

        // Listen for window state changes to check if we should deactivate
        document.addEventListener('click', () => {
            if (this.isActive && !this.canActivate()) {
                this.deactivate();
            }
        });
    }

    canActivate() {
        // Check if all windows are minimized but not hidden
        const windows = document.querySelectorAll('.window');
        for (let window of windows) {
            if (!window.classList.contains('hidden') && !window.classList.contains('minimized')) {
                return false;
            }
        }
        return true;
    }

    activate() {
        this.isActive = true;
        this.hasWon = false;
        this.confetti = [];
        this.createCharacter();
        this.updatePlatforms();
        this.startGameLoop();

        // Show instructions
        this.showInstructions();
    }

    deactivate() {
        this.isActive = false;
        this.hasWon = false;
        this.confetti = [];
        this.removeCharacter();
        this.stopGameLoop();
        this.hideInstructions();
        this.hideWinMessage();
        this.removeConfetti();
    }

    createCharacter() {
        this.character = document.createElement('div');
        this.character.id = 'easter-egg-character';
        this.character.style.cssText = `
            position: fixed;
            width: ${this.characterSize}px;
            height: ${this.characterSize}px;
            background-image: url('image.png');
            background-size: cover;
            background-position: center;
            z-index: 10000;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: none;
            pointer-events: none;
        `;

        // Start position at bottom center
        this.physics.x = window.innerWidth / 2 - this.characterSize / 2;
        this.physics.y = window.innerHeight - 100; // Above taskbar
        this.physics.velocityX = 0;
        this.physics.velocityY = 0;

        this.updateCharacterPosition();
        document.body.appendChild(this.character);
    }

    removeCharacter() {
        if (this.character) {
            this.character.remove();
            this.character = null;
        }
    }

    updatePlatforms() {
        this.platforms = [];

        // Add window title bars as platforms
        const windows = document.querySelectorAll('.window:not(.hidden)');
        windows.forEach(window => {
            const titleBar = window.querySelector('.title-bar');
            if (titleBar) {
                const rect = titleBar.getBoundingClientRect();
                this.platforms.push({
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    element: titleBar
                });
            }
        });

        // Add taskbar as a platform
        const taskbar = document.querySelector('.taskbar');
        if (taskbar) {
            const rect = taskbar.getBoundingClientRect();
            this.platforms.push({
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
                element: taskbar
            });
        }
    }

    startGameLoop() {
        this.gameLoop = setInterval(() => {
            this.updatePhysics();
            this.updateCharacterPosition();
            if (this.hasWon) {
                this.updateConfetti();
            }
            this.checkWinCondition();
        }, 16); // ~60 FPS
    }

    stopGameLoop() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }

    updatePhysics() {
        if (this.hasWon) return; // Stop physics when won

        // Handle input
        const moveSpeed = 0.8;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.physics.velocityX -= moveSpeed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.physics.velocityX += moveSpeed;
        }
        if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && this.isOnGround()) {
            this.physics.velocityY = this.physics.jumpForce;
        }

        // Apply gravity
        this.physics.velocityY += this.physics.gravity;

        // Apply friction
        this.physics.velocityX *= this.isOnGround() ? this.physics.groundFriction : this.physics.friction;

        // Update position
        this.physics.x += this.physics.velocityX;
        this.physics.y += this.physics.velocityY;

        // Collision detection
        this.handleCollisions();

        // Screen boundaries
        if (this.physics.x < 0) {
            this.physics.x = 0;
            this.physics.velocityX = 0;
        }
        if (this.physics.x > window.innerWidth - this.characterSize) {
            this.physics.x = window.innerWidth - this.characterSize;
            this.physics.velocityX = 0;
        }

        // Update platforms (in case windows moved)
        this.updatePlatforms();
    }

    handleCollisions() {
        const char = {
            left: this.physics.x,
            right: this.physics.x + this.characterSize,
            top: this.physics.y,
            bottom: this.physics.y + this.characterSize
        };

        for (let platform of this.platforms) {
            const plat = {
                left: platform.x,
                right: platform.x + platform.width,
                top: platform.y,
                bottom: platform.y + platform.height
            };

            // Check collision
            if (char.right > plat.left && char.left < plat.right &&
                char.bottom > plat.top && char.top < plat.bottom) {

                // Landing on top
                if (this.physics.velocityY > 0 && char.bottom - this.physics.velocityY <= plat.top) {
                    this.physics.y = plat.top - this.characterSize;
                    this.physics.velocityY = 0;
                }
                // Hit from below
                else if (this.physics.velocityY < 0 && char.top - this.physics.velocityY >= plat.bottom) {
                    this.physics.y = plat.bottom;
                    this.physics.velocityY = 0;
                }
                // Side collisions
                else if (this.physics.velocityX > 0) {
                    this.physics.x = plat.left - this.characterSize;
                    this.physics.velocityX = 0;
                } else if (this.physics.velocityX < 0) {
                    this.physics.x = plat.right;
                    this.physics.velocityX = 0;
                }
            }
        }
    }

    isOnGround() {
        const char = {
            left: this.physics.x,
            right: this.physics.x + this.characterSize,
            bottom: this.physics.y + this.characterSize
        };

        return this.platforms.some(platform => {
            return char.right > platform.x && char.left < platform.x + platform.width &&
                   Math.abs(char.bottom - platform.y) < 5;
        });
    }

    updateCharacterPosition() {
        if (this.character) {
            this.character.style.left = this.physics.x + 'px';
            this.character.style.top = this.physics.y + 'px';
        }
    }

    showInstructions() {
        const instructions = document.createElement('div');
        instructions.id = 'easter-egg-instructions';
        instructions.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                z-index: 10001;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                border: 2px solid #00ff00;
                opacity: 0.4;
            ">
                🎮 EASTER EGG ACTIVATED! 🎮<br>
                <small>Use ARROW KEYS or WASD to move • SPACE or W to jump • ESC to exit</small>
            </div>
        `;
        document.body.appendChild(instructions);
    }

    hideInstructions() {
        const instructions = document.getElementById('easter-egg-instructions');
        if (instructions) {
            instructions.remove();
        }
    }

    checkWinCondition() {
        if (this.hasWon || !this.character) return;

        // Check if character went beyond the top of the screen
        if (this.physics.y < -this.characterSize) {
            this.hasWon = true;
            this.physics.velocityX = 0;
            this.physics.velocityY = 0;
            this.showWinMessage();
            this.createConfetti();

            // Auto-exit after 5 seconds
            setTimeout(() => {
                this.deactivate();
            }, 5000);
        }
    }

    showWinMessage() {
        const winMessage = document.createElement('div');
        winMessage.id = 'easter-egg-win';
        winMessage.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57);
                background-size: 300% 300%;
                animation: rainbowGradient 2s ease infinite;
                color: white;
                padding: 30px 50px;
                border-radius: 20px;
                z-index: 10002;
                font-family: 'Courier New', monospace;
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border: 4px solid #fff;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            ">
                🎉 YOU WIN! 🎉<br>
                <div style="font-size: 16px; margin-top: 10px; opacity: 0.9;">
                    You reached the top! Congratulations! 🎊
                </div>
            </div>
            <style>
                @keyframes rainbowGradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            </style>
        `;
        document.body.appendChild(winMessage);
    }

    hideWinMessage() {
        const winMessage = document.getElementById('easter-egg-win');
        if (winMessage) {
            winMessage.remove();
        }
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        for (let i = 0; i < 20; i++) {
            const el = document.createElement('div');
            const size = 6 + Math.random() * 4;
            el.style.cssText = `
                position:fixed;left:${Math.random()*window.innerWidth}px;top:-10px;
                width:${size}px;height:${size}px;background:${colors[Math.random()*colors.length|0]};
                border-radius:2px;z-index:10001;pointer-events:none;
            `;
            document.body.appendChild(el);
            this.confetti.push({
                element: el,
                x: parseFloat(el.style.left),
                y: -10,
                vy: 2 + Math.random() * 2
            });
        }
    }

    updateConfetti() {
        this.confetti = this.confetti.filter(piece => {
            piece.y += piece.vy += 0.1;
            piece.element.style.top = piece.y + 'px';
            if (piece.y > window.innerHeight + 20) {
                piece.element.remove();
                return false;
            }
            return true;
        });
    }

    removeConfetti() {
        this.confetti.forEach(piece => {
            if (piece.element) {
                piece.element.remove();
            }
        });
        this.confetti = [];
    }
}

// Initialize easter egg when DOM is loaded
let easterEgg;
document.addEventListener('DOMContentLoaded', () => {
    easterEgg = new EasterEgg();
    // Make it globally accessible for window manager
    window.easterEgg = easterEgg;
});
