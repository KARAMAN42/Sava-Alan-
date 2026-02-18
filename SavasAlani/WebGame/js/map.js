class GameMap {
    constructor(ctx) {
        this.ctx = ctx;
        this.tileSize = 48; // Scaled down for broader view (was 64)
        this.cols = 26; // 1280 / 48 approx 26.6
        this.rows = 15; // 720 / 48 = 15

        this.currentPath = [];
        this.paths = [
            // Level 1: Simple Zig Zag (Scaled for 48px tiles)
            [
                { x: 0, y: 3 }, { x: 5, y: 3 },
                { x: 5, y: 11 }, { x: 13, y: 11 },
                { x: 13, y: 5 }, { x: 21, y: 5 },
                { x: 21, y: 12 }, { x: 26, y: 12 }
            ],
            // Level 2: "Perfect Spiral" (High Res)
            [
                { x: 3.5, y: 16.0 }, { x: 3.5, y: 5.0 },
                // Top Left Corner
                { x: 3.5, y: 4.8 }, { x: 3.6, y: 4.4 }, { x: 3.8, y: 4.0 }, { x: 4.1, y: 3.7 }, { x: 4.4, y: 3.4 }, { x: 4.8, y: 3.2 }, { x: 5.3, y: 3.1 }, { x: 5.7, y: 3.0 }, { x: 6.2, y: 3.0 }, { x: 6.5, y: 3.0 },
                // Top Line
                { x: 20.5, y: 3.0 },
                // Top Right Corner
                { x: 21.0, y: 3.0 }, { x: 21.5, y: 3.1 }, { x: 21.9, y: 3.2 }, { x: 22.3, y: 3.4 }, { x: 22.7, y: 3.7 }, { x: 22.9, y: 4.0 }, { x: 23.2, y: 4.4 }, { x: 23.4, y: 4.8 }, { x: 23.5, y: 5.3 },
                // Right Line
                { x: 23.5, y: 10.0 },
                // Bottom Right Corner
                { x: 23.5, y: 10.5 }, { x: 23.4, y: 10.9 }, { x: 23.2, y: 11.3 }, { x: 22.9, y: 11.7 }, { x: 22.6, y: 12.0 }, { x: 22.3, y: 12.3 }, { x: 21.9, y: 12.5 }, { x: 21.4, y: 12.6 }, { x: 21.0, y: 12.7 },
                // Bottom Line
                { x: 9.5, y: 12.7 },
                // Bottom Left Corner
                { x: 9.0, y: 12.7 }, { x: 8.6, y: 12.6 }, { x: 8.2, y: 12.5 }, { x: 7.8, y: 12.3 }, { x: 7.4, y: 12.0 }, { x: 7.1, y: 11.6 }, { x: 6.9, y: 11.3 }, { x: 6.7, y: 10.9 }, { x: 6.6, y: 10.4 },
                // Left Inner Line
                { x: 6.6, y: 7.5 },
                // Top Left Inner Corner
                { x: 6.6, y: 7.0 }, { x: 6.7, y: 6.6 }, { x: 6.9, y: 6.2 }, { x: 7.2, y: 5.9 }, { x: 7.5, y: 5.6 }, { x: 7.9, y: 5.4 }, { x: 8.3, y: 5.3 }, { x: 8.8, y: 5.2 }, { x: 9.2, y: 5.2 },
                // Center Line
                { x: 13.5, y: 5.2 },
                // Tiny hook to center
                { x: 14.0, y: 5.4 }
            ],
            // Level 3: "Snake" (Smooth Winding S)
            [
                { x: 0, y: 3 },
                { x: 4, y: 3 },
                { x: 7, y: 4 },
                { x: 8, y: 7 },
                { x: 7, y: 10 },
                { x: 4, y: 11 },
                { x: 3, y: 11 },
                { x: 3, y: 12 },
                { x: 7, y: 12 },
                { x: 11, y: 11 },
                { x: 13, y: 8 },
                { x: 16, y: 6 },
                { x: 19, y: 3 },
                { x: 23, y: 3 },
                { x: 26, y: 3 }
            ]
        ];

        this.cacheCanvas = document.createElement('canvas');
        this.cacheCanvas.width = 1280;
        this.cacheCanvas.height = 720;
        this.cacheCtx = this.cacheCanvas.getContext('2d');

        this.loadLevel(1);
    }

    loadLevel(level) {
        this.currentLevel = level;
        this.updatePath(level);
        this.renderStaticMap(); // Cache map on load
    }

    updatePath(level) {
        const index = (level - 1) % this.paths.length;
        this.path = this.paths[index];
    }

    renderStaticMap() {
        const ctx = this.cacheCtx;
        ctx.clearRect(0, 0, 1280, 720);

        // 1. Draw Sci-Fi Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, 1280, 720);

        // Grid Lines (Static)
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= 1280; x += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
        }
        for (let y = 0; y <= 720; y += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
        }

        // 2. Draw Neon Path
        if (this.path.length > 0) {
            ctx.save();
            ctx.shadowBlur = 10; // Caching allows shadowBlur!
            ctx.shadowColor = '#e94560';

            ctx.lineWidth = 44;
            ctx.strokeStyle = 'rgba(233, 69, 96, 0.1)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            const startX = 0;
            const startY = this.path[0].y * this.tileSize + this.tileSize / 2;
            ctx.moveTo(startX, startY);

            for (let i = 0; i < this.path.length; i++) {
                const px = this.path[i].x * this.tileSize + this.tileSize / 2;
                const py = this.path[i].y * this.tileSize + this.tileSize / 2;
                ctx.lineTo(px, py);
            }
            // Extension
            const lastP = this.path[this.path.length - 1];
            if (lastP.x >= 19 || lastP.y >= 11 || lastP.x <= 0 || lastP.y <= 0) {
                ctx.lineTo(1280, lastP.y * this.tileSize + this.tileSize / 2);
            }
            ctx.stroke();
            ctx.restore();

            // Inner Path
            ctx.lineWidth = 36;
            ctx.strokeStyle = '#1a1a2e';
            ctx.stroke();

            // Center Neon Line
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#e94560';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#e94560';
            ctx.stroke(); // Static line, no dash animation in cache
        }

        // 3. Draw Hole / Endpoint
        if (this.path.length > 0) {
            const endP = this.path[this.path.length - 1];
            if (endP.x > 0 && endP.x < 19 && endP.y > 0 && endP.y < 11) {
                const hx = endP.x * this.tileSize + this.tileSize / 2;
                const hy = endP.y * this.tileSize + this.tileSize / 2;

                ctx.save();
                ctx.translate(hx, hy);
                ctx.shadowBlur = 15; ctx.shadowColor = '#000';
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();

                const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 20);
                grad.addColorStop(0, '#000'); grad.addColorStop(0.5, '#330000'); grad.addColorStop(1, '#ff0000');
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }
    }

    renderGridOnly() {
        const ctx = this.cacheCtx;
        ctx.clearRect(0, 0, 1280, 720);

        // 1. Draw Sci-Fi Background
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(0, 0, 1280, 720);

        // Grid Lines (Static)
        ctx.strokeStyle = 'rgba(0, 234, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= 1280; x += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
        }
        for (let y = 0; y <= 720; y += this.tileSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
        }
    }

    draw() {
        // 1. Draw Cached Background (Instant)
        this.ctx.drawImage(this.cacheCanvas, 0, 0);

        // 2. Dynamic Overlay (Scanline Only)
        // Grid Drawing for Scanline Effect
        const scanLineY = (Date.now() / 20) % 720;
        this.ctx.lineWidth = 2;

        // Draw only the scanline row to save perf
        /*
        for (let y = 0; y <= 720; y += this.tileSize) {
             if (Math.abs(y - scanLineY) < 50) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = `rgba(0, 234, 255, ${0.4 * (1 - Math.abs(y - scanLineY) / 50)})`;
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(1280, y);
                this.ctx.stroke();
             }
        }
        */
        // Disabled Scanline for now to be safe

        // Dynamic Path Elements (Dash animation)
        if (this.path.length > 0) {
            this.ctx.save();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#e94560';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#e94560';
            this.ctx.setLineDash([10, 15]);
            this.ctx.lineDashOffset = -Date.now() / 50;

            this.ctx.beginPath();
            const startX = 0;
            const startY = this.path[0].y * this.tileSize + this.tileSize / 2;
            this.ctx.moveTo(startX, startY);

            for (let i = 0; i < this.path.length; i++) {
                const px = this.path[i].x * this.tileSize + this.tileSize / 2;
                const py = this.path[i].y * this.tileSize + this.tileSize / 2;
                this.ctx.lineTo(px, py);
            }

            const lastP = this.path[this.path.length - 1];
            if (lastP.x >= 19 || lastP.y >= 11 || lastP.x <= 0 || lastP.y <= 0) {
                this.ctx.lineTo(1280, lastP.y * this.tileSize + this.tileSize / 2);
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            this.ctx.restore();
        }

        // Dynamic Hole / Endpoint (Rotating Indicator)
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

            // If distance is less than tile radius + path radius (approx 30px width?)
            // Path width is 40px (radius 20). Tile 'radius' is 24 (48/2).
            // Total threshold = 20 + 24 = 44. Let's use 40 to be safe.
            if (dist < 40) return true;
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
