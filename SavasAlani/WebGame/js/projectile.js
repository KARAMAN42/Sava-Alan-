class Projectile {
    constructor(x, y, target, damage, type = 'standard') {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type; // standard, sniper, rapid, plasma
        this.active = true;

        // Stats based on type
        if (type === 'sniper') {
            this.speed = 1200; // Very fast
            this.color = '#ffff00';
            this.radius = 3;
        } else if (type === 'plasma') {
            this.speed = 300; // Slow
            this.color = '#aa00ff';
            this.radius = 12; // Big orb
        } else if (type === 'rapid') {
            this.speed = 600;
            this.color = '#ff9900';
            this.radius = 3;
        } else {
            // Standard
            this.speed = 400;
            this.color = '#0f0';
            this.radius = 5;
        }

        // Trail effect storage
        this.trail = [];
        this.active = false; // Start inactive
    }

    reset(x, y, target, damage, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.type = type;
        this.active = true;
        this.trail = [];

        // Stats based on type
        if (type === 'sniper') {
            this.speed = 1200; this.color = '#ffff00'; this.radius = 3;
        } else if (type === 'plasma') {
            this.speed = 300; this.color = '#aa00ff'; this.radius = 12;
        } else if (type === 'rapid') {
            this.speed = 600; this.color = '#ff9900'; this.radius = 3;
        } else {
            this.speed = 400; this.color = '#0f0'; this.radius = 5;
        }
    }

    update(deltaTime) {
        if (!this.active) return;

        // Record trail position
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();

        if (this.target.dead) {
            this.active = false;
            return;
        }

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + 5) {
            this.hit();
            return;
        }

        const moveDist = this.speed * deltaTime;
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
    }

    hit() {
        if (this.type === 'plasma') {
            // Splash Damage logic
            game.enemies.forEach(e => {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) { // 100px Splash Radius
                    e.takeDamage(this.damage);
                    // game.addFloatingText(e.x, e.y - 10, this.damage, '#aa00ff'); // REMOVED per user request
                }
            });
            audio.playHit();
            // New FX System
            game.effects.trigger('explosion', this.x, this.y, '#aa00ff');

            // game.shake = 10; // Disabled
        } else {
            // Standard Damage
            this.target.takeDamage(this.damage);
            // game.addFloatingText(this.target.x, this.target.y - 10, this.damage, '#fff'); // REMOVED per user request
            audio.playHit();

            // Hit particles
            game.effects.trigger('hit', this.target.x, this.target.y, this.color);
        }

        this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw Trail
        // Draw Trail - DISABLED FOR PERFORMANCE
        /*
        if (this.type !== 'standard') { 
            ctx.beginPath();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            if (this.trail.length > 0) {
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                for (let i = 1; i < this.trail.length; i++) {
                    ctx.lineTo(this.trail[i].x, this.trail[i].y);
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        */

        // Draw Projectile
        ctx.fillStyle = this.color;
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'plasma') {
            // Plasma inner core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // ctx.shadowBlur = 0;
    }
}
