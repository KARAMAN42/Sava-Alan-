class FloatingText {
    constructor(x, y, text, color, size = 20) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.life = 1.0; // Seconds
        this.velocityY = -30; // Float up speed
        this.alpha = 1.0;
    }

    update(deltaTime) {
        this.y += this.velocityY * deltaTime;
        this.life -= deltaTime;
        this.alpha = Math.max(0, this.life); // Fade out
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size}px "Courier New", monospace`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
