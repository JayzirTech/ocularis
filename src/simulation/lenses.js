/**
 * Representación visual y refracción matemática de lentes correctoras:
 * - Lente divergente (cóncava) para Miopía
 * - Lente convergente (convexa) para Hipermetropía
 * - Lente tórica / cilíndrica para Astigmatismo
 */

export class CorrectiveLens {
  constructor(type = 'divergent') {
    this.type = type; // 'divergent' | 'convergent' | 'toric'
    this.active = false;
    this.opacity = 0; // Para animación suave de aparición (fade in/out)
    this.power = 1.0; // Factor de corrección (0 = sin corrección, 1 = corrección total)
    this.targetSeverity = 0.5; // Gravedad objetivo (0.0 = leve/normal, 1.0 = severo)
    this.currentSeverity = 0.5; // Gravedad interpolada para animación fluida de grosor
  }

  /**
   * Configura la gravedad de la condición para variar el grosor del lente mediante animación fluida.
   * @param {number} severity 0.0 (mínimo) a 1.0 (máximo)
   */
  setSeverity(severity) {
    this.targetSeverity = Math.max(0, Math.min(1, severity));
    this.power = 0.6 + this.targetSeverity * 0.9;
  }

  /**
   * Actualiza la animación de transición de visibilidad y grosor de la lente.
   * @param {number} dt 
   */
  update(dt) {
    const targetOpacity = this.active ? 1.0 : 0.0;
    this.opacity += (targetOpacity - this.opacity) * Math.min(1, dt * 6);

    // Animación fluida e interpolada (lerp) del grosor del lente en tiempo real
    this.currentSeverity += (this.targetSeverity - this.currentSeverity) * Math.min(1, dt * 10);
  }

  /**
   * Dibuja la lente correctora frente a la córnea animando dinámicamente su grosor y curvatura.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Posición X de la montura/lente
   * @param {number} y Posición Y del centro óptico
   * @param {number} scale Factor de escala del ojo
   */
  draw(ctx, x, y, scale) {
    if (this.opacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const s = scale;
    const h = 114 * s;
    const sev = this.currentSeverity;

    let edgeWTop = 14 * s;
    let edgeWBottom = 14 * s;
    let centerW = 8 * s;
    let cpXLeft = x;
    let cpXRight = x;

    if (this.type === 'divergent') {
      // En lente divergente (cóncava para miopía):
      // Bordes superior e inferior notablemente gruesos y centro óptico delgado pero con separación segura (sin cruces ni colisiones)
      const edgeW = (14 + sev * 24) * s;
      centerW = Math.max(6 * s, (9.5 - sev * 3.5) * s);
      edgeWTop = edgeW;
      edgeWBottom = edgeW;

      // Puntos de control cuadráticos para que las curvas pasen con precisión por los vértices del centro
      cpXLeft = 2 * (x - centerW / 2) - (x - edgeW / 2);
      cpXRight = 2 * (x + centerW / 2) - (x + edgeW / 2);
    } else if (this.type === 'convergent') {
      // En lente convergente (convexa para hipermetropía):
      // A mayor gravedad, el CENTRO es visiblemente más grueso y abombado, y los bordes son delgados.
      const edgeW = Math.max(4.5 * s, (8.5 - sev * 4) * s);
      centerW = (12 + sev * 26) * s;
      edgeWTop = edgeW;
      edgeWBottom = edgeW;

      cpXLeft = 2 * (x - centerW / 2) - (x - edgeW / 2);
      cpXRight = 2 * (x + centerW / 2) - (x + edgeW / 2);
    } else if (this.type === 'progressive') {
      // En lente progresiva (multifocal para presbicia):
      // Zona superior neutra para lejos (delgada) y zona inferior convexa con adición de lectura abombada
      edgeWTop = Math.max(5 * s, (8 - sev * 2) * s);
      edgeWBottom = Math.max(6 * s, (9 + sev * 3) * s);
      centerW = (10 + sev * 18) * s;

      cpXLeft = 2 * (x - centerW / 2) - (x - (edgeWTop + edgeWBottom) / 2);
      cpXRight = 2 * (x + centerW / 2) - (x + (edgeWTop + edgeWBottom) / 2);
    } else {
      // En lente tórica / cilíndrica (astigmatismo):
      // Perfil asimétrico con bisel cilíndrico más grueso a mayor asimetría meridional.
      edgeWTop = (13 + sev * 22) * s;
      edgeWBottom = (10 + sev * 15) * s;
      centerW = (7 + sev * 5) * s;

      const avgEdge = (edgeWTop + edgeWBottom) / 2;
      cpXLeft = 2 * (x - centerW / 2) - (x - avgEdge / 2);
      cpXRight = 2 * (x + centerW / 2) - (x + avgEdge / 2);
    }

    // 1. Trazado del contorno exterior de la lente
    ctx.beginPath();
    // Vértice superior izquierdo
    ctx.moveTo(x - edgeWTop / 2, y - h / 2);
    // Borde anterior curvado hacia el centro
    ctx.quadraticCurveTo(cpXLeft, y, x - edgeWBottom / 2, y + h / 2);
    // Base inferior plana / pulida
    ctx.lineTo(x + edgeWBottom / 2, y + h / 2);
    // Borde posterior curvado hacia el centro
    ctx.quadraticCurveTo(cpXRight, y, x + edgeWTop / 2, y - h / 2);
    ctx.closePath();

    // Relleno de vidrio óptico translúcido con reflejos antireflejantes (AR coating)
    const maxEdge = Math.max(edgeWTop, edgeWBottom, centerW);
    const lensGrad = ctx.createLinearGradient(x - maxEdge, y - h / 2, x + maxEdge, y + h / 2);
    if (this.type === 'convergent') {
      lensGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
      lensGrad.addColorStop(0.3, 'rgba(192, 132, 252, 0.25)');
      lensGrad.addColorStop(0.7, 'rgba(0, 242, 254, 0.2)');
      lensGrad.addColorStop(1, 'rgba(16, 185, 129, 0.35)');
    } else if (this.type === 'progressive') {
      lensGrad.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
      lensGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.25)');
      lensGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.35)');
      lensGrad.addColorStop(1, 'rgba(52, 211, 153, 0.45)');
    } else if (this.type === 'toric') {
      lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      lensGrad.addColorStop(0.3, 'rgba(14, 165, 233, 0.25)');
      lensGrad.addColorStop(0.7, 'rgba(0, 242, 254, 0.2)');
      lensGrad.addColorStop(1, 'rgba(52, 211, 153, 0.35)');
    } else {
      lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      lensGrad.addColorStop(0.4, 'rgba(0, 242, 254, 0.15)');
      lensGrad.addColorStop(0.8, 'rgba(14, 116, 144, 0.25)');
      lensGrad.addColorStop(1, 'rgba(16, 185, 129, 0.35)');
    }
    ctx.fillStyle = lensGrad;
    ctx.fill();

    // 2. Montura exterior y perfil con brillo fotónico
    ctx.lineWidth = Math.max(1.8 * s, 2 * s);
    const strokeColor = this.type === 'convergent' ? '#a855f7' : (this.type === 'progressive' ? '#10b981' : (this.type === 'toric' ? '#38bdf8' : '#00f2fe'));
    const shadowGlow = this.type === 'convergent' ? '#c084fc' : (this.type === 'progressive' ? '#34d399' : '#00f2fe');
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = shadowGlow;
    ctx.shadowBlur = 8 * s;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Facetas pulidas en los bordes gruesos y reflejo especular suave
    ctx.save();
    if (this.type === 'divergent') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(x - edgeWTop / 2 + 1 * s, y - h / 2);
      ctx.lineTo(x + edgeWTop / 2 - 1 * s, y - h / 2);
      ctx.moveTo(x - edgeWBottom / 2 + 1 * s, y + h / 2);
      ctx.lineTo(x + edgeWBottom / 2 - 1 * s, y + h / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - edgeWTop * 0.36, y - h * 0.44);
      ctx.quadraticCurveTo(x - centerW * 0.4, y - h * 0.28, x - centerW * 0.4, y - h * 0.14);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
    } else if (this.type === 'progressive') {
      // Líneas de pasillo progresivo y micrograbado óptico característico
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      // Marcador de pasillo de adición inferior
      ctx.arc(x - centerW * 0.25, y + h * 0.22, 3 * s, 0, Math.PI * 2);
      ctx.arc(x + centerW * 0.25, y + h * 0.22, 3 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Reflejo suave en la zona de lectura inferior
      ctx.beginPath();
      ctx.moveTo(x - centerW * 0.35, y - h * 0.3);
      ctx.quadraticCurveTo(x - centerW * 0.45, y + h * 0.1, x - centerW * 0.3, y + h * 0.35);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - centerW * 0.35, y - h * 0.42);
      ctx.quadraticCurveTo(x - centerW * 0.45, y - h * 0.25, x - centerW * 0.45, y - h * 0.12);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2 * s;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Etiqueta identificadora limpia de la lente
    ctx.shadowBlur = 0;
    ctx.fillStyle = strokeColor;
    ctx.font = `600 ${Math.max(11, 12 * s)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    let label = 'Lente Divergente (—)';
    if (this.type === 'convergent') {
      label = 'Lente Convergente (+)';
    } else if (this.type === 'progressive') {
      label = 'Lente Progresiva (Multifocal)';
    } else if (this.type === 'toric') {
      label = 'Lente Cilíndrica / Tórica';
    }
    ctx.fillText(label, x, y - h / 2 - 14 * s);

    ctx.restore();
  }

  /**
   * Modifica el ángulo o desviación de un rayo antes de tocar la córnea
   * @param {number} rayY Posición Y relativa al centro del ojo
   * @param {number} scale
   * @returns {number} Ángulo de desviación en radianes
   */
  getDeflectionAngle(rayY, scale) {
    if (!this.active || this.opacity <= 0.05) return 0;

    const normalizedY = rayY / (100 * scale);
    const effPower = this.power * this.opacity;

    if (this.type === 'divergent') {
      return normalizedY * 0.12 * effPower;
    } else if (this.type === 'convergent') {
      return -normalizedY * 0.13 * effPower;
    } else if (this.type === 'progressive') {
      // Refracción progresiva: adición convergente suave en la zona de lectura y centro
      return -normalizedY * 0.14 * effPower;
    } else {
      return normalizedY * 0.08 * effPower;
    }
  }
}
