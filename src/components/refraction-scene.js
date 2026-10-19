import { EyeGeometry } from '../simulation/eye-model.js';
import { CorrectiveLens } from '../simulation/lenses.js';
import { stateMachine, States } from '../core/state-machine.js';

/**
 * Escena de refracción óptica y trazado de rayos interactivo.
 * Soporta modo Miopía (elongación axial + lente divergente),
 * Hipermetropía (acortamiento axial + lente convergente) y
 * Astigmatismo (asimetría meridional + lente cilíndrica/tórica).
 */
export class RefractionScene {
  /**
   * @param {'myopia'|'hyperopia'|'astigmatism'|'presbyopia'} mode 
   */
  constructor(mode = 'myopia') {
    this.mode = mode; // 'myopia' | 'hyperopia' | 'astigmatism' | 'presbyopia'
    this.geometry = new EyeGeometry();
    const lensType = mode === 'myopia' ? 'divergent' : (mode === 'hyperopia' ? 'convergent' : (mode === 'presbyopia' ? 'progressive' : 'toric'));
    this.lens = new CorrectiveLens(lensType);
    this.time = 0;

    // Parámetros específicos
    if (mode === 'myopia') {
      this.geometry.axialElongation = 55; // Ojo elongado por defecto
    } else if (mode === 'hyperopia') {
      this.geometry.axialElongation = -45; // Ojo acortado en hipermetropía
    } else if (mode === 'presbyopia') {
      this.geometry.axialElongation = 0; // Ojo emétrope base en reposo
      this.presbyopiaDistance = 'near'; // 'near' (lectura a 40 cm) | 'far' (infinito)
      this.addition = 2.0; // Adición en dioptrías (+1.00 D a +3.00 D)
      this.patientAge = 52; // Años aproximados
    } else {
      this.geometry.axialElongation = 0;
      this.astigmatismAngle = 90; // Eje a 90 grados
      this.meridianDifference = 35; // Diferencia focal en px
    }

    this.updateLensParams();
  }

  /**
   * Sincroniza la severidad y grosor del lente con el estado actual
   */
  updateLensParams() {
    if (this.mode === 'myopia') {
      const sev = Math.max(0, Math.min(1, this.geometry.axialElongation / 80));
      this.lens.setSeverity(sev);
      return this.geometry.axialElongation < 15 ? 'Normal (Emétrope)' : (this.geometry.axialElongation > 45 ? 'Alta Miopía' : 'Miopía Moderada');
    } else if (this.mode === 'hyperopia') {
      const sev = Math.max(0, Math.min(1, Math.abs(this.geometry.axialElongation) / 70));
      this.lens.setSeverity(sev);
      return this.geometry.axialElongation < -35 ? 'Alta Hipermetropía' : (this.geometry.axialElongation < -10 ? 'Hipermetropía Moderada' : 'Normal (Emétrope)');
    } else if (this.mode === 'presbyopia') {
      const sev = Math.max(0, Math.min(1, (this.addition - 1.0) / 2.0));
      this.lens.setSeverity(sev);
      return `Adición +${this.addition.toFixed(2)} D (~${this.patientAge} años)`;
    } else {
      const sev = Math.max(0, Math.min(1, (this.meridianDifference - 10) / 50));
      this.lens.setSeverity(sev);
      return this.meridianDifference > 30 ? 'Pronunciada' : 'Moderada';
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
                  <span>Gravedad de la Condición:</span>
                  <span class="dock-control-val" id="dock-val-param">${this.updateLensParams()}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="0" max="80" value="${this.geometry.axialElongation}">
                <div class="dock-control-footer">
                  <span>Longitud axial del globo ocular</span>
                </div>
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

        const updateMyopiaUI = () => {
          const label = this.updateLensParams();
          if (valText) valText.textContent = label;
        };
        updateMyopiaUI();

        slider?.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.geometry.axialElongation = val;
          updateMyopiaUI();
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
    } else if (this.mode === 'hyperopia') {
      // Modo Hipermetropía
      if (kickerEl) kickerEl.textContent = 'MÓDULO: HIPERMETROPÍA';
      if (titleEl) titleEl.textContent = 'Acortamiento Axial y Enfoque Post-Retiniano';
      if (descEl) {
        descEl.textContent = 'En la hipermetropía, el globo ocular es más corto de lo normal (o la córnea/cristalino tienen menor potencia refractiva). Los haces luminosos convergen en un punto focal virtual detrás de la retina, impidiendo enfocar nítidamente en distancias cortas y causando fatiga visual.';
      }

      if (dockEl) {
        dockEl.style.display = 'flex';
        dockEl.innerHTML = `
          <div class="refraction-controls-card">
            <div class="refraction-controls-grid">
              <!-- Slider de Acortamiento Axial -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Gravedad de la Condición:</span>
                  <span class="dock-control-val" id="dock-val-param">${this.updateLensParams()}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="-70" max="0" value="${this.geometry.axialElongation}">
                <div class="dock-control-footer">
                  <span>Longitud axial del globo ocular</span>
                </div>
              </div>

              <!-- Selector de Lente Convergente -->
              <div class="dock-control-item">
                <div class="dock-control-header">
                  <span>Corrección con Lente Convergente:</span>
                </div>
                <div class="toggle-btn-group">
                  <button class="toggle-pill-btn ${!this.lens.active ? 'active' : ''}" id="dock-btn-no-lens">
                    Sin Lente (Hipermetropía)
                  </button>
                  <button class="toggle-pill-btn ${this.lens.active ? 'active' : ''}" id="dock-btn-with-lens">
                    Con Lente Convergente (+)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Botón directo al Ejemplo de Percepción -->
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

        const updateHyperopiaUI = () => {
          const label = this.updateLensParams();
          if (valText) valText.textContent = label;
        };
        updateHyperopiaUI();

        slider?.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.geometry.axialElongation = val;
          updateHyperopiaUI();
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
          stateMachine.jumpTo(States.HYPEROPIA_PERCEPTION);
        });
      }
    } else if (this.mode === 'astigmatism') {
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
                  <span>Gravedad de la Condición:</span>
                  <span class="dock-control-val" id="dock-val-param">${this.updateLensParams()}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="10" max="60" value="${this.meridianDifference}">
                <div class="dock-control-footer">
                  <span>Asimetría entre meridianos (curvatura corneal)</span>
                </div>
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

        const updateAstigUI = () => {
          const label = this.updateLensParams();
          if (valText) valText.textContent = label;
        };
        updateAstigUI();

        slider?.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          this.meridianDifference = val;
          updateAstigUI();
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
    } else if (this.mode === 'presbyopia') {
      // Modo Presbicia (Vista Cansada)
      if (kickerEl) kickerEl.textContent = 'MÓDULO: PRESBICIA (VISTA CANSADA)';
      if (titleEl) titleEl.textContent = 'Pérdida de Acomodación del Cristalino';
      if (descEl) {
        descEl.textContent = 'Con la edad (a partir de los 40-45 años), el cristalino pierde flexibilidad y el músculo ciliar no logra abombarlo para enfocar a corta distancia. En reposo (visión lejana), el ojo enfoca bien, pero en lectura (rayos divergentes), el foco se forma virtualmente detrás de la retina.';
      }

      if (dockEl) {
        dockEl.style.display = 'flex';
        dockEl.innerHTML = `
          <div class="refraction-controls-card presbyopia-controls-card">
            <div class="presbyopia-controls-container">
              <!-- Fila 1: Botones de Distancia y Lente uno al lado del otro -->
              <div class="presbyopia-actions-row">
                <!-- Selector de Distancia del Objeto -->
                <div class="dock-control-item">
                  <div class="dock-control-header">
                    <span>Distancia de Enfoque:</span>
                  </div>
                  <div class="toggle-btn-group toggle-btn-group-tight">
                    <button class="toggle-pill-btn ${this.presbyopiaDistance === 'near' ? 'active' : ''}" id="dock-btn-dist-near">
                      📖 Cerca (40 cm)
                    </button>
                    <button class="toggle-pill-btn ${this.presbyopiaDistance === 'far' ? 'active' : ''}" id="dock-btn-dist-far">
                      ⛰️ Lejos (Infinito)
                    </button>
                  </div>
                </div>

                <!-- Selector de Lente Progresiva -->
                <div class="dock-control-item">
                  <div class="dock-control-header">
                    <span>Corrección Óptica:</span>
                  </div>
                  <div class="toggle-btn-group toggle-btn-group-tight">
                    <button class="toggle-pill-btn ${!this.lens.active ? 'active' : ''}" id="dock-btn-no-lens">
                      Sin Lente
                    </button>
                    <button class="toggle-pill-btn ${this.lens.active ? 'active' : ''}" id="dock-btn-with-lens">
                      Con Lente Progresiva (+)
                    </button>
                  </div>
                </div>
              </div>

              <!-- Fila 2: Slider de Adición a lo ancho del cuadro -->
              <div class="dock-control-item presbyopia-fullwidth-item">
                <div class="dock-control-header">
                  <span>Adición de Lectura (Presbicia):</span>
                  <span class="dock-control-val" id="dock-val-param">${this.updateLensParams()}</span>
                </div>
                <input type="range" class="range-slider" id="dock-slider" min="1.0" max="3.0" step="0.25" value="${this.addition}">
              </div>
            </div>
          </div>

          <!-- Botón directo al Ejemplo de Percepción -->
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
        const btnDistNear = dockEl.querySelector('#dock-btn-dist-near');
        const btnDistFar = dockEl.querySelector('#dock-btn-dist-far');
        const distDesc = dockEl.querySelector('#dock-dist-desc');
        const btnGotoSim = dockEl.querySelector('#btn-goto-simulation');

        const updatePresbyUI = () => {
          const label = this.updateLensParams();
          if (valText) valText.textContent = label;
        };
        updatePresbyUI();

        slider?.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.addition = val;
          this.patientAge = Math.round(38 + val * 7.5);
          updatePresbyUI();
        });

        btnDistNear?.addEventListener('click', () => {
          this.presbyopiaDistance = 'near';
          btnDistNear.classList.add('active');
          btnDistFar?.classList.remove('active');
          if (distDesc) distDesc.textContent = 'Rayos divergentes de lectura cercana (40 cm)';
        });

        btnDistFar?.addEventListener('click', () => {
          this.presbyopiaDistance = 'far';
          btnDistFar.classList.add('active');
          btnDistNear?.classList.remove('active');
          if (distDesc) distDesc.textContent = 'Rayos paralelos de objeto en el infinito';
        });

        btnNoLens?.addEventListener('click', () => {
          this.lens.active = false;
          btnNoLens.classList.add('active');
          btnWithLens?.classList.remove('active');
        });

        btnWithLens?.addEventListener('click', () => {
          this.lens.active = true;
          btnWithLens.classList.add('active');
          btnNoLens?.classList.remove('active');
        });

        btnGotoSim?.addEventListener('click', () => {
          stateMachine.jumpTo(States.PRESBIOPIA_PERCEPTION);
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
    let uncorrectedColor = '#ec4899';
    let uncorrectedGlow = 'rgba(236, 72, 153, 0.4)';
    if (this.mode === 'myopia') {
      uncorrectedColor = '#f59e0b';
      uncorrectedGlow = 'rgba(245, 158, 11, 0.4)';
    } else if (this.mode === 'hyperopia') {
      uncorrectedColor = '#a855f7';
      uncorrectedGlow = 'rgba(168, 85, 247, 0.45)';
    } else if (this.mode === 'presbyopia') {
      uncorrectedColor = '#06b6d4';
      uncorrectedGlow = 'rgba(6, 182, 212, 0.45)';
    }

    this.geometry.drawSagittal(ctx, {
      retinaColor: isCorrected ? '#10b981' : uncorrectedColor,
      retinaGlow: isCorrected ? 'rgba(16, 185, 129, 0.5)' : uncorrectedGlow
    });

    // 2. Dibuja la lente correctora frente a la córnea
    const lensX = cApex.x - 70 * s;
    this.lens.draw(ctx, lensX, this.geometry.centerY, s);

    // 3. Trazado de rayos fotónicos
    ctx.save();

    if (this.mode === 'myopia') {
      this.drawMyopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    } else if (this.mode === 'hyperopia') {
      this.drawHyperopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    } else if (this.mode === 'presbyopia') {
      this.drawPresbyopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    } else {
      this.drawAstigmatismRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected);
    }

    ctx.restore();
  }

  drawHyperopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected) {
    const rayOffsets = [-50, -32, -15, 0, 15, 32, 50];
    const sourceX = cApex.x - 260 * s;

    // Cálculo del punto focal:
    // En hipermetropía el ojo es más corto de lo normal.
    // Los rayos convergen en un plano focal virtual DETRÁS de la retina.
    // Con la lente convergente (+), la luz converge antes, llevando el foco directamente a la retina.
    const actualRetinaX = rApex.x;
    const hyperopicOffset = Math.max(35, Math.abs(this.geometry.axialElongation) * 1.3) * s;
    const hyperopicFocalX = actualRetinaX + hyperopicOffset;
    const effectiveFocalX = hyperopicFocalX - (hyperopicFocalX - actualRetinaX) * this.lens.opacity;

    // Colores y glow según corrección
    const rayColor = isCorrected ? 'rgba(16, 185, 129, 0.85)' : 'rgba(168, 85, 247, 0.85)';
    const glowColor = isCorrected ? '#10b981' : '#a855f7';

    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = rayColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8 * s;

    for (const offset of rayOffsets) {
      const startY = this.geometry.centerY + offset * s;

      ctx.beginPath();
      ctx.moveTo(sourceX, startY);

      // Si pasa por la lente convergente (+)
      let entryY = startY;
      if (this.lens.opacity > 0.05) {
        ctx.lineTo(lensX, startY);
        // Desviación convergente hacia el eje óptico
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

      // Rayo dentro del humor vítreo hacia la retina física
      // La pendiente del rayo apunta al punto focal effectiveFocalX
      const slope = (this.geometry.centerY - lensHitY) / (effectiveFocalX - lensHitX);
      const retinaHitY = lensHitY + slope * (actualRetinaX - lensHitX);

      ctx.lineTo(actualRetinaX, retinaHitY);
      ctx.stroke();

      // Proyección virtual punteada detrás de la retina cuando el foco es posterior
      if (effectiveFocalX > actualRetinaX + 2 * s) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4 * s, 4 * s]);
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
        ctx.shadowBlur = 0;
        ctx.moveTo(actualRetinaX, retinaHitY);
        ctx.lineTo(effectiveFocalX, this.geometry.centerY);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Dibujo del punto focal
    ctx.beginPath();
    ctx.arc(effectiveFocalX, this.geometry.centerY, 6 * s, 0, Math.PI * 2);
    ctx.fillStyle = isCorrected ? '#10b981' : '#a855f7';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15 * s;
    ctx.fill();

    // Etiqueta del punto focal
    ctx.shadowBlur = 0;
    ctx.fillStyle = ctx.fillStyle;
    ctx.font = `700 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    const tag = isCorrected ? 'Foco Nítido en Retina' : 'Foco Posterior a Retina (Virtual)';
    ctx.fillText(tag, effectiveFocalX, this.geometry.centerY - 20 * s);
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

  drawPresbyopiaRays(ctx, s, cApex, lCenter, rApex, lensX, isCorrected) {
    const actualRetinaX = rApex.x;
    const isNear = this.presbyopiaDistance === 'near';

    if (!isNear) {
      // 1. Visión Lejana: El paciente con presbicia conserva buena visión lejana (ojo emétrope en reposo)
      const rayOffsets = [-48, -30, -14, 0, 14, 30, 48];
      const sourceX = cApex.x - 260 * s;

      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8 * s;

      for (const offset of rayOffsets) {
        const startY = this.geometry.centerY + offset * s;
        ctx.beginPath();
        ctx.moveTo(sourceX, startY);

        if (this.lens.opacity > 0.05) {
          ctx.lineTo(lensX, startY);
        }

        const corneaHitX = cApex.x + 8 * s;
        ctx.lineTo(corneaHitX, startY);

        const lensHitX = lCenter.x;
        const lensHitY = startY * 0.8 + this.geometry.centerY * 0.2;
        ctx.lineTo(lensHitX, lensHitY);
        ctx.lineTo(actualRetinaX, this.geometry.centerY);
        ctx.stroke();
      }

      // Punto focal sobre la retina
      ctx.beginPath();
      ctx.arc(actualRetinaX, this.geometry.centerY, 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15 * s;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.font = `700 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Visión Lejana Conservada (Foco en Retina)', actualRetinaX, this.geometry.centerY - 20 * s);

    } else {
      // 2. Visión Cercana / Lectura (40 cm): Rayos divergentes
      const nearSourceX = cApex.x - 200 * s;
      const nearSourceY = this.geometry.centerY;
      const targetOffsets = [-42, -26, -10, 8, 24, 40];

      // Indicador visual de objeto de lectura
      ctx.save();
      ctx.shadowBlur = 10 * s;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(nearSourceX, nearSourceY, 5 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#38bdf8';
      ctx.font = `600 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('📖 Lectura (40 cm)', nearSourceX, nearSourceY - 14 * s);
      ctx.restore();

      // Cálculo del punto focal en presbicia para cerca:
      // El cristalino rígido no acomoda -> los rayos divergentes convergen DETRÁS de la retina.
      // La adición positiva del lente progresivo reposiciona el foco en la fóvea.
      const uncorrectedFocalX = actualRetinaX + (32 + this.addition * 18) * s;
      const effectiveFocalX = uncorrectedFocalX - (uncorrectedFocalX - actualRetinaX) * this.lens.opacity;

      const rayColor = isCorrected ? 'rgba(16, 185, 129, 0.85)' : 'rgba(6, 182, 212, 0.85)';
      const glowColor = isCorrected ? '#10b981' : '#06b6d4';

      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = rayColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8 * s;

      for (const offset of targetOffsets) {
        const pupilTargetY = this.geometry.centerY + offset * s;

        ctx.beginPath();
        ctx.moveTo(nearSourceX, nearSourceY);

        let entryY = pupilTargetY;
        if (this.lens.opacity > 0.05) {
          ctx.lineTo(lensX, pupilTargetY);
          const deflection = this.lens.getDeflectionAngle(offset * s, s);
          entryY = pupilTargetY + deflection * 65 * s;
        }

        const corneaHitX = cApex.x + 8 * s;
        ctx.lineTo(corneaHitX, entryY);

        const lensHitX = lCenter.x;
        const lensHitY = entryY * 0.8 + this.geometry.centerY * 0.2;
        ctx.lineTo(lensHitX, lensHitY);

        // Rayo dentro del vítreo hacia el foco effectiveFocalX
        const slope = (this.geometry.centerY - lensHitY) / (effectiveFocalX - lensHitX);
        const retinaHitY = lensHitY + slope * (actualRetinaX - lensHitX);

        ctx.lineTo(actualRetinaX, retinaHitY);
        ctx.stroke();

        // Proyección virtual punteada posterior si no está enfocado
        if (effectiveFocalX > actualRetinaX + 2 * s) {
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4 * s, 4 * s]);
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
          ctx.shadowBlur = 0;
          ctx.moveTo(actualRetinaX, retinaHitY);
          ctx.lineTo(effectiveFocalX, this.geometry.centerY);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Marcador del punto focal
      ctx.beginPath();
      ctx.arc(effectiveFocalX, this.geometry.centerY, 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = isCorrected ? '#10b981' : '#06b6d4';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15 * s;
      ctx.fill();

      // Etiqueta del punto focal
      ctx.shadowBlur = 0;
      ctx.fillStyle = ctx.fillStyle;
      ctx.font = `700 ${11 * s}px 'Plus Jakarta Sans', sans-serif`;
      ctx.textAlign = 'center';
      const tag = isCorrected ? 'Foco Nítido con Adición (+)' : 'Foco Posterior (Cristalino Rígido)';
      ctx.fillText(tag, effectiveFocalX, this.geometry.centerY - 20 * s);
    }
  }
}
