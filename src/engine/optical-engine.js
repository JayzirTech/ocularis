/**
 * Motor central de renderizado Canvas 2D a 60 FPS para Ocularis.
 * Gestiona el ciclo de vida de las escenas, partículas de ambiente,
 * transiciones cinematográficas animadas y soporte para pantallas Retina/4K.
 */

export class OpticalEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.activeScene = null;
    this.isPaused = false;
    this.lastTime = 0;
    this.animationFrameId = null;

    // Sistema de transiciones cinemáticas
    this.isTransitioning = false;
    this.transitionType = 'photon-sweep'; // 'zoom-in' | 'zoom-out' | 'photon-sweep' | 'crossfade'
    this.transitionProgress = 0;
    this.transitionDuration = 0.85; // Segundos
    this.fromScene = null;
    this.toScene = null;

    // Partículas de luz ambiente (polvo fotónico en suspensión)
    this.particles = [];
    this.initParticles(45);

    // Bindings
    this._renderLoop = this._renderLoop.bind(this);
    this._handleResize = this._handleResize.bind(this);

    window.addEventListener('resize', this._handleResize);
    this._attachInputListeners();
    this._handleResize();
  }

  /**
   * Inicializa partículas fotónicas bioluminiscentes de fondo
   * @param {number} count 
   */
  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.8 + 0.6,
        speedX: (Math.random() - 0.5) * 0.015,
        speedY: (Math.random() - 0.5) * 0.015,
        opacity: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.4 ? '#00f2fe' : '#38bdf8'
      });
    }
  }

  /**
   * Ajusta el tamaño del canvas teniendo en cuenta el devicePixelRatio
   */
  _handleResize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.activeScene?.onResize) {
      this.activeScene.onResize(this.width, this.height);
    }
    if (this.toScene?.onResize) {
      this.toScene.onResize(this.width, this.height);
    }
  }

  /**
   * Cambio inmediato de escena sin animación (usado solo al inicializar)
   * @param {object} scene 
   */
  setScene(scene) {
    if (this.activeScene?.onExit) {
      this.activeScene.onExit();
    }
    this.activeScene = scene;
    if (this.activeScene?.onEnter) {
      this.activeScene.onEnter(this.width, this.height);
    }
  }

  /**
   * Transición cinemática fluida entre escenas con efectos de cámara
   * @param {object} targetScene Nueva escena hacia la que transicionar
   * @param {'zoom-in'|'zoom-out'|'photon-sweep'|'crossfade'} [type='photon-sweep']
   * @param {number} [duration=0.85] Duración en segundos
   */
  transitionTo(targetScene, type = 'photon-sweep', duration = 0.85) {
    if (!this.activeScene) {
      this.setScene(targetScene);
      return;
    }

    if (this.activeScene === targetScene) {
      // Si ya es la escena activa pero se reactiva (por ej. volviendo de la percepción), asegurar re-inicialización de UI
      targetScene?.onEnter?.(this.width, this.height);
      return;
    }

    // Si ya había una transición en curso, sal de la anterior inmediatamente
    if (this.isTransitioning && this.fromScene) {
      this.fromScene.onExit?.();
    }

    // Salir de la escena actual y limpiar su UI antes de iniciar la nueva
    this.activeScene?.onExit?.();

    this.fromScene = this.activeScene;
    this.toScene = targetScene;
    this.transitionType = type;
    this.transitionDuration = Math.max(0.3, duration);
    this.transitionProgress = 0;
    this.isTransitioning = true;

    // Inicializar la escena entrante
    if (this.toScene?.onEnter) {
      this.toScene.onEnter(this.width, this.height);
    }
  }

  /**
   * Función de suavizado cubic-bezier para movimientos cinemáticos
   */
  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Inicia el render loop
   */
  start() {
    if (!this.animationFrameId) {
      this.lastTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this._renderLoop);
    }
  }

  /**
   * Detiene el render loop
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Alterna la pausa del render loop
   */
  setPaused(paused) {
    this.isPaused = paused;
  }

  /**
   * Bucle principal de animación a 60 FPS
   * @param {number} timestamp 
   */
  _renderLoop(timestamp) {
    const rawDt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    const dt = Math.min(rawDt, 0.1); // clamp delta-time

    // 1. Limpieza de fondo con gradiente nocturno
    this._renderBackground();

    // 2. Partículas fotónicas de fondo
    this._renderParticles(dt);

    // 3. Renderizado de escena normal o con transición
    if (this.isTransitioning && this.fromScene && this.toScene) {
      this._renderTransition(dt);
    } else if (this.activeScene) {
      if (!this.isPaused && this.activeScene.update) {
        this.activeScene.update(dt);
      }
      if (this.activeScene.draw) {
        this.activeScene.draw(this.ctx, this.width, this.height);
      }
    }

    this.animationFrameId = requestAnimationFrame(this._renderLoop);
  }

  /**
   * Renderizado de la transición cinemática entre escenas
   * @param {number} dt 
   */
  _renderTransition(dt) {
    this.transitionProgress += dt / this.transitionDuration;
    const t = Math.min(1, Math.max(0, this.transitionProgress));
    const ease = this._easeInOutCubic(t);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    // Actualizar ambas escenas durante la transición para que no se congelen
    if (!this.isPaused) {
      this.fromScene.update?.(dt);
      this.toScene.update?.(dt);
    }

    if (this.transitionType === 'zoom-in') {
      // Zoom-In cinematográfico: El Macro-Ojo se agranda hacia la pupila y se desvanece
      // mientras el corte anatómico surge expandiéndose desde el centro
      ctx.save();
      ctx.translate(cx, cy);
      const scaleFrom = 1 + ease * 2.8;
      ctx.scale(scaleFrom, scaleFrom);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = Math.max(0, 1 - ease * 1.3);
      this.fromScene.draw(ctx, w, h);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      const scaleTo = 0.72 + ease * 0.28;
      ctx.scale(scaleTo, scaleTo);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = Math.min(1, ease * 1.4);
      this.toScene.draw(ctx, w, h);
      ctx.restore();

      // Anillo de onda expansiva de luz al pasar el portal de la pupila
      this._drawWarpShockwave(ctx, cx, cy, ease, Math.max(w, h));

    } else if (this.transitionType === 'zoom-out') {
      // Zoom-Out cinematográfico: El corte sagital se aleja y el ojo macro emerge envolvente
      ctx.save();
      ctx.translate(cx, cy);
      const scaleFrom = 1 - ease * 0.35;
      ctx.scale(scaleFrom, scaleFrom);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = Math.max(0, 1 - ease * 1.3);
      this.fromScene.draw(ctx, w, h);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      const scaleTo = 2.4 - ease * 1.4;
      ctx.scale(scaleTo, scaleTo);
      ctx.translate(-cx, -cy);
      ctx.globalAlpha = Math.min(1, ease * 1.3);
      this.toScene.draw(ctx, w, h);
      ctx.restore();

    } else {
      // 'photon-sweep' / 'crossfade': Disolución con barrido de rayo láser bioluminiscente
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - ease);
      this.fromScene.draw(ctx, w, h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = Math.min(1, ease);
      this.toScene.draw(ctx, w, h);
      ctx.restore();

      // Barrido de rayo fotónico transversal
      this._drawLaserSweep(ctx, w, h, ease);
    }

    // Finalizar transición cuando se alcanza el 100%
    if (t >= 1) {
      this.activeScene = this.toScene;
      this.fromScene = null;
      this.toScene = null;
      this.isTransitioning = false;
    }
  }

  /**
   * Dibuja un haz láser vertical de luz cian que barre la pantalla
   */
  _drawLaserSweep(ctx, w, h, ease) {
    const sweepX = ease * (w + 240) - 120;
    const beamWidth = 140;

    ctx.save();
    const beamGrad = ctx.createLinearGradient(sweepX - beamWidth, 0, sweepX + beamWidth, 0);
    beamGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
    beamGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.45)');
    beamGrad.addColorStop(1, 'rgba(0, 242, 254, 0)');

    ctx.fillStyle = beamGrad;
    ctx.fillRect(sweepX - beamWidth, 0, beamWidth * 2, h);

    // Línea láser central brillante
    ctx.beginPath();
    ctx.moveTo(sweepX, 0);
    ctx.lineTo(sweepX, h);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja onda de choque bioluminiscente durante el zoom al interior de la pupila
   */
  _drawWarpShockwave(ctx, cx, cy, ease, maxDim) {
    const radius = ease * maxDim * 0.65;
    const alpha = Math.sin(ease * Math.PI) * 0.7;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(10, radius), 0, Math.PI * 2);
    ctx.lineWidth = 4 * (1 - ease * 0.6);
    ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 24;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Dibuja el fondo médico con gradiente radial atmosférico
   */
  _renderBackground() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const bgGrad = ctx.createRadialGradient(
      w * 0.55, h * 0.48, 50,
      w * 0.50, h * 0.50, Math.max(w, h) * 0.75
    );
    bgGrad.addColorStop(0, '#0a172e');
    bgGrad.addColorStop(0.55, '#060e1d');
    bgGrad.addColorStop(1, '#020611');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Actualiza y dibuja partículas fotónicas en suspensión
   * @param {number} dt 
   */
  _renderParticles(dt) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    for (const p of this.particles) {
      if (!this.isPaused) {
        p.x += p.speedX * dt * 60;
        p.y += p.speedY * dt * 60;
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Vincula listeners de interacción táctil y ratón
   */
  _attachInputListeners() {
    const forwardPointer = (method, e) => {
      if (this.isTransitioning) return; // Evitar clicks espurios durante la animación
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.activeScene?.[method]) {
        this.activeScene[method](x, y, e);
      }
    };

    this.canvas.addEventListener('mousemove', (e) => forwardPointer('onMouseMove', e));
    this.canvas.addEventListener('mousedown', (e) => forwardPointer('onMouseDown', e));
    this.canvas.addEventListener('mouseup', (e) => forwardPointer('onMouseUp', e));

    this.canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) forwardPointer('onMouseDown', t);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) forwardPointer('onMouseMove', t);
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      if (t) forwardPointer('onMouseUp', t);
    }, { passive: true });
  }

  /**
   * Destrucción de recursos al desmontar
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
  }
}
