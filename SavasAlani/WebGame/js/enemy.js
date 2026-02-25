class Enemy {
    constructor(path, type = 'normal', levelMult = 1.0) {
        this.path = path;
        this.pathIndex = 0;
        this.type = type;

        // Base Stats
        // Base Stats
        if (isNaN(levelMult) || levelMult < 1) levelMult = 1.0;

        // Base Stats
        if (type === 'fast') {
            this.speed = 180;
            this.health = 100 * levelMult; // Buffed from 40 to 100
            this.maxHealth = 100 * levelMult;
            this.bounty = Math.floor(15 * levelMult);
            this.color = '#ffff00';
            this.radius = 15;
        } else if (type === 'tank') {
            this.speed = 40;
            this.health = 500 * levelMult; // Buffed
            this.maxHealth = 500 * levelMult;
            this.bounty = Math.floor(25 * levelMult);
            this.color = '#00ffff';
            this.radius = 30;
        } else if (type === 'boss') {
            this.speed = 30;
            this.health = 5000 * levelMult; // Massive buff
            this.maxHealth = 5000 * levelMult;
            this.bounty = Math.floor(500 * levelMult);
            this.color = '#aa00ff';
            this.radius = 50;
        } else if (type === 'scout') {
            this.speed = 150;
            this.health = 80 * levelMult;
            this.maxHealth = 80 * levelMult;
            this.bounty = 12;
            this.color = '#4ecca3';
            this.radius = 14;
        } else if (type === 'heavy') {
            this.speed = 30;
            this.health = 1000 * levelMult;
            this.maxHealth = 1000 * levelMult;
            this.bounty = 60;
            this.color = '#b2bec3';
            this.radius = 35;
        } else if (type === 'mantis') {
            this.speed = 90;
            this.health = 300 * levelMult;
            this.maxHealth = 300 * levelMult;
            this.bounty = 30;
            this.color = '#74b9ff';
            this.radius = 25;
        } else if (type === 'fly') {
            this.speed = 220;
            this.health = 50 * levelMult;
            this.maxHealth = 50 * levelMult;
            this.bounty = 10;
            this.color = '#ffffff';
            this.radius = 12;
        } else {
            // Normal
            this.speed = 80;
            this.health = 150 * levelMult; // Buffed from 60 to 150
            this.maxHealth = 150 * levelMult;
            this.bounty = Math.floor(10 * levelMult);
            this.color = '#ff2e63';
            this.radius = 20;
        }

        this.dead = false;

        // Initialize position at start of path
        if (path && path.length > 0) {
            const start = this.getGridPos(0);
            this.x = start.x;
            this.y = start.y;
            this.targetX = start.x;
            this.targetY = start.y;
        }

        this.speedMult = 1.0;
        this.slowTimer = 0;
        this.hitTimer = 0; // Flash effect
        this.scale = 1.0; // For visual effects
    }

    getGridPos(index) {
        const tileSize = game.map ? game.map.tileSize : 24; // Use dynamic size
        if (index >= this.path.length) return null;
        return {
            x: this.path[index].x * tileSize + tileSize / 2,
            y: this.path[index].y * tileSize + tileSize / 2
        };
    }

    update(deltaTime) {
        if (this.dead) return;

        // Slow Logic
        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) {
                this.speedMult = 1.0; // Reset speed
            }
        }

        if (this.hitTimer > 0) {
            this.hitTimer -= deltaTime;
        }

        // Movement Logic
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const currentSpeed = this.speed * this.speedMult; // Apply slow

        // Shrink visual if near end of path (entering hole)
        if (this.pathIndex === this.path.length - 1) {
            // Start shrinking sooner: when dist < 40
            if (dist < 40) {
                // Map distance 40->0 to scale 1.0->0.0
                this.scale = Math.max(0, dist / 40);
            }
        }

        if (dist <= 5) {
            // Reached waypoint
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                // Ensure scale is 0 just in case
                this.scale = 0;
                this.reachEnd();
                return;
            }
            const next = this.getGridPos(this.pathIndex);
            this.targetX = next.x;
            this.targetY = next.y;
        } else {
            // Move towards target
            const moveDist = currentSpeed * deltaTime;
            this.x += (dx / dist) * moveDist;
            this.y += (dy / dist) * moveDist;
        }
    }

    applySlow(amount, duration) {
        this.speedMult = amount; // e.g. 0.7 for 30% slow
        this.slowTimer = duration;
    }

    draw(ctx) {
        if (this.dead) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        const globalScale = game.map ? game.map.tileSize / 48 : 1;
        ctx.scale(this.scale * globalScale, this.scale * globalScale);

        // Face detection
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);

        // Damage Flash Effect
        if (this.hitTimer > 0) {
            ctx.filter = 'brightness(200%) saturate(50%)'; // Flash white/bright
        }

        // --- Neon Insect Art ---
        const legWiggle = Math.sin(Date.now() / 50) * 3;

        if (this.type === 'fast') this.drawWasp(ctx, legWiggle);
        else if (this.type === 'tank') this.drawBeetle(ctx, legWiggle); // Reuse beetle for tank or heavy? Tank was blue beetle.
        else if (this.type === 'boss') this.drawQueen(ctx, legWiggle);
        else if (this.type === 'scout') this.drawScout(ctx, legWiggle);
        else if (this.type === 'heavy') this.drawRhinoBeetle(ctx, legWiggle);
        else if (this.type === 'mantis') this.drawMantis(ctx, legWiggle);
        else if (this.type === 'fly') this.drawFly(ctx, legWiggle);
        else this.drawAnt(ctx, legWiggle);

        ctx.restore();

        // Draw Health Bar
        const barWidth = 40;
        const healthPct = this.health / this.maxHealth;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - barWidth / 2, this.y - 45, barWidth, 4);

        ctx.fillStyle = this.hitTimer > 0 ? '#fff' : '#0f0'; // Flash bar too
        ctx.fillRect(this.x - barWidth / 2, this.y - 45, barWidth * healthPct, 4);
    }

    // --- Specific Draw Methods ---

    drawWasp(ctx, legWiggle) {
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = '#ffcc00';

        // Wings
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const wingFlap = Math.sin(Date.now() / 20) * 10;

        ctx.beginPath(); // Left wing
        ctx.ellipse(0, -10, 15, 5, Math.PI / 4 + (wingFlap * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath(); // Right wing
        ctx.ellipse(0, 10, 15, 5, -Math.PI / 4 - (wingFlap * 0.05), 0, Math.PI * 2);
        ctx.fill();

        // Abdomen
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(8, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Green Eyes
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(10, -2, 1.5, 0, Math.PI * 2);
        ctx.arc(10, 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBeetle(ctx, legWiggle) { // Tank
        // ctx.shadowBlur = 15;
        // ctx.shadowColor = '#00ffff';

        // Legs (6 legs)
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Right legs
        ctx.moveTo(0, 5); ctx.lineTo(5, 20 + legWiggle);
        ctx.moveTo(-5, 5); ctx.lineTo(-10, 20 - legWiggle);
        ctx.moveTo(5, 5); ctx.lineTo(15, 20 + legWiggle);
        // Left legs
        ctx.moveTo(0, -5); ctx.lineTo(5, -20 - legWiggle);
        ctx.moveTo(-5, -5); ctx.lineTo(-10, -20 + legWiggle);
        ctx.moveTo(5, -5); ctx.lineTo(15, -20 - legWiggle);
        ctx.stroke();

        // Shell
        ctx.fillStyle = '#0f3460';
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shell Pattern
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-18, 0); ctx.lineTo(18, 0);
        ctx.stroke();

        // Mandibles
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(15, -5); ctx.lineTo(25, -2); ctx.lineTo(18, -1);
        ctx.moveTo(15, 5); ctx.lineTo(25, 2); ctx.lineTo(18, 1);
        ctx.fill();
    }

    drawQueen(ctx, legWiggle) {
        // ctx.shadowBlur = 25;
        // ctx.shadowColor = '#aa00ff';

        // Huge Legs
        ctx.strokeStyle = '#aa00ff';
        ctx.lineWidth = 4;
        for (let i = 0; i < 4; i++) {
            // Left
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(10 + i * 5, -30 - (legWiggle * (i % 2 == 0 ? 1 : -1)));
            ctx.stroke();
            // Right
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.lineTo(10 + i * 5, 30 + (legWiggle * (i % 2 == 0 ? 1 : -1)));
            ctx.stroke();
        }

        // Abdomen (Pulsing)
        const pulse = (Date.now() % 1000) / 1000;
        ctx.fillStyle = `rgba(100, 0, 180, ${0.5 + pulse * 0.5})`;
        ctx.beginPath();
        ctx.ellipse(-20, 0, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Thorax
        ctx.fillStyle = '#330066';
        ctx.beginPath();
        ctx.arc(10, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Multiple Eyes
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(15, 0, 3, 0, Math.PI * 2);
        ctx.arc(18, -5, 2, 0, Math.PI * 2);
        ctx.arc(18, 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawScout(ctx, legWiggle) {
        // ctx.shadowBlur = 8;
        // ctx.shadowColor = '#4ecca3';

        // Thin segmented body
        ctx.fillStyle = '#4ecca3';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(-5 + i * 6, 0, 5 - i, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Long Antennae
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -2); ctx.quadraticCurveTo(15, -10, 25, -15 - legWiggle);
        ctx.moveTo(8, 2); ctx.quadraticCurveTo(15, 10, 25, 15 + legWiggle);
        ctx.stroke();
    }

    drawRhinoBeetle(ctx, legWiggle) {
        // ctx.shadowBlur = 15;
        // ctx.shadowColor = '#ff2e63';

        // 6 Bulky Legs
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 4;
        for (let i = -1; i <= 1; i++) {
            // Left
            ctx.beginPath();
            ctx.moveTo(i * 10, -10);
            ctx.lineTo(i * 15, -25 - (legWiggle * (i === 0 ? 1 : -1)));
            ctx.stroke();
            // Right
            ctx.beginPath();
            ctx.moveTo(i * 10, 10);
            ctx.lineTo(i * 15, 25 + (legWiggle * (i === 0 ? 1 : -1)));
            ctx.stroke();
        }

        // Bulky Main Shell (Elytra)
        ctx.fillStyle = '#b2bec3';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 22, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax (Connecting Head)
        ctx.fillStyle = '#636e72';
        ctx.beginPath();
        ctx.ellipse(12, 0, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // The Glowing Rhino Horn
        // ctx.shadowBlur = 20;
        // ctx.shadowColor = '#ff2e63';
        ctx.fillStyle = '#ff2e63';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.quadraticCurveTo(25, -15, 35, -20);
        ctx.quadraticCurveTo(28, -10, 22, 0);
        ctx.closePath();
        ctx.fill();

        // Small glowing eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(18, -4, 2, 0, Math.PI * 2);
        ctx.arc(18, 4, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMantis(ctx, legWiggle) {
        // ctx.shadowBlur = 12;
        // ctx.shadowColor = '#74b9ff';

        // Long body
        ctx.fillStyle = '#0984e3';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 25, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Serrated Arms
        ctx.strokeStyle = '#74b9ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(15, -5); ctx.lineTo(25, -15 - legWiggle); ctx.lineTo(35, -5);
        ctx.moveTo(15, 5); ctx.lineTo(25, 15 + legWiggle); ctx.lineTo(35, 5);
        ctx.stroke();
    }

    drawFly(ctx, legWiggle) {
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = '#fff';

        // Pulsing Wings
        const flap = Math.sin(Date.now() / 15) * 15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, -6, 12, 4, -flap * 0.05, 0, Math.PI * 2);
        ctx.ellipse(0, 6, 12, 4, flap * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Dot core
        ctx.fillStyle = '#00eaff';
        ctx.beginPath();
        ctx.arc(4, 0, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawAnt(ctx, legWiggle) {
        // ctx.shadowBlur = 10;
        // ctx.shadowColor = '#ff2e63';

        // Legs
        ctx.strokeStyle = '#ff2e63';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(-2, -15 - legWiggle);
        ctx.moveTo(5, -5); ctx.lineTo(8, -15 + legWiggle);

        ctx.moveTo(-5, 5); ctx.lineTo(-2, 15 + legWiggle);
        ctx.moveTo(5, 5); ctx.lineTo(8, 15 - legWiggle);
        ctx.stroke();

        // Body Segments
        ctx.fillStyle = '#ff2e63';
        // Abdomen
        ctx.beginPath(); ctx.ellipse(-10, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Thorax
        ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Head
        ctx.beginPath(); ctx.ellipse(8, 0, 5, 5, 0, 0, Math.PI * 2); ctx.fill();

        // Antennae
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, -2); ctx.lineTo(18, -8);
        ctx.moveTo(10, 2); ctx.lineTo(18, 8);
        ctx.stroke();
    }

    takeDamage(amount) {
        if (isNaN(amount)) {
            console.error("NaN Damage detected!", this);
            return;
        }
        this.health -= amount;
        this.health -= amount;
        // console.log(`Enemy Hit! Type: ${this.type}, Dmg: ${amount}, HP Left: ${this.health}`);

        this.hitTimer = 0.1; // Flash for 0.1s
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        console.log("Enemy Died at", this.x, this.y);
        this.dead = true;
        game.money += this.bounty;
        // game.updateMoneyDisplay(); // REMOVED: Causes Layout Thrashing

        audio.playExplosion();

        // New FX System: One call, handled by manager
        game.effects.trigger('explosion', this.x, this.y, this.color);

        // Screen Shake
        // game.shake = 5; // Disabled for performance
    }

    reachEnd() {
        console.log("Enemy Reached End (Lives -1)");
        this.dead = true;
        game.lives--;
        // document.getElementById('lives').innerText = game.lives; // REMOVED: Layout Thrashing
        if (game.lives <= 0) {
            game.triggerGameOver();
        }
    }
}
