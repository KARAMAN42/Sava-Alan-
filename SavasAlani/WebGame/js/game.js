class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Canvas çözünürlüğünü ayarla
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.money = 200; // Requested by user
        this.lives = 20;
        this.wave = 1;
        this.gameOver = false;

        // Force UI update
        document.getElementById('money').innerText = this.money;
        document.getElementById('lives').innerText = this.lives;

        this.map = new GameMap(this.ctx, this.canvas.width, this.canvas.height);
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];

        // Projectile Pooling
        this.projectilePool = [];
        for (let i = 0; i < 100; i++) {
            // Null target initially
            const p = new Projectile(0, 0, { x: 0, y: 0, dead: true }, 0, 'standard');
            p.active = false;
            this.projectilePool.push(p);
        }
        // this.projectiles = []; // Dynamic list removed

        // FX System 2.0
        this.effects = new EffectSystem();

        // this.particlePool = []; // REMOVED
        this.floatingTexts = []; // Damage numbers

        // Effects
        this.shake = 0; // Screen shake magnitude

        this.selectedTowerType = null;
        this.shakeEnabled = true;

        // Game State
        this.gameState = 'menu'; // menu, playing, gameover
        this.gameSpeed = 1;

        // Wave Management
        this.waveActive = false;
        this.enemiesToSpawn = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.0;

        // Bind input events
        this.canvas.addEventListener('mousedown', (e) => this.onCanvasDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onCanvasMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onCanvasUp(e));
        this.canvas.addEventListener('touchstart', (e) => this.onCanvasDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onCanvasMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onCanvasUp(e));

        // Drag state
        this.isDragging = false;
        this.dragType = null;
        this.dragX = 0;
        this.dragY = 0;

        // Menu background particles
        this.menuParticles = [];
        for (let i = 0; i < 60; i++) {
            this.menuParticles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.3 - 0.1,
                size: 1 + Math.random() * 3,
                alpha: 0.1 + Math.random() * 0.5,
                color: ['#00eaff', '#ff2e63', '#6c5ce7', '#a78bfa', '#4ade80'][Math.floor(Math.random() * 5)],
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 1 + Math.random() * 2
            });
        }

        this.selectedTower = null; // UI Selection

        this.pressingTower = null;
        this.sellTimer = 0;
        this.sellDuration = 1.0; // Seconds to hold to sell

        // Audio Resume for Mobile (iOS/Android)
        window.addEventListener('touchstart', () => {
            if (audio.ctx && audio.ctx.state === 'suspended') {
                audio.ctx.resume();
            }
        }, { once: true });

        // Handle Resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.resizeMenuCanvas();
            if (this.map) this.map.resize(this.canvas.width, this.canvas.height);
        });

        // Handle Background/Foreground transitions
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Auto pause if playing when backgrounded
                if (this.gameState === 'playing') {
                    this.togglePause();
                }
            } else {
                // Reset lastTime to current timestamp when coming back
                // to prevent a massive deltaTime jump
                this.lastTime = performance.now();
                if (audio.ctx && audio.ctx.state === 'suspended') {
                    audio.ctx.resume();
                }
            }
        });

        // Initialize max level & scores
        this.currentLevel = 1;
        this.maxLevelReached = 1;
        this.highScores = { 1: 0, 2: 0, 3: 0 };
        this.loadStats();

        // Menu Animation State
        this.menuCanvas = document.getElementById('menu-bg-canvas');
        this.menuCtx = this.menuCanvas.getContext('2d');
        this.menuEntities = [];
        this.resizeMenuCanvas();
        this.initMenuEntities();

        this.lastTime = 0;
        this.renderTowerPreviews(); // Generate dynamic icons

        // Make upgrade menu draggable
        setTimeout(() => {
            const menu = document.getElementById('upgrade-menu');
            const header = document.querySelector('.upgrade-header');
            if (menu && header) {
                this.makeDraggable(menu, header);
            }
        }, 100);
        this.showMainMenu(); // Force initial UI state
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        handle.onmousedown = dragMouseDown;
        handle.ontouchstart = dragMouseDown; // Touch support

        const self = this; // Capture 'this' for nested functions

        function dragMouseDown(e) {
            e = e || window.event;
            // e.preventDefault(); // allow default touch behavior if needed, but usually we want to stop scroll
            if (e.type === 'touchstart') {
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
            } else {
                pos3 = e.clientX;
                pos4 = e.clientY;
            }

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Calculate new cursor position
            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;

            // Set element's new position
            // Ensure visual transform is removed since we are using top/left
            element.style.transform = 'none';
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            element.style.bottom = 'auto'; // Override CSS bottom
        }

        function closeDragElement() {
            // Stop moving
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    setParticles(val) {
        if (this.effects) this.effects.enabled = val;
    }

    setShake(val) {
        this.shakeEnabled = val;
    }

    resizeMenuCanvas() {
        this.menuCanvas.width = window.innerWidth;
        this.menuCanvas.height = window.innerHeight;
    }

    initMenuEntities() {
        this.menuEntities = [];
        // Create 40 "flying objects" (Neon Insects/Drones)
        for (let i = 0; i < 40; i++) {
            this.menuEntities.push({
                x: Math.random() * this.menuCanvas.width,
                y: Math.random() * this.menuCanvas.height,
                vx: (Math.random() - 0.5) * 60, // Faster movement
                vy: (Math.random() - 0.5) * 60,
                size: 3 + Math.random() * 5, // INCREASED SIZE: 3-8px
                color: Math.random() > 0.5 ? '#00eaff' : '#ff2e63', // Cyan or Red/Pink
                pulse: Math.random() * Math.PI,
                pulseSpeed: 2 + Math.random() * 3
            });
        }
    }

    renderTowerPreviews() {
        const canvases = document.querySelectorAll('.tower-preview-canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            const type = canvas.getAttribute('data-type');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const tower = new Tower(canvas.width / 2, canvas.height / 2, type);
            tower.draw(ctx, true); // Enable preview mode
        });
    }

    // --- Persistence & Stats ---

    loadStats() {
        try {
            const saved = localStorage.getItem('savas_alani_v2_stats');
            if (saved) {
                const data = JSON.parse(saved);
                this.highScores = data.highScores || { 1: 0, 2: 0, 3: 0 };
                this.maxLevelReached = data.maxLevelReached || 1;
            }
        } catch (e) {
            console.error("Failed to load stats", e);
        }
    }

    saveStats() {
        if (!this.level) this.level = 1;
        // Update high score if current wave is better
        if (this.wave > (this.highScores[this.level] || 0)) {
            this.highScores[this.level] = this.wave;
        }

        // Unlock next level ONLY if beating wave 10
        if (this.wave >= 10 && this.level < 3) {
            this.maxLevelReached = Math.max(this.maxLevelReached, this.level + 1);
        }

        const data = {
            highScores: this.highScores,
            maxLevelReached: this.maxLevelReached
        };
        localStorage.setItem('savas_alani_v2_stats', JSON.stringify(data));
    }

    refreshLevelSelect() {
        try {
            for (let i = 1; i <= 3; i++) {
                const scoreEl = document.getElementById(`high-score-${i}`);
                const score = this.highScores[i] || 0;
                if (scoreEl) {
                    scoreEl.innerText = `REKOR: ${score}`;
                }

                // Star Logic
                const starContainer = document.getElementById(`stars-${i}`);
                if (starContainer) {

                    let stars = 0;
                    // Adjusted for Level Length 10
                    if (score >= 3) stars = 1;
                    if (score >= 6) stars = 2;
                    if (score >= 10) stars = 3;

                    starContainer.innerHTML = '';
                    for (let s = 0; s < 3; s++) {
                        const span = document.createElement('span');
                        span.innerText = '★'; // Star char
                        if (s < stars) span.className = 'star-active';
                        else span.className = 'star-inactive';
                        starContainer.appendChild(span);
                    }
                }

                // Map Node Logic
                const node = document.getElementById(`node-level-${i}`);
                if (node) {
                    if (i <= this.maxLevelReached) {
                        node.classList.remove('locked');
                        node.classList.add('unlocked');
                        const lock = node.querySelector('.node-lock');
                        if (lock) lock.style.display = 'none';
                        const icon = node.querySelector('.node-icon');
                        if (icon) icon.style.display = 'block';
                    } else {
                        node.classList.add('locked');
                        node.classList.remove('unlocked');
                        const lock = node.querySelector('.node-lock');
                        if (lock) lock.style.display = 'block';
                        const icon = node.querySelector('.node-icon');
                        if (icon) icon.style.display = 'none';
                    }
                }

                // Path Logic
                if (i < 3) {
                    const path = document.getElementById(`path-${i}-${i + 1}`);
                    if (path) {
                        if (i < this.maxLevelReached) {
                            path.classList.add('unlocked-path');
                        } else {
                            path.classList.remove('unlocked-path');
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error refreshing level select", e);
        }
    }

    triggerGameOver() {
        this.gameOver = true;
        this.gameState = 'gameover';
        this.saveStats();

        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').innerText = "Veda Edilen Dalga: " + this.wave;

        if (audio.ctx) audio.ctx.suspend();
    }

    addFloatingText(x, y, text, color) {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
        // Keep within limit (remove oldest) - ULTRA LOW LIMIT
        if (this.floatingTexts.length > 5) {
            this.floatingTexts.shift();
        }
    }

    spawnProjectile(x, y, target, damage, type) {
        for (let i = 0; i < this.projectilePool.length; i++) {
            if (!this.projectilePool[i].active) {
                this.projectilePool[i].reset(x, y, target, damage, type);
                return;
            }
        }
    }

    spawnParticle(x, y, color, speed, life) {
        // OLD API - Forward to new system for compatibility if needed, 
        // but prefer direct use of game.effects.trigger()
        this.effects.spawn(x, y, color, 0, 0);
    }

    // --- Menu System ---

    showLevelSelect() {
        this.gameState = 'level_select';

        // Stop Music (Safety)
        if (audio && audio.stopBGM) {
            audio.stopBGM();
        }

        // Clear Game State
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.effects.particles = [];
        this.waveActive = false;

        // Force Map Cleanup: Remove path data so it can't be drawn
        if (this.map) {
            this.map.path = [];
            this.map.currentPath = [];
            // CRITICAL: Re-render the static map (cache) so it doesn't have the old path baked in
            this.map.renderStaticMap();
        }

        const menu = document.getElementById('main-menu');
        const select = document.getElementById('level-select-screen');
        const ui = document.getElementById('ui-layer');
        const gameOver = document.getElementById('game-over-screen');
        const victory = document.getElementById('victory-screen');
        const settings = document.getElementById('settings-modal');
        const settingsBtn = document.getElementById('settings-btn');

        if (menu) menu.classList.add('hidden');
        if (select) select.classList.remove('hidden');
        if (ui) ui.classList.add('hidden');
        if (gameOver) gameOver.classList.add('hidden');
        if (victory) victory.classList.add('hidden');
        if (settings) settings.classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden');

        this.refreshLevelSelect();
    }

    showMainMenu() {
        this.gameState = 'menu';

        // Stop Music
        if (audio && audio.stopBGM) {
            audio.stopBGM();
        }

        // Clear Game State
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        this.floatingTexts = [];
        this.effects.particles = [];
        this.waveActive = false;

        // Force Map Cleanup: Remove path data so it can't be drawn
        if (this.map) {
            this.map.path = [];
            this.map.currentPath = [];
            // CRITICAL: Re-render the static map (cache) so it doesn't have the old path baked in
            this.map.renderStaticMap();
        }

        const menu = document.getElementById('main-menu');
        const select = document.getElementById('level-select-screen');
        const ui = document.getElementById('ui-layer');
        const gameOver = document.getElementById('game-over-screen');
        const victory = document.getElementById('victory-screen');
        const settings = document.getElementById('settings-modal');

        const settingsBtn = document.getElementById('settings-btn');

        if (menu) menu.classList.remove('hidden');
        if (select) select.classList.add('hidden');
        if (ui) ui.classList.add('hidden');
        if (gameOver) gameOver.classList.add('hidden');
        if (victory) victory.classList.add('hidden');
        if (settings) settings.classList.add('hidden');
        if (settingsBtn) settingsBtn.classList.add('hidden'); // Hide in main menu
    }

    startLevel(level) {
        console.log("START LEVEL CALLED", level);
        // console.trace();
        if (level > this.maxLevelReached) return;

        this.level = level;
        this.gameState = 'playing';
        this.gameOver = false;

        const select = document.getElementById('level-select-screen');
        const ui = document.getElementById('ui-layer');
        const settingsBtn = document.getElementById('settings-btn');
        if (select) select.classList.add('hidden');
        if (ui) ui.classList.remove('hidden');
        if (settingsBtn) settingsBtn.classList.remove('hidden'); // Ensure visible during play

        // Reset Logic
        this.money = 200;
        this.lives = 20;
        this.wave = 1;
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        // Pools reset
        this.towers = [];
        this.projectiles = [];
        // this.particlePool reference removed as it is deprecated
        this.waveActive = false;

        this.map = new GameMap(this.ctx, this.canvas.width, this.canvas.height);
        this.map.loadLevel(this.level);

        document.getElementById('money').innerText = this.money;
        document.getElementById('lives').innerText = this.lives;
        document.getElementById('wave').innerText = "Bölüm " + level + " - Dalga " + this.wave;

        if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
        audio.startBGM();
        this.startWave();
    }


    toggleSpeed() {
        if (this.gameSpeed === 1) {
            this.gameSpeed = 2;
        } else {
            this.gameSpeed = 1;
        }
        document.getElementById('speed-btn').innerText = this.gameSpeed + "x";
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pause-btn').innerText = "▶️";
            if (audio && audio.ctx) {
                audio.ctx.suspend();
            }
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pause-btn').innerText = "⏸️";
            this.lastTime = performance.now();
            if (audio && audio.ctx) {
                audio.ctx.resume();
            }
        }
    }

    toggleSettings() {
        const modal = document.getElementById('settings-modal');
        const restartBtn = document.getElementById('settings-restart-btn');

        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');

            // Hide Restart button if not playing
            if (this.gameState === 'menu' || this.gameState === 'level_select') {
                if (restartBtn) restartBtn.classList.add('hidden');
            } else {
                if (restartBtn) restartBtn.classList.remove('hidden');
            }

            // Auto pause if playing
            if (this.gameState === 'playing') {
                this.togglePause();
                this.wasPlaying = true;
            } else {
                this.wasPlaying = false;
            }
        } else {
            modal.classList.add('hidden');
            // Resume if it was playing when opened
            if (this.wasPlaying && this.gameState === 'paused') {
                this.togglePause();
            } else {
                // If it wasn't playing, but we might have suspended it manually or something? 
                // No, togglePause handles resume. 
                // But just in case we are in menu and want menu music back? 
                // Menu music should run if not paused. 
                // If we are in menu, togglePause isn't called.
                if (audio && audio.ctx && audio.ctx.state === 'suspended' && this.gameState !== 'paused') {
                    audio.ctx.resume();
                }
            }
        }
    }

    restartLevel() {
        const modal = document.getElementById('settings-modal');
        if (modal && !modal.classList.contains('hidden')) {
            this.toggleSettings(); // Close modal if open
        }
        this.startLevel(this.level); // Restart current level
    }

    startWave() {
        // Safety check: Don't start waves if not playing
        if (this.gameState !== 'playing') {
            this.waveActive = false;
            return;
        }

        if (this.waveActive) return;

        console.log("Starting Wave " + this.wave);
        // DEBUG LOG
        this.enemiesToSpawn = [];

        let wavePhaseMult;
        let count = 5 + Math.floor(this.wave * 2.5); // Default count
        const levelBase = 1.0; // Base enemy level multiplier

        // DEBUG LOG - Fixed Position
        this.waveActive = true;

        if (this.wave <= 5) {
            // PHASE 1: EASY (Waves 1-5)
            // Gradual ramp: 0.6x -> 1.0x
            wavePhaseMult = 0.6 + (this.wave * 0.08);
        } else {
            // PHASE 2: HARD (Waves 6-10)
            // Spike: 1.5x -> 3.0x (Increased scaling)
            wavePhaseMult = 1.5 + ((this.wave - 5) * 0.35);
            count = 12 + (this.wave - 5) * 4; // Significantly more enemies
        }

        const totalMult = levelBase * wavePhaseMult;

        for (let i = 0; i < count; i++) {
            let type = 'normal';

            if (this.wave === 10 && i === count - 1) {
                type = 'boss';
            } else if (this.wave > 6) {
                // Hard Phase Mix - FORCE VARIETY
                const r = Math.random();
                if (r < 0.15) type = 'heavy';
                else if (r < 0.3) type = 'mantis';
                else if (r < 0.5) type = 'tank';
                else if (r < 0.7) type = 'fast';
                else if (r < 0.85) type = 'fly';
                else type = 'normal';
            } else if (this.wave > 3) {
                // Mid Phase Mix
                const r = Math.random();
                if (r < 0.2) type = 'scout';
                else if (r < 0.4) type = 'fast';
                else if (r < 0.6) type = 'normal';
                else if (r < 0.8) type = 'fly';
                else type = 'mantis';
            } else {
                // Early Phase Mix
                if (i % 3 === 0) type = 'scout';
                else if (i % 5 === 0) type = 'fly';
                else type = 'normal';
            }

            this.enemiesToSpawn.push({
                type: type,
                levelMult: totalMult
            });
        }

        this.spawnInterval = Math.max(0.2, 1.2 - (this.wave * 0.05));
    }

    // ========= DRAG-AND-DROP KULE YERLEŞTİRME =========

    // Ekran koordinatını canvas koordinatına çevir
    eventToCanvas(e) {
        const rect = this.canvas.getBoundingClientRect();
        let cx, cy;
        if (e.touches && e.touches.length > 0) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            cx = e.changedTouches[0].clientX;
            cy = e.changedTouches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        return {
            x: (cx - rect.left) * (this.canvas.width / rect.width),
            y: (cy - rect.top) * (this.canvas.height / rect.height)
        };
    }

    // Build menüden sürükleme başlat
    startDrag(type, event) {
        if (event) event.preventDefault();
        if (this.gameState !== 'playing') return;

        if (this.money < this.getTowerCost(type)) {
            this.addFloatingText(this.canvas.width / 2, this.canvas.height / 2, 'PARA YETERSİZ', '#ff0000');
            return;
        }

        this.isDragging = true;
        this.dragType = type;

        // İlk pozisyon
        const pos = this.eventToCanvas(event);
        this.dragX = pos.x;
        this.dragY = pos.y;

        // Document seviyesinde listener'lar (sürükleme canvas dışında da çalışsın)
        const onMove = (e) => {
            e.preventDefault();
            const p = this.eventToCanvas(e);
            this.dragX = p.x;
            this.dragY = p.y;
        };

        const onDrop = (e) => {
            e.preventDefault();

            // Son pozisyonu al (touchend'de changedTouches kullanılır)
            const p = this.eventToCanvas(e);
            this.dragX = p.x;
            this.dragY = p.y;

            // Listener'ları temizle
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onDrop);
            document.removeEventListener('touchend', onDrop);

            if (!this.isDragging) return;

            // Kuleyi yerleştirmeye çalış
            this.tryPlaceTowerAt(this.dragX, this.dragY);
            this.isDragging = false;
            this.dragType = null;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onDrop);
        document.addEventListener('touchend', onDrop);
    }

    // Canvas koordinatlarından grid'e çevirip yerleştir
    tryPlaceTowerAt(canvasX, canvasY) {
        if (!this.map || !this.dragType) return;

        const col = Math.floor(canvasX / this.map.tileSize);
        const row = Math.floor(canvasY / this.map.tileSize);

        if (col < 0 || col >= this.map.cols || row < 0 || row >= this.map.rows) return;

        if (this.map.isOnPath(col, row)) {
            this.addFloatingText(canvasX, canvasY, 'YOLA KONAMIYOR', '#ff0000');
            return;
        }

        const occupied = this.towers.some(t => {
            const tCol = Math.floor(t.x / this.map.tileSize);
            const tRow = Math.floor(t.y / this.map.tileSize);
            return tCol === col && tRow === row;
        });
        if (occupied) return;

        this.placeTower(col, row, this.dragType);
    }

    // Canvas event handler'ları (mevcut kule seçme/satma için)
    onCanvasDown(e) {
        if (this.gameState !== 'playing') return;
        if (e.target !== this.canvas) return;
        if (this.isDragging) return; // Drag sırasında canvas click'i yoksay
        e.preventDefault();

        const pos = this.eventToCanvas(e);

        const clickedTower = this.towers.find(t => {
            const dx = t.x - pos.x;
            const dy = t.y - pos.y;
            return Math.sqrt(dx * dx + dy * dy) < 30;
        });

        if (clickedTower) {
            this.pressingTower = clickedTower;
            this.sellTimer = 0;
        } else {
            this.deselectTower();
        }
    }

    onCanvasMove(e) {
        // Mouse pozisyonu takibi (kullanılmıyor şu an)
    }

    onCanvasUp(e) {
        e.preventDefault();
        if (this.pressingTower) {
            const wasShortClick = this.sellTimer < this.sellDuration;
            const targetTower = this.pressingTower;
            this.pressingTower = null;
            this.sellTimer = 0;
            if (wasShortClick) {
                try { this.selectTower(targetTower); } catch (err) { console.error('Select error:', err); }
            }
        }
    }

    placeTower(col, row, type) {
        const cost = this.getTowerCost(type);
        if (this.money >= cost) {
            const centerX = col * this.map.tileSize + this.map.tileSize / 2;
            const centerY = row * this.map.tileSize + this.map.tileSize / 2;

            this.towers.push(new Tower(centerX, centerY, type));
            this.money -= cost;
            this.updateMoneyDisplay();

            for (let i = 0; i < 5; i++) {
                this.spawnParticle(centerX, centerY, '#fff', 1, 0.5);
            }
            if (audio && audio.playBuild) audio.playBuild();
        }
    }

    getTowerCost(type) {
        if (type === 'standard') return 50;
        if (type === 'sniper') return 100;
        if (type === 'rapid') return 150;
        if (type === 'tesla') return 200;
        if (type === 'plasma') return 300;
        return 0;
    }

    selectTower(tower) {
        this.selectedTower = tower;

        // Update UI
        const menu = document.getElementById('upgrade-menu');
        menu.classList.remove('hidden');

        this.updateUpgradeMenu();
    }

    deselectTower() {
        this.selectedTower = null;
        document.getElementById('upgrade-menu').classList.add('hidden');
    }

    updateUpgradeMenu() {
        if (!this.selectedTower) return;
        const t = this.selectedTower;

        // Basic Info + Icon
        document.getElementById('upgrade-name').innerText = t.type.toUpperCase();
        document.getElementById('upgrade-level').innerText = 'LV.' + t.level;
        const icons = { standard: '🔫', sniper: '🎯', rapid: '⚡', tesla: '⚡', plasma: '💫' };
        document.getElementById('upg-icon').innerText = icons[t.type] || '⚙';

        // --- CALCULATE STATS ---
        const isMax = t.level >= t.maxLevel;

        let nextDmg = t.damage;
        let nextRng = t.range;
        let nextRate = t.fireRate;

        if (!isMax) {
            const nextStats = t.getNextStats();
            if (nextStats) {
                nextDmg = nextStats.damage;
                nextRng = nextStats.range;
                nextRate = nextStats.fireRate;
            }
        }

        // --- UPDATE UI ELEMENTS ---

        // Damage
        document.getElementById('upg-dmg-current').innerText = t.damage;
        const dmgNextEl = document.getElementById('upg-dmg-next');
        const dmgBar = document.getElementById('stat-dmg-bar');

        // Bar logic: Max damage ref ~1000 for plasma lvl 5? 
        // Let's say max reasonable damage is 200 for scale
        let maxDmgRef = 200;
        if (t.type === 'sniper') maxDmgRef = 500;
        if (t.type === 'plasma') maxDmgRef = 800;

        dmgBar.style.width = Math.min(100, (t.damage / maxDmgRef) * 100) + '%';

        if (!isMax) {
            dmgNextEl.style.opacity = '1';
            dmgNextEl.innerText = '→ ' + Math.floor(nextDmg);
        } else {
            dmgNextEl.style.opacity = '0';
        }

        // Range
        document.getElementById('upg-rng-current').innerText = t.range;
        const rngNextEl = document.getElementById('upg-rng-next');
        const rngBar = document.getElementById('stat-rng-bar');

        let maxRngRef = 500; // Sniper max
        rngBar.style.width = Math.min(100, (t.range / maxRngRef) * 100) + '%';

        if (!isMax) {
            rngNextEl.style.opacity = '1';
            rngNextEl.innerText = '→ ' + Math.floor(nextRng);
        } else {
            rngNextEl.style.opacity = '0';
        }

        // Speed (Inverse: Lower is better, but bar should be full for fast)
        // Let's just show raw speed and fill bar based on "Fastness"
        // Max speed (fastest) ~0.1s. Slowest ~3.0s.
        document.getElementById('upg-spd-current').innerText = t.fireRate.toFixed(2) + 's';
        const spdNextEl = document.getElementById('upg-spd-next');
        const spdBar = document.getElementById('stat-spd-bar');

        // Linear interpolation for bar: 3.0s -> 0%, 0.1s -> 100%
        const spdPercent = Math.max(0, Math.min(100, (3.0 - t.fireRate) / (3.0 - 0.1) * 100));
        spdBar.style.width = spdPercent + '%';

        if (!isMax) {
            spdNextEl.style.opacity = '1';
            spdNextEl.innerText = '→ ' + nextRate.toFixed(2) + 's';
        } else {
            spdNextEl.style.opacity = '0';
        }

        // --- BUTTONS ---
        const upgBtn = document.getElementById('upgrade-action-btn');
        const costSpan = document.getElementById('upgrade-cost');

        if (isMax) {
            upgBtn.disabled = true;
            upgBtn.innerHTML = '<span class="btn-label">⭐ MAX SEVİYE</span>';
        } else {
            upgBtn.disabled = false;
            const cost = t.getUpgradeCost();
            if (costSpan) costSpan.innerText = '$' + cost;

            // Re-render button content with ID preserved
            upgBtn.innerHTML = `<span class="btn-label">⬆ YÜKSELT</span> <span class="btn-cost" id="upgrade-cost">$${cost}</span>`;

            // Highlight if affordable
            if (this.money >= cost) {
                upgBtn.style.filter = 'brightness(1.1)';
            } else {
                upgBtn.style.filter = 'grayscale(1)';
            }
        }

        // Sell Button
        const sellValue = Math.floor(t.cost * 0.7); // Roughly
        document.getElementById('sell-refund').innerText = '$' + t.getSellValue();
    }

    upgradeSelectedTower() {
        try {
            if (!this.selectedTower) return;
            const t = this.selectedTower;

            if (t.level >= t.maxLevel) return;

            const cost = t.getUpgradeCost();
            if (this.money >= cost) {
                if (t.upgrade()) {
                    this.money -= cost;
                    this.updateMoneyDisplay();

                    // Effects
                    for (let i = 0; i < 15; i++) {
                        this.spawnParticle(t.x, t.y, '#ffd700', 2, 1.2);
                    }
                    if (audio && audio.playBuild) {
                        audio.playBuild();
                    } else {
                        console.warn("Audio playBuild missing");
                    }

                    this.updateUpgradeMenu(); // Refresh UI
                }
            } else {
                console.log("Not enough money!");
                this.addFloatingText(t.x, t.y - 20, "NO MONEY", '#ff0000');
            }
        } catch (err) {
            console.error("Upgrade Error (Silenced):", err);
        }
    }

    sellSelectedTower() {
        if (!this.selectedTower) return;
        this.sellTower(this.selectedTower);
    }

    sellTower(t) {
        if (!t) return;

        const value = t.getSellValue();
        this.money += value;
        this.updateMoneyDisplay();

        // Remove
        this.towers = this.towers.filter(tower => tower !== t);

        // Effect
        if (game.effects) {
            game.effects.trigger('explosion', t.x, t.y, '#ff2e63');
        }

        if (audio && audio.playShoot) {
            try {
                audio.playShoot('standard'); // Sell sound
            } catch (e) {
                console.warn("Audio error", e);
            }
        }

        // If the sold tower was selected, deselect it
        if (this.selectedTower === t) {
            this.deselectTower();
        }
    }

    updateMoneyDisplay() {
        document.getElementById('money').innerText = this.money;
    }

    update(deltaTime) {
        if (this.gameOver || this.gameState === 'paused') return;

        // Interaction Update
        if (this.pressingTower) {
            this.sellTimer += deltaTime;
            if (this.sellTimer >= this.sellDuration) {
                this.sellTower(this.pressingTower);
                this.pressingTower = null;
                this.sellTimer = 0;
                this.isDragging = false; // Just in case
            }
        }

        // Spawning Logic
        if (this.waveActive && this.enemiesToSpawn.length > 0) {
            this.spawnTimer -= deltaTime;
            if (this.spawnTimer <= 0) {
                const spawnData = this.enemiesToSpawn.shift();
                try {
                    if (!this.map) throw new Error("No Map");
                    if (!this.map.path) throw new Error("No Path");
                    if (this.map.path.length === 0) throw new Error("Empty Path");

                    this.enemies.push(new Enemy(this.map.path, spawnData.type, spawnData.levelMult));
                } catch (err) {
                    console.error("Spawn Error", err);
                    // Visual Debug for User
                    this.addFloatingText(200, 100, "SPAWN ERR: " + err.message, '#ff0000');
                }
                this.spawnTimer = this.spawnInterval;
            }
        } else if (this.waveActive && this.enemiesToSpawn.length === 0 && this.enemies.length === 0) {
            // Wave Complete
            this.waveActive = false;

            if (this.wave >= 10) {
                // Level Complete (Victory)
                setTimeout(() => this.showVictoryScreen(), 1500);
            } else {
                // Next Wave
                this.wave++;
                document.getElementById('wave').innerText = "Bölüm " + (this.level || 1) + " - Dalga " + this.wave;
                setTimeout(() => this.startWave(), 3000); // Auto start next wave
            }
        }

        // --- UI UPDATES (Throttled/Batched) ---
        // Only touch DOM if values changed
        if (this.money !== this.lastRenderedMoney) {
            document.getElementById('money').innerText = this.money;
            this.lastRenderedMoney = this.money;
            this.updateUpgradeMenu(); // Check buttons
        }
        if (this.lives !== this.lastRenderedLives) {
            document.getElementById('lives').innerText = this.lives;
            this.lastRenderedLives = this.lives;
        }

        // Update entities
        this.enemies = this.enemies.filter(e => !e.dead);

        // Update Shake
        this.shake = 0; // DISABLED FOR PERFORMANCE
        /*
        if (this.shake > 0) {
            this.shake -= deltaTime * 30; // Decay
            if (this.shake < 0) this.shake = 0;
        }
        */

        // Update Floating Texts
        this.floatingTexts.forEach(t => t.update(deltaTime));
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        // Optimization: Use Pools
        for (let i = 0; i < this.projectilePool.length; i++) {
            if (this.projectilePool[i].active) {
                this.projectilePool[i].update(deltaTime);
            }
        }
        // this.projectiles = this.projectiles.filter(p => p.active);

        // Update Effects
        this.effects.update(deltaTime);
        // this.particles = this.particles.filter(p => p.active);

        this.enemies.forEach(e => e.update(deltaTime));
        this.towers.forEach(t => t.update(deltaTime));
        // this.projectiles.forEach(p => p.update(deltaTime));
        // this.particles.forEach(p => p.update(deltaTime));
    }

    showVictoryScreen() {
        this.saveStats(); // Save progress on win
        this.gameState = 'menu'; // Stop updates
        const screen = document.getElementById('victory-screen');
        if (screen) {
            screen.classList.remove('hidden');
            const stats = document.getElementById('vic-stats');
            if (stats) {
                stats.innerText = `Lives: ${this.lives} | Money: $${this.money}`;
            }
        }
    }

    nextLevel() {
        if (this.level < 3) {
            this.level++;
            // Hide victory screen
            const victoryScreen = document.getElementById('victory-screen');
            if (victoryScreen) victoryScreen.classList.add('hidden');

            this.startLevel(this.level);
        } else {
            this.showMainMenu();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Background Handling
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameover') {
            // GAME BACKGROUND: Draw Map (Grid/Squares)
            if (this.map && this.map.cacheCanvas && this.map.cacheCanvas.width > 0 && this.map.cacheCanvas.height > 0) {
                this.ctx.drawImage(this.map.cacheCanvas, 0, 0);
            }
        } else {
            // MENU BACKGROUND: Animated Dark Background
            this.ctx.fillStyle = '#050510';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw animated particles
            const w = this.canvas.width;
            const h = this.canvas.height;
            const now = performance.now() * 0.001;

            for (const p of this.menuParticles) {
                // Update position
                p.x += p.vx;
                p.y += p.vy;
                p.pulse += p.pulseSpeed * 0.016;

                // Wrap around
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                const pulseAlpha = p.alpha * (0.5 + 0.5 * Math.sin(p.pulse));

                // Glow
                this.ctx.save();
                this.ctx.globalAlpha = pulseAlpha * 0.3;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = p.color;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();

                // Core
                this.ctx.globalAlpha = pulseAlpha;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Connection lines between nearby particles
            this.ctx.lineWidth = 0.5;
            for (let i = 0; i < this.menuParticles.length; i++) {
                for (let j = i + 1; j < this.menuParticles.length; j++) {
                    const a = this.menuParticles[i];
                    const b = this.menuParticles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        const lineAlpha = (1 - dist / 100) * 0.15;
                        this.ctx.globalAlpha = lineAlpha;
                        this.ctx.strokeStyle = a.color;
                        this.ctx.beginPath();
                        this.ctx.moveTo(a.x, a.y);
                        this.ctx.lineTo(b.x, b.y);
                        this.ctx.stroke();
                    }
                }
            }
            this.ctx.globalAlpha = 1;
        }

        // ONLY draw game elements if playing/paused/gameover
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameover') {
            this.ctx.save();

            // Apply Screen Shake
            if (this.shakeEnabled && this.shake > 0) {
                const dx = (Math.random() - 0.5) * this.shake;
                const dy = (Math.random() - 0.5) * this.shake;
                this.ctx.translate(dx, dy);
            }

            // Draw Map
            if (this.map) this.map.draw();

            // Draw Towers
            this.towers.forEach(t => t.draw(this.ctx));


            // Draw Enemies
            this.enemies.forEach(e => e.draw(this.ctx));

            // Draw Projectiles
            for (let i = 0; i < this.projectilePool.length; i++) {
                if (this.projectilePool[i].active) {
                    this.projectilePool[i].draw(this.ctx);
                }
            }

            // Draw Effects
            this.effects.draw(this.ctx);

            // Draw Floating Texts
            this.floatingTexts.forEach(t => t.draw(this.ctx));

            // Draw Ghost Tower (Sürükleme önizlemesi)
            if (this.isDragging && this.dragType) {
                const ts = this.map.tileSize;
                const gc = Math.floor(this.dragX / ts);
                const gr = Math.floor(this.dragY / ts);
                const gpx = gc * ts + ts / 2;
                const gpy = gr * ts + ts / 2;

                let valid = gc >= 0 && gc < this.map.cols && gr >= 0 && gr < this.map.rows;
                if (valid && this.map.isOnPath(gc, gr)) valid = false;
                if (valid && this.towers.some(t => Math.floor(t.x / ts) === gc && Math.floor(t.y / ts) === gr)) valid = false;
                if (valid && this.money < this.getTowerCost(this.dragType)) valid = false;

                const gcolor = valid ? '#4ecca3' : '#ff2e63';
                const grange = this.dragType === 'sniper' ? 250 : this.dragType === 'plasma' ? 200 : 120;

                this.ctx.save();
                this.ctx.globalAlpha = 0.5;
                this.ctx.beginPath();
                this.ctx.arc(gpx, gpy, grange, 0, Math.PI * 2);
                this.ctx.fillStyle = valid ? 'rgba(78,204,163,0.15)' : 'rgba(255,46,99,0.15)';
                this.ctx.fill();
                this.ctx.strokeStyle = gcolor;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();

                this.ctx.fillStyle = gcolor;
                this.ctx.beginPath();
                this.ctx.arc(gpx, gpy, 12, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            } else if (this.selectedTower) {
                // Draw selection ring
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(this.selectedTower.x, this.selectedTower.y, 35, 0, Math.PI * 2);
                this.ctx.stroke();

                // Range indicator
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(this.selectedTower.x, this.selectedTower.y, this.selectedTower.range, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Draw Sell Progress
            this.drawSellProgress();

            this.ctx.restore(); // Restore shake logic from beginning of draw
        }
    }



    drawSellProgress() {
        if (this.pressingTower && this.sellTimer > 0.2) {
            const t = this.pressingTower;
            const pct = Math.min(1, this.sellTimer / this.sellDuration);

            this.ctx.save();
            this.ctx.translate(t.x, t.y);

            // Background ring
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            // Progress ring
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct));
            this.ctx.strokeStyle = '#ff2e63';
            this.ctx.lineWidth = 4;
            this.ctx.stroke();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("SATILIYOR...", 0, -40);

            this.ctx.restore();
        }
    }

    updateMenu(deltaTime) {
        this.menuEntities.forEach(e => {
            // Add slight "wander" to velocity to mimic insects
            e.vx += (Math.random() - 0.5) * 100 * deltaTime;
            e.vy += (Math.random() - 0.5) * 100 * deltaTime;

            // Cap velocity
            const maxSpeed = 80;
            const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
            if (speed > maxSpeed) {
                e.vx = (e.vx / speed) * maxSpeed;
                e.vy = (e.vy / speed) * maxSpeed;
            }

            e.x += e.vx * deltaTime;
            e.y += e.vy * deltaTime;
            e.pulse += e.pulseSpeed * deltaTime;

            // Wrap around screen
            if (e.x < -50) e.x = this.menuCanvas.width + 50;
            if (e.x > this.menuCanvas.width + 50) e.x = -50;
            if (e.y < -50) e.y = this.menuCanvas.height + 50;
            if (e.y > this.menuCanvas.height + 50) e.y = -50;
        });
    }

    drawMenu() {
        this.menuCtx.clearRect(0, 0, this.menuCanvas.width, this.menuCanvas.height);

        // Adjust opacity based on state
        const isPlaying = this.gameState === 'playing' || this.gameState === 'paused';
        this.menuCtx.globalAlpha = isPlaying ? 0.4 : 1.0;

        this.menuEntities.forEach(e => {
            this.menuCtx.save();
            this.menuCtx.translate(e.x, e.y);

            // Pulse opacity - INCREASED BASE OPACITY
            const alpha = 0.6 + Math.sin(e.pulse) * 0.4; // Min 0.2 -> 0.6
            this.menuCtx.globalAlpha = (isPlaying ? 0.3 : 1.0) * alpha;

            this.menuCtx.fillStyle = e.color;
            this.menuCtx.shadowBlur = 15; // INCREASED GLOW
            this.menuCtx.shadowColor = e.color;

            // Draw "Insect" / "Drone" body
            this.menuCtx.beginPath();
            this.menuCtx.arc(0, 0, e.size, 0, Math.PI * 2);
            this.menuCtx.fill();

            // CORE: Draw white center for visibility
            this.menuCtx.fillStyle = '#fff';
            this.menuCtx.shadowBlur = 0;
            this.menuCtx.beginPath();
            this.menuCtx.arc(0, 0, e.size * 0.4, 0, Math.PI * 2);
            this.menuCtx.fill();


            // Draw "Wings" or "Glow Trail" (simple line behind movement)
            this.menuCtx.globalAlpha *= 0.5;
            this.menuCtx.beginPath();
            this.menuCtx.moveTo(0, 0);
            this.menuCtx.lineTo(-e.vx * 0.4, -e.vy * 0.4); // LONGER TRAIL
            this.menuCtx.strokeStyle = e.color;
            this.menuCtx.lineWidth = 2; // THICKER TRAIL
            this.menuCtx.stroke();

            this.menuCtx.restore();
        });

        this.menuCtx.globalAlpha = 1.0; // Reset
    }

    gameLoop(timestamp) {
        try {
            // Cap deltaTime to max 0.1s to prevent explosions after lag/background
            let deltaTime = (timestamp - this.lastTime) / 1000;
            if (deltaTime > 0.1) deltaTime = 0.1;

            this.lastTime = timestamp;

            // Always update background entities
            this.updateMenu(deltaTime);

            if (this.gameState === 'menu' || this.gameState === 'level_select') {
                this.draw(); // CRITICAL: Draw the clean background grid!
                this.drawMenu();
            } else if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameover' || this.gameState === 'menu_settings') {
                this.update(deltaTime * this.gameSpeed);
                this.draw();
                this.drawMenu();
            }
        } catch (e) {
            console.error("Game Loop Error:", e);
        }

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    spawnTestEnemy() {
        if (!this.map || !this.map.path) {
            console.error("FATAL: Map Not Loaded");
            return;
        }
        try {
            const e = new Enemy(this.map.path, 'normal', 1.0);
            this.enemies.push(e);
            console.log("SUCCESS: Enemy created at " + e.x + ", " + e.y);
        } catch (err) {
            console.error("CRASH: " + err.message);
        }
    }
}

// Global game instance
let game;
window.onload = () => {
    try {
        game = new Game();
    } catch (e) {
        console.error("Critical Game Error (Silenced):", e);
    }
    console.log("PARSING game.js END - Game Initialized");
};
