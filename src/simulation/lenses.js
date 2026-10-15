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
  }

  /**
   * Actualiza la animación de transición de la lente.
   * @param {number} dt 
   */
  update(dt) {
    const targetOpacity = this.active ? 1.0 : 0.0;
    this.opacity += (targetOpacity - this.opacity) * Math.min(1, dt * 6);
  }

  /**
   * Dibuja la lente correctora frente a la córnea.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x Posición X de la montura/lente
   * @param {number} y Posición Y del centro óptico
   * @param {number} scale Factor de escala del ojo
   */
  draw(ctx, x, y, scale) {
    if (this.opacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const h = 110 * scale;
    const w = 18 * scale;
    // Divergente: bordes más anchos que el centro (cóncava, curve negativa)
    // Convergente: centro más ancho que los bordes (convexa, curve positiva hacia afuera en ambos bordes)
    // Tórica: perfil cilíndrico asimétrico
    const curve = this.type === 'divergent' 
      ? -10 * scale 
      : (this.type === 'convergent' ? 10 * scale : 6 * scale);

    // Perfil de la lente
    ctx.beginPath();
    // Borde izquierdo
    ctx.moveTo(x - w / 2, y - h / 2);
    ctx.quadraticCurveTo(x - w / 2 - curve, y, x - w / 2, y + h / 2);
    // Base inferior
    ctx.lineTo(x + w / 2, y + h / 2);
    // Borde derecho
    ctx.quadraticCurveTo(x + w / 2 + curve, y, x + w / 2, y - h / 2);
    ctx.closePath();

    // Relleno de vidrio óptico translúcido con reflejos
    const lensGrad = ctx.createLinearGradient(x - w, y - h / 2, x + w, y + h / 2);
    if (this.type === 'convergent') {
      lensGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
      lensGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.2)');
      lensGrad.addColorStop(1, 'rgba(16, 185, 129, 0.35)');
    } else {
      lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      lensGrad.addColorStop(0.5, 'rgba(0, 242, 254, 0.2)');
      lensGrad.addColorStop(1, 'rgba(16, 185, 129, 0.35)');
    }
    ctx.fillStyle = lensGrad;
    ctx.fill();

    // Bisel / Montura delgada
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = this.type === 'convergent' ? '#a855f7' : '#38bdf8';
    ctx.shadowColor = this.type === 'convergent' ? '#c084fc' : '#00f2fe';
    ctx.shadowBlur = 10 * scale;
    ctx.stroke();

    // Etiqueta flotante de la lente
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.type === 'convergent' ? '#c084fc' : '#00f2fe';
    ctx.font = `600 ${Math.max(11, 12 * scale)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    const label = this.type === 'divergent' 
      ? 'Lente Divergente (—)' 
      : (this.type === 'convergent'
        ? 'Lente Convergente (+)'
        : 'Lente Cilíndrica / Tórica');
    ctx.fillText(label, x, y - h / 2 - 14 * scale);

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
      // Abre los rayos hacia afuera (desviación proporcional a la altura respecto al eje)
      return normalizedY * 0.12 * effPower;
    } else if (this.type === 'convergent') {
      // Cierra los rayos hacia adentro (convergencia positiva hacia el eje óptico)
      return -normalizedY * 0.13 * effPower;
    } else {
      // Lente tórica: compensa asimetría meridional
      return normalizedY * 0.08 * effPower;
    }
  }
}
