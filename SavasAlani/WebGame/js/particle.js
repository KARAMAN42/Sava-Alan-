class VisualFX {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.color = '#fff';
        this.size = 0;
        this.life = 0;
        this.vx = 0;
        this.vy = 0;
    }
}

class EffectSystem {
    constructor() {
        this.limit = 50; // Hard limit: 50 particles MAX on screen
        this.pool = [];
        this.index = 0; // Ring buffer index
        this.enabled = true;

        // Pre-allocate everything
        for (let i = 0; i < this.limit; i++) {
            this.pool.push(new VisualFX());
        }
    }

    trigger(type, x, y, color) {
        if (!this.enabled) return;
        // 1. Explosion: consistent pattern, no loops in Enemy.js
        if (type === 'explosion') {
            // Spawn 4 particles in a cross shape + 1 center
            this.spawn(x, y, color, 2, -2);
            this.spawn(x, y, color, -2, -2);
            this.spawn(x, y, color, 2, 2);
            this.spawn(x, y, color, -2, 2);
            this.spawn(x, y, '#fff', 0, 0); // Center flash
        }
        else if (type === 'hit') {
            // Just 1 spark
            this.spawn(x, y, color, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        }
    }

    spawn(x, y, color, vx, vy) {
        // RING BUFFER LOGIC: Always overwrite, never allocate
        const p = this.pool[this.index];

        p.active = true;
        p.x = x;
        p.y = y;
        p.color = color;
        p.vx = vx;
        p.vy = vy;
        p.life = 1.0; // Fixed life
        p.size = Math.random() * 3 + 2;

        // Increment ring index
        this.index++;
        if (this.index >= this.limit) {
            this.index = 0; // Loop back to start
        }
    }

    update(deltaTime) {
        // Simple loop, no filtering
        for (let i = 0; i < this.limit; i++) {
            const p = this.pool[i];
            if (p.active) {
                p.x += p.vx * 60 * deltaTime;
                p.y += p.vy * 60 * deltaTime;
                p.life -= deltaTime * 3; // Fade out speed

                if (p.life <= 0) {
                    p.active = false;
                }
            }
        }
    }

    draw(ctx) {
        ctx.globalAlpha = 1.0;
        for (let i = 0; i < this.limit; i++) {
            const p = this.pool[i];
            if (p.active) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fillRect(p.x, p.y, p.size, p.size); // Faster than arc
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
