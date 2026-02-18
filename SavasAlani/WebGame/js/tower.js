class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type.toLowerCase(); // standard, sniper, rapid, tesla, plasma

        // Default stats
        this.range = 150;
        this.damage = 11; // Buffed +10% (was 10)
        this.fireRate = 1.0;
        this.cooldown = 0;
        this.level = 1;
        this.maxLevel = 3;

        // Base stats based on type (Scaled for 48px tiles)
        if (this.type === 'sniper') {
            this.range = 250;
            this.damage = 28; // Buffed +10% (was 25)
            this.fireRate = 2.0;
            this.color = '#00ff00';
            this.radius = 20;
        } else if (this.type === 'rapid') {
            this.range = 120;
            this.damage = 4; // Buffed +10% (was 3 -> 3.3 -> 4 ceil)
            this.fireRate = 0.15;
            this.color = '#ffff00';
            this.radius = 20;
        } else if (this.type === 'tesla') {
            this.range = 120;
            this.damage = 4; // Buffed +10% (was 3 -> 3.3 -> 4 ceil)
            this.fireRate = 1.2;
            this.color = '#00ffff';
            this.radius = 20;
        } else if (this.type === 'plasma') {
            this.range = 180;
            this.damage = 44; // Buffed +10% (was 40)
            this.fireRate = 1.8;
            this.color = '#ff00ff';
            this.radius = 22;
        } else {
            // Standard
            this.range = 150;
            this.damage = 6; // Buffed +10% (was 5 -> 5.5 -> 6)
            this.fireRate = 0.6;
            this.color = '#ff2e63';
            this.radius = 20;
        }

        this.angle = 0;
        this.target = null;

        // Visuals
        this.recoil = 0;

        // Tesla Visuals
        this.lightningTarget = null;
        this.lightningTimer = 0;
    }

    getUpgradeCost() {
        let baseCost = 50;
        if (this.type === 'sniper') baseCost = 100;
        if (this.type === 'rapid') baseCost = 150;
        if (this.type === 'tesla') baseCost = 200;
        if (this.type === 'plasma') baseCost = 300;

        return Math.floor(baseCost * (0.5 * this.level));
    }

    getNextStats() {
        // Returns stats for the NEXT level
        if (this.level >= this.maxLevel) return null;

        let d = this.damage;
        let r = this.range;
        let f = this.fireRate;

        if (this.type === 'standard') {
            d += 10; r += 20; f *= 0.9;
        } else if (this.type === 'sniper') {
            d += 40; r += 50;
        } else if (this.type === 'rapid') {
            d += 3; f *= 0.8; r += 10;
        } else if (this.type === 'tesla') {
            d += 5; f *= 0.9; r += 20;
        } else if (this.type === 'plasma') {
            d += 50; r += 20;
        }

        return { damage: d, range: r, fireRate: f };
    }

    getSellValue() {
        let baseCost = 50;
        if (this.type === 'sniper') baseCost = 100;
        if (this.type === 'rapid') baseCost = 150;
        if (this.type === 'tesla') baseCost = 200;
        if (this.type === 'plasma') baseCost = 300;

        // Refund 50% of base + 50% of upgrade modifications (simplified)
        let totalInvested = baseCost;
        // Approximation of investment
        for (let i = 1; i < this.level; i++) {
            totalInvested += Math.floor(baseCost * (0.5 * i));
        }
        return Math.floor(totalInvested * 0.5);
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;

        // Apply stats directly from logic
        const next = this.getNextStats(); // Reuse logic
        if (next) {
            this.damage = next.damage;
            this.range = next.range;
            this.fireRate = next.fireRate;
        }

        this.level++;
        return true;
    }

    update(deltaTime) {
        // Cooldown
        if (this.recoil > 0) this.recoil -= 0.5;
        this.cooldown -= deltaTime;

        // Efficient Target Logic
        if (this.target) {
            // Check if still valid (alive and in range)
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.target.dead || dist > this.range) {
                this.target = null; // Lost target
            }
        }

        if (!this.target) {
            this.target = this.findTarget();
        }

        if (this.target) {
            // Rotate towards target
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);

            // Shoot
            if (this.cooldown <= 0) {
                this.shoot(this.target);
                this.cooldown = this.fireRate;
            }
        }
    }

    findTarget() {
        // Simple closest target logic
        let closest = null;
        let minDist = Infinity;

        game.enemies.forEach(e => {
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= this.range && dist < minDist) {
                closest = e;
                minDist = dist;
            }
        });

        return closest;
    }

    shoot(target) {
        // Special Logic for Tesla (Instant/Chain)
        if (this.type === 'tesla') {
            audio.playShoot('tesla');
            target.takeDamage(this.damage);
            target.applySlow(0.2, 3.0); // 80% slow for 3s

            // Visual Chain Lightning (Extended Duration)
            this.lightningTarget = target;
            this.lightningTimer = 0.4; // Show for 400ms

        } else {
            // Projectile based
            // Pass type to projectile so it knows what to look like
            game.spawnProjectile(this.x, this.y, target, this.damage, this.type);

            audio.playShoot(this.type);
            this.recoil = 6;

            const muzzleDist = (this.type === 'sniper') ? 45 : 25;
            game.spawnParticle(this.x + Math.cos(this.angle) * muzzleDist, this.y + Math.sin(this.angle) * muzzleDist, '#ffff00', 1, 0.1);
        }
    }

    draw(ctx) {
        try {
            ctx.save();
            ctx.translate(this.x, this.y);

            // --- Lightning Effect (Tesla) ---
            if (this.type === 'tesla' && this.lightningTarget && this.lightningTimer > 0) {
                this.lightningTimer -= 0.016; // Approx delta
                if (!this.lightningTarget.dead) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.strokeStyle = '#00eaff';
                    ctx.lineWidth = 3;
                    // ctx.shadowBlur = 20;
                    // ctx.shadowColor = '#00eaff';
                    ctx.beginPath();
                    ctx.moveTo(0, -20); // Top of coil

                    // Zigzag line
                    const targetX = (this.lightningTarget.x - this.x); // Local space
                    const targetY = (this.lightningTarget.y - this.y);
                    const dist = Math.sqrt(targetX * targetX + targetY * targetY);
                    const steps = dist / 20;

                    for (let i = 0; i <= steps; i++) {
                        const t = i / steps;
                        const noise = (Math.random() - 0.5) * 20;
                        ctx.lineTo(targetX * t + noise, targetY * t + noise);
                    }
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // --- Procedural Tower Art ---
            // ctx.shadowBlur = 15;

            // Base - Common high-tech foundation
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

            // Level Ring
            let ringColor = '#4ecca3';
            if (this.type === 'sniper') ringColor = '#e94560';
            if (this.type === 'rapid') ringColor = '#fcdab7';
            if (this.type === 'tesla') ringColor = '#00eaff';
            if (this.type === 'plasma') ringColor = '#aa00ff';

            // ctx.shadowColor = ringColor;
            for (let i = 0; i < this.level; i++) {
                ctx.strokeStyle = ringColor;
                ctx.globalAlpha = 0.5 + (i * 0.2);
                ctx.beginPath();
                ctx.arc(0, 0, 26 + (i * 4), 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;

            // --- Turret Head ---
            const kick = -this.recoil;

            if (this.type === 'standard') {
                // Blaster
                ctx.rotate(this.angle);
                ctx.fillStyle = '#1a1a2e'; ctx.fillRect(-12 + kick, -12, 24, 24);
                ctx.strokeStyle = '#4ecca3'; ctx.strokeRect(-12 + kick, -12, 24, 24);
                ctx.fillStyle = '#4ecca3'; ctx.fillRect(10 + kick, -8, 18, 5); ctx.fillRect(10 + kick, 3, 18, 5);

            } else if (this.type === 'sniper') {
                // Railgun
                ctx.rotate(this.angle);
                ctx.fillStyle = '#16213e';
                ctx.beginPath(); ctx.moveTo(-10 + kick, -6); ctx.lineTo(45 + kick, -4); ctx.lineTo(45 + kick, 4); ctx.lineTo(-10 + kick, 6); ctx.fill();
                ctx.fillStyle = '#e94560'; ctx.fillRect(0 + kick, -9, 35, 2); ctx.fillRect(0 + kick, 7, 35, 2);

            } else if (this.type === 'rapid') {
                // Shredder
                ctx.rotate(this.angle);
                ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-8 + kick, 0, 14, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#fcdab7'; ctx.stroke();
                ctx.fillStyle = '#888'; ctx.fillRect(15 + kick, -8, 20, 4); ctx.fillRect(15 + kick, -2, 20, 4); ctx.fillRect(15 + kick, 4, 20, 4);

            } else if (this.type === 'tesla') {
                // Tesla Coil (Redesigned)
                // Static Base (No rotation)
                ctx.fillStyle = '#0f3460';
                ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();

                // Coil Spikes (Rotating)
                const time = Date.now() / 200;
                ctx.save();
                ctx.rotate(time); // Constant rotation
                ctx.fillStyle = '#00eaff';
                for (let i = 0; i < 4; i++) {
                    ctx.rotate(Math.PI / 2);
                    ctx.fillRect(8, -4, 12, 8); // Coils
                    ctx.beginPath(); ctx.arc(20, 0, 4, 0, Math.PI * 2); ctx.fill(); // Nodes
                }
                ctx.restore();

                // Central Electrode
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                // Arcs
                ctx.strokeStyle = '#00eaff';
                ctx.beginPath(); ctx.arc(0, 0, 10 + Math.sin(time * 5) * 2, 0, Math.PI * 2); ctx.stroke();

            } else if (this.type === 'plasma') {
                // Plasma Launcher (Redesigned)
                ctx.rotate(this.angle);

                // Heavy mount
                ctx.fillStyle = '#222';
                ctx.fillRect(-20 + kick, -20, 25, 40);

                // Energy Chamber
                ctx.fillStyle = '#111';
                ctx.beginPath(); ctx.arc(5 + kick, 0, 15, 0, Math.PI * 2); ctx.fill();

                // Pulsing Core
                const pulse = (Date.now() % 500) / 500;
                ctx.fillStyle = `rgba(170, 0, 255, ${0.5 + pulse})`;
                // ctx.shadowBlur = 20; ctx.shadowColor = '#aa00ff';
                ctx.beginPath(); ctx.arc(5 + kick, 0, 8 + pulse * 2, 0, Math.PI * 2); ctx.fill();

                // Rails
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#aa00ff';
                ctx.fillRect(10 + kick, -15, 20, 6);
                ctx.fillRect(10 + kick, 9, 20, 6);
            }

            // ctx.shadowBlur = 0;
            ctx.restore();
        } catch (e) {
            console.error("Tower Draw Error", this.type, e);
            ctx.restore(); // Ensure restore happens
        }
    }

}
