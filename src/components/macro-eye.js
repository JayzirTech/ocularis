import { stateMachine, States } from '../core/state-machine.js';

/**
 * Escena del Macro-Ojo frontal (Etapa 1: Bienvenida e Impacto Visual).
 * Presenta un ojo hiperestilizado cinematográfico con iris biofotónico,
 * pupila reactiva con respiración sutil y botón discreto encima del ojo.
 */
export class MacroEyeScene {
  constructor() {
    this.time = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.pupilRadius = 38;
    this.targetPupilRadius = 38;
    this.irisColor1 = '#00f2fe';
    this.irisColor2 = '#0284c7';
    this.hotspotEl = null;
  }

  onEnter(width, height) {
    this.hotspotEl = document.getElementById('eye-macro-hotspot');
    if (this.hotspotEl) {
      this.hotspotEl.style.display = 'block';
      // Forzar reflow para que la animación de entrada funcione
      void this.hotspotEl.offsetWidth;
      this.hotspotEl.classList.remove('hidden');
    }

    this.mouse.x = width * 0.5;
    this.mouse.y = height * 0.5;
    this.mouse.targetX = this.mouse.x;
    this.mouse.targetY = this.mouse.y;
  }

  onExit() {
    if (this.hotspotEl) {
      this.hotspotEl.classList.add('hidden');
      setTimeout(() => {
        if (this.hotspotEl?.classList.contains('hidden')) {
          this.hotspotEl.style.display = 'none';
        }
      }, 450);
    }
  }

  onResize(width, height) {
    // Reajuste de coordenadas
  }

  onMouseMove(x, y) {
    this.mouse.targetX = x;
    this.mouse.targetY = y;
  }

  onMouseDown(x, y) {
    // Al tocar o hacer clic sobre la zona del iris, entra automáticamente a la anatomía
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < 130) {
      stateMachine.next();
    }
  }

  update(dt) {
    this.time += dt;

    // Inercia suave del puntero para efecto parallax
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * Math.min(1, dt * 5);
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * Math.min(1, dt * 5);

    // Respiración fisiológica sutil de la pupila
    const breathing = Math.sin(this.time * 1.5) * 2.5;
    this.pupilRadius = this.targetPupilRadius + breathing;
  }

  draw(ctx, width, height) {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const scale = Math.min(width / 1280, height / 800);
    const s = Math.max(0.75, Math.min(scale, 1.2));

    // Desplazamiento parallax de la mirada
    const lookOffsetX = ((this.mouse.x - cx) / width) * 26 * s;
    const lookOffsetY = ((this.mouse.y - cy) / height) * 20 * s;

    ctx.save();

    // 1. Halo atmosférico posterior del ojo
    const haloGrad = ctx.createRadialGradient(cx, cy, 60 * s, cx, cy, 320 * s);
    haloGrad.addColorStop(0, 'rgba(0, 242, 254, 0.18)');
    haloGrad.addColorStop(0.4, 'rgba(2, 132, 199, 0.08)');
    haloGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(cx - 350 * s, cy - 350 * s, 700 * s, 700 * s);

    // 2. Esclera elíptica estilizada (Apertura palpebral / Forma de ojo)
    const eyeWidth = 340 * s;
    const eyeHeight = 160 * s;

    ctx.beginPath();
    ctx.moveTo(cx - eyeWidth, cy);
    ctx.bezierCurveTo(
      cx - eyeWidth * 0.45, cy - eyeHeight * 1.25,
      cx + eyeWidth * 0.45, cy - eyeHeight * 1.25,
      cx + eyeWidth, cy
    );
    ctx.bezierCurveTo(
      cx + eyeWidth * 0.45, cy + eyeHeight * 1.25,
      cx - eyeWidth * 0.45, cy + eyeHeight * 1.25,
      cx - eyeWidth, cy
    );
    ctx.closePath();

    // Relleno de esclera con profundidad
    const scleraGrad = ctx.createRadialGradient(
      cx, cy, 30 * s,
      cx, cy, eyeWidth
    );
    scleraGrad.addColorStop(0, '#0d1f3d');
    scleraGrad.addColorStop(0.65, '#071224');
    scleraGrad.addColorStop(1, '#020611');
    ctx.fillStyle = scleraGrad;
    ctx.fill();

    // Borde de la apertura palpebral con glow fino
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 12 * s;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Recortar dibujo al interior de los párpados
    ctx.clip();

    // 3. Iris (Círculo biométrico bioluminiscente con fibras)
    const irisX = cx + lookOffsetX;
    const irisY = cy + lookOffsetY;
    const irisRadius = 100 * s;

    // Fondo del iris
    const irisGrad = ctx.createRadialGradient(
      irisX, irisY, this.pupilRadius * s,
      irisX, irisY, irisRadius
    );
    irisGrad.addColorStop(0, '#0284c7');
    irisGrad.addColorStop(0.45, '#0369a1');
    irisGrad.addColorStop(0.85, '#00f2fe');
    irisGrad.addColorStop(1, '#07172f');

    ctx.beginPath();
    ctx.arc(irisX, irisY, irisRadius, 0, Math.PI * 2);
    ctx.fillStyle = irisGrad;
    ctx.fill();

    // Fibras estromales radiales del iris (detalles microscópicos)
    const fibersCount = 64;
    ctx.save();
    ctx.translate(irisX, irisY);
    for (let i = 0; i < fibersCount; i++) {
      const angle = (i / fibersCount) * Math.PI * 2;
      const lengthVar = Math.sin(i * 1.7 + this.time * 0.5) * 8 * s;
      const startR = (this.pupilRadius + 4) * s;
      const endR = (irisRadius - 6 + lengthVar) * s;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR);
      ctx.lineTo(Math.cos(angle) * endR, Math.sin(angle) * endR);
      ctx.lineWidth = (i % 2 === 0 ? 1.4 : 0.8) * s;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(0, 242, 254, 0.45)' : 'rgba(56, 189, 248, 0.2)';
      ctx.stroke();
    }
    ctx.restore();

    // Anillo exterior de la córnea/limbo
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
    ctx.stroke();

    // 4. Pupila negra profunda con gradiente
    ctx.beginPath();
    ctx.arc(irisX, irisY, this.pupilRadius * s, 0, Math.PI * 2);
    ctx.fillStyle = '#010309';
    ctx.fill();

    // 5. Destellos y reflejos especulares de luz (Corneal light reflection)
    const refl1X = irisX - irisRadius * 0.35;
    const refl1Y = irisY - irisRadius * 0.35;
    ctx.beginPath();
    ctx.ellipse(refl1X, refl1Y, 14 * s, 9 * s, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8 * s;
    ctx.fill();

    const refl2X = irisX + irisRadius * 0.28;
    const refl2Y = irisY + irisRadius * 0.28;
    ctx.beginPath();
    ctx.arc(refl2X, refl2Y, 5 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
