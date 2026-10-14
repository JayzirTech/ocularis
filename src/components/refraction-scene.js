import { EyeGeometry } from '../simulation/eye-model.js';
import { CorrectiveLens } from '../simulation/lenses.js';
import { stateMachine, States } from '../core/state-machine.js';

/**
 * Escena de refracción óptica y trazado de rayos interactivo.
 * Soporta modo Miopía (elongación axial + lente divergente) y
 * Astigmatismo (asimetría meridional + lente cilíndrica/tórica).
 */
export class RefractionScene {
  /**
   * @param {'myopia'|'astigmatism'} mode 
   */
  constructor(mode = 'myopia') {
    this.mode = mode; // 'myopia' | 'astigmatism'
    this.geometry = new EyeGeometry();
    this.lens = new CorrectiveLens(mode === 'myopia' ? 'divergent' : 'toric');
    this.time = 0;

    // Parámetros específicos
    if (mode === 'myopia') {
      this.geometry.axialElongation = 55; // Ojo elongado por defecto
    } else {
      this.geometry.axialElongation = 0;
      this.astigmatismAngle = 90; // Eje a 90 grados
      this.meridianDifference = 35; // Diferencia focal en px
    }
  }

  onEnter(width, height) {
    this.geometry.updateLayout(width, height);
    this.setupUI();
  }

  onExit() {
    const dockEl = document.getElementById('refraction-dock');
    if (dockEl) {
      dockEl.style.display = 'none';
      dockEl.innerHTML = '';
    }
  }

  onResize(width, height) {
    this.geometry.updateLayout(width, height);
  }

  setupUI() {
    const kickerEl = document.getElementById('card-kicker');
    const titleEl = document.getElementById('card-title');
    const descEl = document.getElementById('card-desc');
    const controlsEl = document.getElementById('card-controls');
    const dockEl = document.getElementById('refraction-dock');

    // 1. Cuadro de conceptos lateral: limpio, solo texto explicativo sin botoneras
    if (controlsEl) {
      controlsEl.innerHTML = '';
    }

    if (this.mode === 'myopia') {
      if (kickerEl) kickerEl.textContent = 'MÓDULO: MIOPÍA';
      if (titleEl) titleEl.textContent = 'Elongación Axial y Enfoque Pre-Retiniano';
      if (descEl) {
        descEl.textContent = 'En la miopía, el globo ocular es más largo de lo normal (o la córnea es excesivamente curva). Los haces luminosos convergen en un punto focal antes de alcanzar la retina, provocando que la imagen llegue dispersa y borrosa.';
      }

      // 2. Controles interactivos ubicados DEBAJO del ojo con botón al ejemplo
      if (dockEl) {
        dockEl.style.display = 'flex';
        dockEl.innerHTML = `
          <div class="refraction-controls-card">
            <div class="refraction-controls-grid">
              <!-- Slider de Elongación Axial -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Longitud Axial del Globo Ocular:</span>
                  <span class="dock-control-val" id="dock-val-param">${this.geometry.axialElongation > 15 ? 'Elongado (Miope)' : 'Normal (Emétrope)'}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="0" max="80" value="${this.geometry.axialElongation}">
              </div>

              <!-- Selector de Lente Divergente -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Corrección con Lente Divergente:</span>
                </div>
                <div class="toggle-btn-group">
                  <button class="toggle-pill-btn ${!this.lens.active ? 'active' : ''}" id="dock-btn-no-lens">
                    Sin Lente (Miopía)
                  </button>
                  <button class="toggle-pill-btn ${this.lens.active ? 'active' : ''}" id="dock-btn-with-lens">
                    Con Lente Divergente (—)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Botón directo al Ejemplo de Percepción ubicado debajo con buena distancia -->
          <div class="dock-action-separator">
            <button class="btn-goto-simulation" id="btn-goto-simulation" type="button" title="Ver cómo percibe el mundo el paciente en la vida real">
              <span class="btn-sim-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Ver Ejemplo de Visión en la Vida Real</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </button>
          </div>
        `;

        const slider = dockEl.querySelector('#dock-slider');
        const valText = dockEl.querySelector('#dock-val-param');
        const btnNoLens = dockEl.querySelector('#dock-btn-no-lens');
        const btnWithLens = dockEl.querySelector('#dock-btn-with-lens');
        const btnGotoSim = dockEl.querySelector('#btn-goto-simulation');

        slider?.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.geometry.axialElongation = val;
          if (valText) {
            valText.textContent = val < 15 ? 'Normal (Emétrope)' : (val > 45 ? 'Alta Miopía' : 'Miopía Moderada');
          }
        });

        btnNoLens?.addEventListener('click', () => {
          this.lens.active = false;
          btnNoLens.classList.add('active');
          btnWithLens.classList.remove('active');
        });

        btnWithLens?.addEventListener('click', () => {
          this.lens.active = true;
          btnWithLens.classList.add('active');
          btnNoLens.classList.remove('active');
        });

        btnGotoSim?.addEventListener('click', () => {
          stateMachine.jumpTo(States.MYOPIA_PERCEPTION);
        });
      }
    } else {
      // Modo Astigmatismo
      if (kickerEl) kickerEl.textContent = 'MÓDULO: ASTIGMATISMO';
      if (titleEl) titleEl.textContent = 'Asimetría Corneal y Múltiples Focos';
      if (descEl) {
        descEl.textContent = 'La córnea presenta una curvatura asimétrica (curvaturas distintas en meridianos perpendiculares). Los rayos verticales y horizontales convergen a diferentes profundidades, generando sombras dobles y distorsión.';
      }

      // 2. Controles interactivos ubicados DEBAJO del ojo con botón al ejemplo
      if (dockEl) {
        dockEl.style.display = 'flex';
        dockEl.innerHTML = `
          <div class="refraction-controls-card">
            <div class="refraction-controls-grid">
              <!-- Slider de Asimetría -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Asimetría entre Meridianos:</span>
                  <span class="dock-control-val" id="dock-val-param">${this.meridianDifference > 30 ? 'Pronunciada' : 'Moderada'}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="10" max="60" value="${this.meridianDifference}">
              </div>

              <!-- Selector de Lente Cilíndrica -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Corrección con Lente Cilíndrica:</span>
                </div>
                <div class="toggle-btn-group">
                  <button class="toggle-pill-btn ${!this.lens.active ? 'active' : ''}" id="dock-btn-no-lens">
                    Sin Corrección
                  </button>
                  <button class="toggle-pill-btn ${this.lens.active ? 'active' : ''}" id="dock-btn-with-lens">
                    Con Lente Cilíndrica
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Botón directo al Ejemplo de Percepción ubicado debajo con buena distancia -->
          <div class="dock-action-separator">
            <button class="btn-goto-simulation" id="btn-goto-simulation" type="button" title="Ver cómo percibe el mundo el paciente en la vida real">
              <span class="btn-sim-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Ver Ejemplo de Visión en la Vida Real</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </button>
          </div>
        `;

        const slider = dockEl.querySelector('#dock-slider');
        const valText = dockEl.querySelector('#dock-val-param');
        const btnNoLens = dockEl.querySelector('#dock-btn-no-lens');
        const btnWithLens = dockEl.querySelector('#dock-btn-with-lens');
        const btnGotoSim = dockEl.querySelector('#btn-goto-simulation');

        slider?.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.meridianDifference = val;
          if (valText) {
            valText.textContent = val > 30 ? 'Pronunciada' : 'Moderada';
          }
        });

        btnNoLens?.addEventListener('click', () => {
          this.lens.active = false;
          btnNoLens.classList.add('active');
          btnWithLens.classList.remove('active');
        });

        btnWithLens?.addEventListener('click', () => {
          this.lens.active = true;
          btnWithLens.classList.add('active');
          btnNoLens.classList.remove('active');
        });

        btnGotoSim?.addEventListener('click', () => {
          stateMachine.jumpTo(States.ASTIGMATISM_PERCEPTION);
        });
      }
    }
  }


  update(dt) {
    this.time += dt;
    this.lens.update(dt);
  }

  draw(ctx, width, height) {
    const s = this.geometry.scale;
    const cApex = this.geometry.corneaApex;
    const lCenter = this.geometry.lensCenter;
    const rApex = this.geometry.retinaApex;
    const isCorrected = this.lens.active && this.lens.opacity > 0.8;

    // 1. Dibuja el corte anatómico sagital
    this.geometry.drawSagittal(ctx, {
      retinaColor: isCorrected ? '#10b981' : (this.mode === 'myopia' && this.geometry.axialElongation > 15 ? '#f59e0b' : '#ec4899'),
      retinaGlow: isCorrected ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.4)'
    });

    // 2. Dibuja la lente correctora frente a la córnea
    const lensX = cApex.x - 70 * s;
    this.lens.draw(ctx, lensX, this.geometry.centerY, s);

    // 3. Trazado de rayos fotónicos
    ctx.save();

    if (this.mode === 'myopia') {
      this.drawMyopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    } else {
      this.drawAstigmatismRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    }

    ctx.restore();
  }

  drawMyopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected) {
    const rayOffsets = [-50, -32, -15, 0, 15, 32, 50];
    const sourceX = cApex.x - 260 * s;

    // Cálculo del punto focal
    // Si la lente no está activa, converge antes de la retina (enfoque prematuro)
    const emmetropeRetinaX = cApex.x + this.geometry.axialLength * s;
    const actualRetinaX = rApex.x;
    
    // Punto focal en px: sin lente converge en emmetropeRetinaX (o antes), con lente viaja hasta actualRetinaX
    const myopicFocalX = emmetropeRetinaX - 10 * s;
    const effectiveFocalX = myopicFocalX + (actualRetinaX - myopicFocalX) * this.lens.opacity;

    // Colores y glow según corrección
    const rayColor = isCorrected ? 'rgba(16, 185, 129, 0.85)' : 'rgba(0, 242, 254, 0.85)';
    const glowColor = isCorrected ? '#10b981' : '#00f2fe';

    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = rayColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8 * s;

    for (const offset of rayOffsets) {
      const startY = this.geometry.centerY + offset * s;

      ctx.beginPath();
      ctx.moveTo(sourceX, startY);

      // Si pasa por la lente divergente
      let entryY = startY;
      if (this.lens.opacity > 0.05) {
        ctx.lineTo(lensX, startY);
        // Desviación divergente hacia afuera
        const deflection = this.lens.getDeflectionAngle(offset * s, s);
        entryY = startY + deflection * 70 * s;
      }

      // Incidencia en la córnea
      const corneaHitX = cApex.x + 8 * s;
      ctx.lineTo(corneaHitX, entryY);

      // Paso a través de la cámara anterior hacia el cristalino
      const lensHitX = lCenter.x;
      const lensHitY = entryY * 0.8 + this.geometry.centerY * 0.2;
      ctx.lineTo(lensHitX, lensHitY);

      // Convergencia hacia el punto focal F
      ctx.lineTo(effectiveFocalX, this.geometry.centerY);

      // Si el punto focal está antes de la retina, los rayos continúan cruzándose y divergen sobre la retina!
      if (effectiveFocalX < actualRetinaX) {
        const beyondDist = actualRetinaX - effectiveFocalX;
        const slope = (this.geometry.centerY - lensHitY) / (effectiveFocalX - lensHitX);
        const blurHitY = this.geometry.centerY - slope * beyondDist;
        ctx.lineTo(actualRetinaX, blurHitY);
      }

      ctx.stroke();
    }

    // Dibujo del punto focal
    ctx.beginPath();
    ctx.arc(effectiveFocalX, this.geometry.centerY, 6 * s, 0, Math.PI * 2);
    ctx.fillStyle = isCorrected ? '#10b981' : '#f59e0b';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15 * s;
    ctx.fill();

    // Etiqueta del punto focal
    ctx.shadowBlur = 0;
    ctx.fillStyle = ctx.fillStyle;
    ctx.font = `700 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    const tag = isCorrected ? 'Foco Nítido en Retina' : 'Foco Previo a Retina (Desenfoque)';
    ctx.fillText(tag, effectiveFocalX, this.geometry.centerY - 20 * s);
  }

  drawAstigmatismRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected) {
    const sourceX = cApex.x - 260 * s;
    const actualRetinaX = rApex.x;

    // Astigmatismo: Dos planos focales F1 y F2
    const diff = this.meridianDifference * s * (1 - this.lens.opacity);
    const focal1X = actualRetinaX - diff;
    const focal2X = actualRetinaX + diff * 0.5;

    // Rayos del meridiano vertical (Cian / Láser)
    const vertOffsets = [-45, -20, 20, 45];
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = isCorrected ? 'rgba(16, 185, 129, 0.85)' : 'rgba(0, 242, 254, 0.85)';
    ctx.shadowColor = isCorrected ? '#10b981' : '#00f2fe';
    ctx.shadowBlur = 8 * s;

    for (const offset of vertOffsets) {
      const startY = this.geometry.centerY + offset * s;
      ctx.beginPath();
      ctx.moveTo(sourceX, startY);
      if (this.lens.opacity > 0.05) {
        ctx.lineTo(lensX, startY);
      }
      ctx.lineTo(cApex.x + 8 * s, startY);
      ctx.lineTo(lCenter.x, startY * 0.8 + this.geometry.centerY * 0.2);
      ctx.lineTo(focal1X, this.geometry.centerY);
      if (focal1X < actualRetinaX) {
        const beyond = actualRetinaX - focal1X;
        ctx.lineTo(actualRetinaX, this.geometry.centerY + offset * 0.15 * beyond);
      }
      ctx.stroke();
    }

    // Rayos del meridiano horizontal (Magenta / Rosa óptico)
    const horizOffsets = [-30, 30];
    ctx.strokeStyle = isCorrected ? 'rgba(16, 185, 129, 0.7)' : 'rgba(236, 72, 153, 0.85)';
    ctx.shadowColor = isCorrected ? '#10b981' : '#ec4899';

    for (const offset of horizOffsets) {
      const startY = this.geometry.centerY + offset * s;
      ctx.beginPath();
      ctx.moveTo(sourceX, startY);
      if (this.lens.opacity > 0.05) {
        ctx.lineTo(lensX, startY);
      }
      ctx.lineTo(cApex.x + 8 * s, startY);
      ctx.lineTo(lCenter.x, startY * 0.7 + this.geometry.centerY * 0.3);
      ctx.lineTo(focal2X, this.geometry.centerY);
      ctx.stroke();
    }

    // Marcadores de Foco F1 y F2
    ctx.fillStyle = isCorrected ? '#10b981' : '#ec4899';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12 * s;
    ctx.beginPath();
    ctx.arc(focal1X, this.geometry.centerY, 5 * s, 0, Math.PI * 2);
    ctx.fill();

    if (!isCorrected) {
      ctx.beginPath();
      ctx.arc(focal2X, this.geometry.centerY, 5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.font = `600 ${10 * s}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Foco 1 (Meridiano Vertical)', focal1X, this.geometry.centerY - 16 * s);
      ctx.fillText('Foco 2 (Meridiano Horizontal)', focal2X, this.geometry.centerY + 22 * s);
    } else {
      ctx.shadowBlur = 0;
      ctx.font = `700 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Focos Unificados en Fóvea', focal1X, this.geometry.centerY - 18 * s);
    }
  }
}
