/**
 * Modelo geométrico y óptico simplificado del ojo humano para refracción 2D pedagógica.
 */

export class EyeGeometry {
  constructor() {
    // Parámetros base anatómicos
    this.centerX = 0;
    this.centerY = 0;
    this.scale = 1;

    // Dimensiones en px relativos
    this.corneaRadius = 80;
    this.corneaThickness = 12;
    this.lensRadiusX = 22;
    this.lensRadiusY = 65;
    this.axialLength = 340; // Distancia desde vértice corneal a fóvea
    this.eyeRadiusY = 130;  // Radio vertical del globo ocular
    
    // Parámetros refractivos
    this.axialElongation = 0; // px adicionales para simular miopía (0 = emétrope)
    this.corneaPowerFactor = 1.0;
    this.lensPowerFactor = 1.0;
    this.astigmatismMeridianOffset = 0; // diferencia de potencia entre meridianos
  }

  /**
   * Actualiza las dimensiones y centro del ojo según el tamaño del viewport.
   * @param {number} width 
   * @param {number} height 
   */
  updateLayout(width, height) {
    this.scale = Math.min(width / 1360, height / 820);
    this.scale = Math.max(0.65, Math.min(this.scale, 1.15));

    // Centrado hacia la derecha para garantizar separación total con la tarjeta explicativa izquierda
    this.centerX = Math.max(width * 0.58, 470 * this.scale);
    this.centerY = height * 0.49;
  }

  /**
   * Posición del vértice anterior de la córnea
   */
  get corneaApex() {
    return {
      x: this.centerX - 140 * this.scale,
      y: this.centerY
    };
  }

  /**
   * Centro del cristalino
   */
  get lensCenter() {
    return {
      x: this.centerX - 60 * this.scale,
      y: this.centerY
    };
  }

  /**
   * Posición de la fóvea / retina central
   */
  get retinaApex() {
    const totalLength = (this.axialLength + this.axialElongation) * this.scale;
    return {
      x: this.corneaApex.x + totalLength,
      y: this.centerY
    };
  }

  /**
   * Dibuja el corte sagital completo del ojo con gradientes y estilo médico premium
   * @param {CanvasRenderingContext2D} ctx 
   * @param {object} options
   */
  drawSagittal(ctx, options = {}) {
    const s = this.scale;
    const cApex = this.corneaApex;
    const lCenter = this.lensCenter;
    const rApex = this.retinaApex;
    const eyeR_Y = this.eyeRadiusY * s;

    ctx.save();

    // 1. Esclera & Pared posterior (Globo ocular)
    ctx.beginPath();
    ctx.moveTo(cApex.x + 30 * s, this.centerY - eyeR_Y * 0.85);
    ctx.bezierCurveTo(
      cApex.x + 120 * s, this.centerY - eyeR_Y * 1.05,
      rApex.x - 40 * s, this.centerY - eyeR_Y * 1.05,
      rApex.x, this.centerY
    );
    ctx.bezierCurveTo(
      rApex.x - 40 * s, this.centerY + eyeR_Y * 1.05,
      cApex.x + 120 * s, this.centerY + eyeR_Y * 1.05,
      cApex.x + 30 * s, this.centerY + eyeR_Y * 0.85
    );

    // Relleno de humor vítreo con gradiente bioluminiscente sutil
    const vitreousGrad = ctx.createRadialGradient(
      this.centerX + 20 * s, this.centerY, 20 * s,
      this.centerX + 40 * s, this.centerY, eyeR_Y * 1.2
    );
    vitreousGrad.addColorStop(0, 'rgba(8, 26, 52, 0.45)');
    vitreousGrad.addColorStop(0.8, 'rgba(4, 14, 28, 0.7)');
    vitreousGrad.addColorStop(1, 'rgba(2, 8, 18, 0.95)');
    ctx.fillStyle = vitreousGrad;
    ctx.fill();

    // Trazo de esclera exterior
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.stroke();

    // 2. Capa de Retina (Borde sensor posterior con glow ambar/esmeralda)
    ctx.beginPath();
    ctx.arc(rApex.x - 120 * s, this.centerY, 125 * s, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = options.retinaColor || 'rgba(245, 158, 11, 0.6)';
    ctx.shadowColor = options.retinaGlow || 'rgba(245, 158, 11, 0.4)';
    ctx.shadowBlur = 12 * s;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Marcador Fóvea
    ctx.beginPath();
    ctx.arc(rApex.x, this.centerY, 4 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#00f2fe';
    ctx.fill();

    // 3. Córnea (Cúpula transparente anterior)
    ctx.beginPath();
    ctx.arc(cApex.x + 70 * s, this.centerY, 85 * s, Math.PI * 0.72, Math.PI * 1.28);
    ctx.lineWidth = 7 * s;
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.7)';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10 * s;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Iris (Apertura pupilar superior e inferior)
    const pupilHalf = 32 * s;
    ctx.lineWidth = 5 * s;
    ctx.strokeStyle = '#0284c7';
    // Iris superior
    ctx.beginPath();
    ctx.moveTo(lCenter.x - 12 * s, this.centerY - eyeR_Y * 0.75);
    ctx.lineTo(lCenter.x - 6 * s, this.centerY - pupilHalf);
    ctx.stroke();
    // Iris inferior
    ctx.beginPath();
    ctx.moveTo(lCenter.x - 12 * s, this.centerY + eyeR_Y * 0.75);
    ctx.lineTo(lCenter.x - 6 * s, this.centerY + pupilHalf);
    ctx.stroke();

    // 5. Cristalino (Lente biconvexa interna)
    ctx.beginPath();
    ctx.ellipse(
      lCenter.x,
      lCenter.y,
      this.lensRadiusX * s,
      this.lensRadiusY * s,
      0, 0, Math.PI * 2
    );
    const lensGrad = ctx.createRadialGradient(
      lCenter.x, lCenter.y, 4 * s,
      lCenter.x, lCenter.y, this.lensRadiusY * s
    );
    lensGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    lensGrad.addColorStop(0.8, 'rgba(14, 116, 144, 0.35)');
    lensGrad.addColorStop(1, 'rgba(8, 47, 73, 0.5)');
    ctx.fillStyle = lensGrad;
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.stroke();

    ctx.restore();
  }
}
