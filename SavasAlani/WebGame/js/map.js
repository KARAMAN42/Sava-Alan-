class GameMap {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.tileSize = 24; // Zoom out further (was 32)

        this.setupDimensions(width, height);

        this.currentPath = [];

        // Dynamic Paths Helper
        // We will define base paths and extend them based on grid width
        this.paths = [
            // Level 1: Zig Zag Extended
            [
                { x: 0, y: 3 }, { x: 5, y: 3 },
                { x: 5, y: 11 }, { x: 13, y: 11 },
                { x: 13, y: 5 }, { x: 21, y: 5 },
                { x: 21, y: 12 },
                // Extension point - keeps going right if screen is wider
                // We'll calculate the rest in updatePath or handle it here
            ],
            // Level 2: "Perfect Spiral" (High Res) -> Needs manual update for dynamic, stick to static for now or center it
            [
                { x: 3.5, y: 16.0 }, { x: 3.5, y: 5.0 },
                // ... (Spiral content is complex, might need more work to dynamically scale, keeping it centered or fixed for now)
                { x: 3.5, y: 4.8 }, { x: 3.6, y: 4.4 }, { x: 3.8, y: 4.0 }, { x: 4.1, y: 3.7 }, { x: 4.4, y: 3.4 }, { x: 4.8, y: 3.2 }, { x: 5.3, y: 3.1 }, { x: 5.7, y: 3.0 }, { x: 6.2, y: 3.0 }, { x: 6.5, y: 3.0 },
                { x: 20.5, y: 3.0 },
                { x: 21.0, y: 3.0 }, { x: 21.5, y: 3.1 }, { x: 21.9, y: 3.2 }, { x: 22.3, y: 3.4 }, { x: 22.7, y: 3.7 }, { x: 22.9, y: 4.0 }, { x: 23.2, y: 4.4 }, { x: 23.4, y: 4.8 }, { x: 23.5, y: 5.3 },
                { x: 23.5, y: 10.0 },
                { x: 23.5, y: 10.5 }, { x: 23.4, y: 10.9 }, { x: 23.2, y: 11.3 }, { x: 22.9, y: 11.7 }, { x: 22.6, y: 12.0 }, { x: 22.3, y: 12.3 }, { x: 21.9, y: 12.5 }, { x: 21.4, y: 12.6 }, { x: 21.0, y: 12.7 },
                { x: 9.5, y: 12.7 },
                { x: 9.0, y: 12.7 }, { x: 8.6, y: 12.6 }, { x: 8.2, y: 12.5 }, { x: 7.8, y: 12.3 }, { x: 7.4, y: 12.0 }, { x: 7.1, y: 11.6 }, { x: 6.9, y: 11.3 }, { x: 6.7, y: 10.9 }, { x: 6.6, y: 10.4 },
                { x: 6.6, y: 7.5 },
                { x: 6.6, y: 7.0 }, { x: 6.7, y: 6.6 }, { x: 6.9, y: 6.2 }, { x: 7.2, y: 5.9 }, { x: 7.5, y: 5.6 }, { x: 7.9, y: 5.4 }, { x: 8.3, y: 5.3 }, { x: 8.8, y: 5.2 }, { x: 9.2, y: 5.2 },
                { x: 13.5, y: 5.2 },
                { x: 14.0, y: 5.4 }
            ],
            // Level 3: "Snake"
            [
                { x: 0, y: 3 }, { x: 4, y: 3 }, { x: 7, y: 4 }, { x: 8, y: 7 }, { x: 7, y: 10 }, { x: 4, y: 11 },
                { x: 3, y: 11 }, { x: 3, y: 12 }, { x: 7, y: 12 }, { x: 11, y: 11 }, { x: 13, y: 8 },
                { x: 16, y: 6 }, { x: 19, y: 3 }, { x: 23, y: 3 }, { x: 26, y: 3 }
            ]
        ];

        this.cacheCanvas = document.createElement('canvas');
        this.resize(width, height);
        this.loadLevel(1);
    }

    setupDimensions(width, height) {
        this.cols = Math.ceil(width / this.tileSize);
        this.rows = Math.ceil(height / this.tileSize);
    }

    resize(width, height) {
        width = width || 1;
        height = height || 1;
        if (width <= 0) width = 1;
        if (height <= 0) height = 1;

        this.setupDimensions(width, height);
        this.cacheCanvas.width = width;
        this.cacheCanvas.height = height;
        this.cacheCtx = this.cacheCanvas.getContext('2d');
        if (this.currentLevel) this.loadLevel(this.currentLevel);
    }

    loadLevel(level) {
        this.currentLevel = level;
        this.updatePath(level);
        this.generateMapData(); // NEW: Populate collision data
        this.renderStaticMap(); // Cache map on load
    }

    generateMapData() {
        this.data = new Array(this.cols * this.rows).fill(1); // 1 = Buildable

        // Mark path as 0 (Non-buildable)
        for (let p of this.path) {
            const index = p.y * this.cols + p.x;
            if (index >= 0 && index < this.data.length) {
                this.data[index] = 0;
            }
        }
    }

    updatePath(level) {
        if (level === 1) {
            // Level 1: Double U Winding Path
            this.path = [
                { x: 0, y: 2 },
                { x: 4, y: 2 },
                { x: 4, y: 10 },
                { x: 10, y: 10 },
                { x: 10, y: 4 },
                { x: 18, y: 4 },
                { x: 18, y: 10 },
                { x: 26, y: 10 },
                { x: 26, y: 2 },
                { x: 32, y: 2 },
                { x: 32, y: 8 },
                { x: 38, y: 8 }
            ];
        } else if (level === 2) {
            // Level 2: Dikdörtgen spiral (kullanıcı çizimi)
            this.path = [
                { x: 0, y: 14 },
                { x: 3, y: 14 },
                { x: 3, y: 2 },
                { x: 32, y: 2 },
                { x: 32, y: 13 },
                { x: 8, y: 13 },
                { x: 8, y: 5 },
                { x: 26, y: 5 },
                { x: 26, y: 10 },
                { x: 14, y: 10 }
            ];
        } else if (level === 3) {
            // Level 3: 3 U-dönüşlü zigzag (kullanıcı çizimi)
            this.path = [
                { x: 0, y: 2 },
                { x: 5, y: 2 },
                { x: 5, y: 14 },
                { x: 11, y: 14 },
                { x: 11, y: 2 },
                { x: 17, y: 2 },
                { x: 17, y: 14 },
                { x: 23, y: 14 },
                { x: 23, y: 2 },
                { x: 29, y: 2 },
                { x: 29, y: 14 }
            ];
        } else {
            const index = (level - 1) % this.paths.length;
            this.path = this.paths[index];
        }
    }

    renderStaticMap() {
        const ctx = this.cacheCtx;
        const width = this.cacheCanvas.width;
        const height = this.cacheCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Koyu arka plan
        ctx.fillStyle = '#07071a';
        ctx.fillRect(0, 0, width, height);

        // 2. Kareli arka plan + yol zemini
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                // Kareli desen - tüm hücreler aynı
                const isLight = (x + y) % 2 === 0;
                ctx.fillStyle = isLight ? '#1a1a40' : '#0d0d25';
                ctx.fillRect(px, py, this.tileSize, this.tileSize);

                // Hücre kenarlığı - tüm hücrelere
                ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);
            }
        }

        // 3. Yol çizgileri - beyaz yol, kesik çizgili orta şerit
        if (this.path.length > 0) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // A. Hafif dış glow
            ctx.lineWidth = this.tileSize * 0.7;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath(); this.drawPathLine(ctx); ctx.stroke();

            // B. Yolun ana gövdesi (beyaz)
            ctx.lineWidth = this.tileSize * 0.55;
            ctx.strokeStyle = '#e8e8e8';
            ctx.shadowBlur = 0;
            ctx.beginPath(); this.drawPathLine(ctx); ctx.stroke();

            // C. İç yüzey (açık gri)
            ctx.lineWidth = this.tileSize * 0.4;
            ctx.strokeStyle = '#f5f5f5';
            ctx.beginPath(); this.drawPathLine(ctx); ctx.stroke();

            // D. Orta kesik çizgi (koyu gri)
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(80, 80, 100, 0.6)';
            ctx.setLineDash([6, 8]);
            ctx.beginPath(); this.drawPathLine(ctx); ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
        }


        // 4. Endpoint (bitiş noktası) göstergesi
        if (this.path.length > 0) {
            const endP = this.path[this.path.length - 1];
            if (endP.x > 0 && endP.x < this.cols && endP.y > 0 && endP.y < this.rows) {
                const hx = endP.x * this.tileSize + this.tileSize / 2;
                const hy = endP.y * this.tileSize + this.tileSize / 2;

                ctx.save();
                ctx.translate(hx, hy);
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ff2e63';

                ctx.strokeStyle = '#ff2e63';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, this.tileSize * 0.8, 0, Math.PI * 2); ctx.stroke();

                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(0, 0, this.tileSize * 0.6, 0, Math.PI * 2); ctx.fill();

                const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.tileSize * 0.6);
                grad.addColorStop(0, '#ff2e63');
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, this.tileSize * 0.6, 0, Math.PI * 2); ctx.fill();

                ctx.restore();
            }
        }
    }

    drawPathLine(ctx) {
        if (this.path.length === 0) return;

        ctx.moveTo(
            this.path[0].x * this.tileSize + this.tileSize / 2,
            this.path[0].y * this.tileSize + this.tileSize / 2
        );

        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(
                this.path[i].x * this.tileSize + this.tileSize / 2,
                this.path[i].y * this.tileSize + this.tileSize / 2
            );
        }
    }

    renderGridOnly() {
        const ctx = this.cacheCtx;
        const width = this.cacheCanvas.width;
        const height = this.cacheCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw Sci-Fi Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, width, height);

        // Grid Lines (Static)
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
    }

    draw() {
        // 1. Draw Cached Background (Instant)
        this.ctx.drawImage(this.cacheCanvas, 0, 0);

        // 2. Dynamic Overlay (Rotating Endpoint Indicator)
        if (this.path.length > 0) {
            const endP = this.path[this.path.length - 1];
            if (endP.x > 0 && endP.x < 19 && endP.y > 0 && endP.y < 11) {
                const hx = endP.x * this.tileSize + this.tileSize / 2;
                const hy = endP.y * this.tileSize + this.tileSize / 2;

                this.ctx.save();
                this.ctx.translate(hx, hy);
                this.ctx.rotate(Date.now() / 500);
                this.ctx.strokeStyle = '#ff2e63';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
    }

    getGridPos(x, y) {
        return {
            x: Math.floor(x / this.tileSize),
            y: Math.floor(y / this.tileSize)
        };
    }

    // Helper to get pixel position from grid index
    getPixelPos(gridX, gridY) {
        return {
            x: gridX * this.tileSize + this.tileSize / 2,
            y: gridY * this.tileSize + this.tileSize / 2
        };
    }

    isOnPath(gridX, gridY) {
        if (!this.path || this.path.length < 2) return false;

        const tileCenter = {
            x: gridX * this.tileSize + this.tileSize / 2,
            y: gridY * this.tileSize + this.tileSize / 2
        };
        const r = this.tileSize / 2; // Radius of tower for collision checks (approx)

        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = {
                x: this.path[i].x * this.tileSize + this.tileSize / 2,
                y: this.path[i].y * this.tileSize + this.tileSize / 2
            };
            const p2 = {
                x: this.path[i + 1].x * this.tileSize + this.tileSize / 2,
                y: this.path[i + 1].y * this.tileSize + this.tileSize / 2
            };

            // Distance from point (tileCenter) to line segment (p1-p2)
            const dist = this.distToSegment(tileCenter, p1, p2);

            // Yol genişliğine uygun eşik
            if (dist < this.tileSize * 0.6) return true;
        }
        return false;
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
        if (l2 === 0) return Math.sqrt((p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const px = v.x + t * (w.x - v.x);
        const py = v.y + t * (w.y - v.y);
        return Math.sqrt((p.x - px) * (p.x - px) + (p.y - py) * (p.y - py));
    }
}
