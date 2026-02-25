class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type.toLowerCase(); // standard, sniper, rapid, tesla, plasma

        // Default stats
        this.range = 150;
        this.damage = 11;
        this.fireRate = 1.0;
        this.cooldown = 0;
        this.level = 1;
        this.maxLevel = 3;

        // Base stats based on type
        if (this.type === 'sniper') {
            this.range = 250;
            this.damage = 28;
            this.fireRate = 2.0;
            this.color = '#e94560';
            this.radius = 20;
        } else if (this.type === 'rapid') {
            this.range = 120;
            this.damage = 4;
            this.fireRate = 0.15;
            this.color = '#ffaa00';
            this.radius = 20;
        } else if (this.type === 'tesla') {
            this.range = 120;
            this.damage = 4;
            this.fireRate = 1.2;
            this.color = '#00eaff';
            this.radius = 20;
        } else if (this.type === 'plasma') {
            this.range = 180;
            this.damage = 44;
            this.fireRate = 1.8;
            this.color = '#cc44ff';
            this.radius = 22;
        } else {
            // Standard
            this.range = 150;
            this.damage = 6;
            this.fireRate = 0.6;
            this.color = '#4ecca3';
            this.radius = 20;
        }

        this.angle = 0;
        this.target = null;

        // Visuals
        this.recoil = 0;
        this._animTime = Math.random() * Math.PI * 2; // Random phase offset

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
        if (this.level >= this.maxLevel) return null;
        let d = this.damage, r = this.range, f = this.fireRate;
        if (this.type === 'standard') { d += 10; r += 20; f *= 0.9; }
        else if (this.type === 'sniper') { d += 40; r += 50; }
        else if (this.type === 'rapid') { d += 3; f *= 0.8; r += 10; }
        else if (this.type === 'tesla') { d += 5; f *= 0.9; r += 20; }
        else if (this.type === 'plasma') { d += 50; r += 20; }
        return { damage: d, range: r, fireRate: f };
    }

    getSellValue() {
        let baseCost = 50;
        if (this.type === 'sniper') baseCost = 100;
        if (this.type === 'rapid') baseCost = 150;
        if (this.type === 'tesla') baseCost = 200;
        if (this.type === 'plasma') baseCost = 300;
        let totalInvested = baseCost;
        for (let i = 1; i < this.level; i++) {
            totalInvested += Math.floor(baseCost * (0.5 * i));
        }
        return Math.floor(totalInvested * 0.5);
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;
        const next = this.getNextStats();
        if (next) {
            this.damage = next.damage;
            this.range = next.range;
            this.fireRate = next.fireRate;
        }
        this.level++;
        return true;
    }

    update(deltaTime) {
        if (this.recoil > 0) this.recoil -= 0.5;
        this.cooldown -= deltaTime;
        this._animTime += deltaTime * 2;

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (this.target.dead || dist > this.range) this.target = null;
        }

        if (!this.target) this.target = this.findTarget();

        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);
            if (this.cooldown <= 0) {
                this.shoot(this.target);
                this.cooldown = this.fireRate;
            }
        }
    }

    findTarget() {
        let closest = null, minDist = Infinity;
        game.enemies.forEach(e => {
            const dx = e.x - this.x, dy = e.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.range && dist < minDist) { closest = e; minDist = dist; }
        });
        return closest;
    }

    shoot(target) {
        if (this.type === 'tesla') {
            audio.playShoot('tesla');
            target.takeDamage(this.damage);
            target.applySlow(0.2, 3.0);
            this.lightningTarget = target;
            this.lightningTimer = 0.4;
        } else {
            game.spawnProjectile(this.x, this.y, target, this.damage, this.type);
            audio.playShoot(this.type);
            this.recoil = 6;
            const muzzleDist = (this.type === 'sniper') ? 45 : 25;
            game.spawnParticle(this.x + Math.cos(this.angle) * muzzleDist, this.y + Math.sin(this.angle) * muzzleDist, '#ffff00', 1, 0.1);
        }
    }

    draw(ctx, isPreview = false) {
        try {
            ctx.save();
            ctx.translate(this.x, this.y);

            const scale = isPreview ? 1 : (game.map ? game.map.tileSize / 48 : 1);
            ctx.scale(scale, scale);

            const t = this._animTime || 0;

            // ── Shared base platform ──
            this._drawBase(ctx, t);

            // ── Level rings ──
            this._drawLevelRings(ctx);

            // ── Tower-specific head ──
            switch (this.type) {
                case 'standard': this._drawStandard(ctx, t); break;
                case 'sniper': this._drawSniper(ctx, t); break;
                case 'rapid': this._drawRapid(ctx, t); break;
                case 'tesla': this._drawTesla(ctx, t); break;
                case 'plasma': this._drawPlasma(ctx, t); break;
            }

            // ── Tesla lightning ──
            if (this.type === 'tesla' && this.lightningTarget && this.lightningTimer > 0) {
                this._drawLightning(ctx);
                this.lightningTimer -= 0.016;
            }

            ctx.restore();
        } catch (e) {
            console.error('Tower Draw Error', this.type, e);
            ctx.restore();
        }
    }

    // ---- Shared helpers ----
    _drawBase(ctx, t) {
        // Shadow
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(3, 5, 22, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Outer ring
        const grad = ctx.createRadialGradient(0, -4, 2, 0, 0, 23);
        grad.addColorStop(0, '#2a2a4a');
        grad.addColorStop(1, '#0a0a18');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();

        // Metallic rim
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();

        // Inner plate bolts
        ctx.fillStyle = '#555';
        for (let i = 0; i < 4; i++) {
            const bx = Math.cos((i / 4) * Math.PI * 2) * 16;
            const by = Math.sin((i / 4) * Math.PI * 2) * 16;
            ctx.beginPath();
            ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawLevelRings(ctx) {
        const colors = {
            standard: '#4ecca3', sniper: '#e94560',
            rapid: '#ffaa00', tesla: '#00eaff', plasma: '#cc44ff'
        };
        const col = colors[this.type] || '#fff';
        for (let i = 0; i < this.level; i++) {
            ctx.save();
            ctx.globalAlpha = 0.4 + i * 0.2;
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = -this._animTime * 3;
            ctx.beginPath();
            ctx.arc(0, 0, 26 + i * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.setLineDash([]);
    }

    // ---- STANDARD: Dual autocannon ----
    _drawStandard(ctx, t) {
        ctx.save();
        ctx.rotate(this.angle);
        const kick = -this.recoil * 0.5;

        // Turret body — octagonal
        ctx.fillStyle = '#1e3a5f';
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
            const r = 14;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Top vent strips
        ctx.fillStyle = '#4ecca3';
        ctx.globalAlpha = 0.6;
        for (let i = -1; i <= 1; i++) {
            ctx.fillRect(-10, i * 5 - 1, 18, 2);
        }
        ctx.globalAlpha = 1;

        // Dual barrel mount
        ctx.fillStyle = '#0f2a3f';
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 1;
        // Upper barrel
        ctx.fillRect(kick + 2, -10, 24, 7);
        ctx.strokeRect(kick + 2, -10, 24, 7);
        // Lower barrel
        ctx.fillRect(kick + 2, 3, 24, 7);
        ctx.strokeRect(kick + 2, 3, 24, 7);

        // Barrel tips (glowing)
        ctx.fillStyle = '#4ecca3';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#4ecca3';
        ctx.fillRect(kick + 23, -11, 4, 9);
        ctx.fillRect(kick + 23, 2, 4, 9);
        ctx.shadowBlur = 0;

        // Center sensor
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ecca3';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    // ---- SNIPER: Railgun / long-range rifle ----
    _drawSniper(ctx, t) {
        ctx.save();
        ctx.rotate(this.angle);
        const kick = -this.recoil * 0.8;

        // Hexagonal body
        ctx.fillStyle = '#3d0018';
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            const r = 15;
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bipod struts
        ctx.strokeStyle = '#882233';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(kick + 5, 0); ctx.lineTo(kick + 18, -12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(kick + 5, 0); ctx.lineTo(kick + 18, 12); ctx.stroke();

        // Main barrel body
        ctx.fillStyle = '#1a0008';
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 1.5;
        // Taper shape
        ctx.beginPath();
        ctx.moveTo(kick - 8, -5);
        ctx.lineTo(kick + 52, -3);
        ctx.lineTo(kick + 52, 3);
        ctx.lineTo(kick - 8, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Barrel grooves
        ctx.strokeStyle = '#e94560';
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const bx = kick + 10 + i * 10;
            ctx.beginPath(); ctx.moveTo(bx, -5); ctx.lineTo(bx, 5); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Scope
        ctx.fillStyle = '#220010';
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 1.5;
        ctx.fillRect(kick, -10, 16, 8);
        ctx.strokeRect(kick, -10, 16, 8);
        ctx.fillStyle = `rgba(255,0,80,${0.4 + 0.3 * Math.sin(t * 3)})`;
        ctx.beginPath();
        ctx.arc(kick + 8, -6, 3, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle brake
        ctx.fillStyle = '#e94560';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#e94560';
        ctx.fillRect(kick + 48, -5, 6, 10);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff2e63';
        ctx.beginPath();
        ctx.arc(kick + 52, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core red eye
        ctx.fillStyle = '#ff004c';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // ---- RAPID: Gatling multi-barrel ----
    _drawRapid(ctx, t) {
        ctx.save();
        ctx.rotate(this.angle);
        const kick = -this.recoil * 0.3;
        // Spin rate faster if firing
        const spin = t * 5;

        // Main housing
        const housing = ctx.createRadialGradient(-5, -3, 2, 0, 0, 16);
        housing.addColorStop(0, '#3a2800');
        housing.addColorStop(1, '#1a1200');
        ctx.fillStyle = housing;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-4, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating barrel cluster
        ctx.save();
        ctx.translate(kick + 10, 0);
        ctx.rotate(spin);
        const numBarrels = 6;
        for (let i = 0; i < numBarrels; i++) {
            const ba = (i / numBarrels) * Math.PI * 2;
            const bx = Math.cos(ba) * 6;
            const by = Math.sin(ba) * 6;
            ctx.fillStyle = i % 2 === 0 ? '#555' : '#333';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 0.8;
            ctx.fillRect(bx - 2, by - 2, 18, 4);
            ctx.strokeRect(bx - 2, by - 2, 18, 4);
        }
        // Center axle
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Heat vents
        ctx.fillStyle = '#ffaa00';
        ctx.globalAlpha = 0.5;
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(-15, i * 4 - 1, 8, 2);
        }
        ctx.globalAlpha = 1;

        // Muzzle flash glow
        const flashAlpha = 0.3 + 0.3 * Math.sin(t * 15);
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#ffdd00';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffaa00';
        ctx.beginPath();
        ctx.arc(kick + 27, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Core
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(-4, 0, 5, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    // ---- TESLA: Electric coil tower ----
    _drawTesla(ctx, t) {
        ctx.save();
        // No rotation for Tesla
        const pulse = 0.5 + 0.5 * Math.sin(t * 4 + this._animTime);

        // Coil base plate
        ctx.fillStyle = '#001a2e';
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotating arms
        ctx.save();
        ctx.rotate(t * 0.8);
        for (let i = 0; i < 3; i++) {
            ctx.rotate((Math.PI * 2) / 3);
            // Arm
            ctx.fillStyle = '#003344';
            ctx.strokeStyle = '#00eaff';
            ctx.lineWidth = 1;
            ctx.fillRect(7, -3, 10, 6);
            ctx.strokeRect(7, -3, 10, 6);
            // Node sphere
            ctx.fillStyle = `rgba(0,234,255,${0.5 + 0.5 * pulse})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00eaff';
            ctx.beginPath();
            ctx.arc(19, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();

        // Counter-rotating inner disc
        ctx.save();
        ctx.rotate(-t * 1.5);
        ctx.strokeStyle = `rgba(0,234,255,${0.3 + 0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Central electrode
        const elecGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 8);
        elecGrad.addColorStop(0, '#ffffff');
        elecGrad.addColorStop(0.5, '#00eaff');
        elecGrad.addColorStop(1, 'rgba(0,234,255,0)');
        ctx.fillStyle = elecGrad;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = '#00eaff';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Outer energy ring
        ctx.strokeStyle = `rgba(0,234,255,${0.6 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10 + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // ---- PLASMA: Heavy plasma cannon ----
    _drawPlasma(ctx, t) {
        ctx.save();
        ctx.rotate(this.angle);
        const kick = -this.recoil * 0.6;
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);

        // Massive body (wider than others)
        ctx.fillStyle = '#180028';
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Side heat sinks
        ctx.fillStyle = '#2a0040';
        ctx.strokeStyle = '#8800cc';
        ctx.lineWidth = 1;
        for (const side of [-1, 1]) {
            ctx.fillRect(kick - 18, side * 10, 14, 6);
            ctx.strokeRect(kick - 18, side * 10, 14, 6);
        }

        // Top / bottom fins (stabilizer)
        ctx.fillStyle = '#220036';
        ctx.strokeStyle = '#cc44ff';
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(kick + 2, side * 12);
            ctx.lineTo(kick + 20, side * 18);
            ctx.lineTo(kick + 34, side * 14);
            ctx.lineTo(kick + 34, side * 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Main barrel — thick
        ctx.fillStyle = '#100020';
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(kick - 14, -11);
        ctx.lineTo(kick + 36, -8);
        ctx.lineTo(kick + 36, 8);
        ctx.lineTo(kick - 14, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Energy chamber (glowing orb)
        const chamberGrad = ctx.createRadialGradient(kick + 4, 0, 1, kick + 4, 0, 12);
        chamberGrad.addColorStop(0, `rgba(255,180,255,${0.8 + 0.2 * pulse})`);
        chamberGrad.addColorStop(0.4, `rgba(200,0,255,${0.6 + 0.2 * pulse})`);
        chamberGrad.addColorStop(1, 'rgba(100,0,120,0)');
        ctx.fillStyle = chamberGrad;
        ctx.shadowBlur = 20 * pulse;
        ctx.shadowColor = '#cc44ff';
        ctx.beginPath();
        ctx.arc(kick + 4, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Barrel grooves
        ctx.strokeStyle = `rgba(200,100,255,${0.4 + 0.2 * pulse})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const gx = kick + 14 + i * 7;
            ctx.beginPath(); ctx.moveTo(gx, -8); ctx.lineTo(gx, 8); ctx.stroke();
        }

        // Muzzle emitter ring
        ctx.strokeStyle = '#cc44ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18 * pulse;
        ctx.shadowColor = '#cc44ff';
        ctx.beginPath();
        ctx.arc(kick + 35, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(200,100,255,${0.5 + 0.4 * pulse})`;
        ctx.beginPath();
        ctx.arc(kick + 35, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Core gem
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, '#cc44ff');
        coreGrad.addColorStop(1, '#440066');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff88ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    // ---- Lightning helper ----
    _drawLightning(ctx) {
        if (!this.lightningTarget || this.lightningTarget.dead) return;
        const targetX = (this.lightningTarget.x - this.x);
        const targetY = (this.lightningTarget.y - this.y);
        const dist = Math.sqrt(targetX * targetX + targetY * targetY);
        const steps = Math.max(4, dist / 15);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Outer glow bolt
        ctx.strokeStyle = 'rgba(0,234,255,0.3)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i <= steps; i++) {
            const tt = i / steps;
            const noise = (Math.random() - 0.5) * 24;
            ctx.lineTo(targetX * tt + noise, targetY * tt + noise);
        }
        ctx.stroke();

        // Core bright bolt
        ctx.strokeStyle = '#00eaff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        for (let i = 0; i <= steps; i++) {
            const tt = i / steps;
            const noise = (Math.random() - 0.5) * 12;
            ctx.lineTo(targetX * tt + noise, targetY * tt + noise);
        }
        ctx.stroke();

        ctx.restore();
    }
}
