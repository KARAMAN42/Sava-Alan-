class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0; // Master Volume (Can stay 1.0, sub-gains control levels)
        this.masterGain.connect(this.ctx.destination);

        // Sub-Gains
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 0.3; // Default Music Volume
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5; // Default SFX Volume
        this.sfxGain.connect(this.masterGain);

        this.bgmOscillators = [];
        this.isBGMPlaying = false;
        this.tempo = 0.2; // Seconds per 16th note (approx 120 BPM 8th notes)
        this.noteIndex = 0;
        this.nextNoteTime = 0;
        this.timerID = null;
    }

    setMusicVolume(val) {
        this.resume();
        this.bgmGain.gain.value = val;
    }

    setSFXVolume(val) {
        this.resume();
        this.sfxGain.gain.value = val;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(value) {
        this.resume();
        this.masterGain.gain.value = value;
    }

    // --- BGM System (Procedural Synthwave) ---
    startBGM() {
        this.resume();
        if (this.isBGMPlaying) return;
        this.isBGMPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    stopBGM() {
        this.isBGMPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isBGMPlaying) return;

        // Safety: Prevent infinite loop if timing goes wrong
        let iterations = 0;
        while (this.nextNoteTime < this.ctx.currentTime + 0.1 && iterations < 100) {
            this.playPattern(this.nextNoteTime);
            this.nextNoteTime += this.tempo;
            iterations++;
        }

        if (iterations >= 100) {
            console.warn("Audio scheduler capped! Syncing manually.");
            this.nextNoteTime = this.ctx.currentTime + 0.1;
        }

        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    playPattern(time) {
        // C Minor Pentatonicish Bass: C2, Eb2, F2, G2
        const bassNotes = [65.41, 65.41, 77.78, 65.41, 87.31, 77.78, 98.00, 77.78];
        // Simple kick/snare beat
        const beat = this.noteIndex % 8;

        // Bass
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.type = 'sawtooth';
        osc.frequency.value = bassNotes[beat];

        // Low pass filter for bass
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        // Envelope
        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.2);

        // Kick (Client requirement: "Cyberpunk/Neon feel")
        if (beat % 4 === 0) {
            this.playKick(time);
        }
        // Snare
        if (beat % 4 === 2) {
            this.playSnare(time);
        }
        // Hi-hat
        this.playHiHat(time);

        this.noteIndex++;
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // White noise buffer for snare
        const bufferSize = this.ctx.sampleRate * 0.1; // 0.1s
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        noise.connect(gain);
        gain.connect(this.bgmGain);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.start(time);
    }

    playHiHat(time) {
        // High frequency noise or short metallic tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 8000;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    // --- SFX ---

    lastPlayedTimes = {}; // Throttling map

    playShoot(type) {
        // Throttling: Prevent same sound overlapping within 50ms
        const now = Date.now();
        if (this.lastPlayedTimes[type] && now - this.lastPlayedTimes[type] < 50) {
            return;
        }
        this.lastPlayedTimes[type] = now;

        // this.resume(); // Optimization: Don't call resume every shot
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        if (type === 'sniper') {
            // High pitch laser
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        } else if (type === 'rapid') {
            // Short blip
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, t);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        } else if (type === 'plasma') {
            // Sci-fi wobble
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.linearRampToValueAtTime(400, t + 0.1);
            osc.frequency.linearRampToValueAtTime(100, t + 0.3);
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        } else if (type === 'tesla') {
            // Buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(1000, t + 0.05);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
        } else {
            // Standard pew
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        }
    }

    playHit() {
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }

    playExplosion() {
        if (!this.ctx) return;
        const now = Date.now();
        if (now - (this.lastPlayedTimes['explosion'] || 0) < 100) return; // Throttle 100ms
        this.lastPlayedTimes['explosion'] = now;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        // Low rumble
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.4);

        // Lowpass filter for "muffled" explosion sound
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.3);

        osc.disconnect();
        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    playBuild() {
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.linearRampToValueAtTime(880, t + 0.1);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);

        osc.start(t);
        osc.stop(t + 0.1);
    }
}

const audio = new SoundManager();
