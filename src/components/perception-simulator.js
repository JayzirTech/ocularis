import { stateMachine, States } from '../core/state-machine.js';

/**
 * Simulador de percepción visual con comparador Split-Screen interactivo (Antes / Después).
 * Permite al paciente y optometrista arrastrar el divisor para experimentar
 * cómo percibe el mundo un ojo con Miopía o Astigmatismo frente a la visión corregida.
 */
export class PerceptionSimulator {
  /**
   * @param {'myopia'|'hyperopia'|'astigmatism'} mode 
   */
  constructor(mode = 'myopia') {
    this.mode = mode; // 'myopia' | 'hyperopia' | 'astigmatism'
    this.container = null;
    this.divider = null;
    this.wrapper = null;
    this.isDragging = false;
    this.splitPercent = 50;

    this.sharpCanvas = null;
    this.blurredCanvas = null;
    this.blurAmount = 8; // px de desenfoque base
    this.boundExitHandler = null;
  }

  onEnter() {
    // 1. Asegurar que el dock de controles de refracción esté completamente oculto durante el ejemplo
    const dockEl = document.getElementById('refraction-dock');
    if (dockEl) {
      dockEl.style.display = 'none';
      dockEl.innerHTML = '';
    }

    this.container = document.getElementById('perception-layer');
    this.divider = document.getElementById('perception-divider');
    this.wrapper = document.getElementById('perception-blurred-wrapper');
    this.sharpCanvas = document.getElementById('sharp-canvas');
    this.blurredCanvas = document.getElementById('blurred-canvas');

    const blurTag = document.getElementById('perception-blur-tag');
    if (blurTag) {
      if (this.mode === 'myopia') {
        blurTag.textContent = 'Visión con Miopía (Desenfoque Lejano)';
      } else if (this.mode === 'hyperopia') {
        blurTag.textContent = 'Visión con Hipermetropía (Desenfoque de Cerca & Fatiga)';
      } else {
        blurTag.textContent = 'Visión con Astigmatismo (Distorsión & Sombras)';
      }
    }

    // 2. Configurar el botón para salir del ejemplo y volver a la explicación clínica
    const btnExit = document.getElementById('btn-exit-simulation');
    const btnExitText = document.getElementById('btn-exit-simulation-text');
    if (btnExitText) {
      if (this.mode === 'myopia') {
        btnExitText.textContent = 'Volver a la Explicación de Miopía';
      } else if (this.mode === 'hyperopia') {
        btnExitText.textContent = 'Volver a la Explicación de Hipermetropía';
      } else {
        btnExitText.textContent = 'Volver a la Explicación de Astigmatismo';
      }
    }
    if (btnExit) {
      if (this.boundExitHandler) {
        btnExit.removeEventListener('click', this.boundExitHandler);
      }
      this.boundExitHandler = () => {
        if (this.mode === 'myopia') {
          stateMachine.jumpTo(States.MYOPIA);
        } else if (this.mode === 'hyperopia') {
          stateMachine.jumpTo(States.HYPEROPIA);
        } else {
          stateMachine.jumpTo(States.ASTIGMATISM);
        }
      };
      btnExit.addEventListener('click', this.boundExitHandler);
    }

    if (this.container) {
      this.container.classList.add('visible');
    }

    this.setupCardContent();
    this.renderTestScenes();
    this.attachDragListeners();
    this.updateSplit(50);
  }

  onExit() {
    if (this.container) {
      this.container.classList.remove('visible');
    }
    const btnExit = document.getElementById('btn-exit-simulation');
    if (btnExit && this.boundExitHandler) {
      btnExit.removeEventListener('click', this.boundExitHandler);
      this.boundExitHandler = null;
    }
  }

  setupCardContent() {
    const kickerEl = document.getElementById('card-kicker');
    const titleEl = document.getElementById('card-title');
    const descEl = document.getElementById('card-desc');
    const controlsEl = document.getElementById('card-controls');

    if (this.mode === 'myopia') {
      if (kickerEl) kickerEl.textContent = 'SIMULADOR DE PERCEPCIÓN';
      if (titleEl) titleEl.textContent = '¿Cómo ve el mundo un paciente con Miopía?';
      if (descEl) {
        descEl.textContent = 'Los objetos lejanos pierden contraste y se convierten en círculos de confusión borrosos, mientras que los textos a corta distancia permanecen legibles. Arrastra el divisor para comprobar la diferencia.';
      }
      if (controlsEl) {
        controlsEl.innerHTML = `
          <div class="control-row">
            <div class="control-label">
              <span>Intensidad de Graduación Simulada:</span>
              <span class="control-val" id="val-diopter">-3.00 D</span>
            </div>
            <input type="range" class="range-slider" id="slider-diopter" min="1" max="6" value="3" step="0.5">
          </div>
          <div class="toggle-btn-group">
            <button class="toggle-pill-btn active" id="btn-compare-all">Ver Comparativa 50/50</button>
            <button class="toggle-pill-btn" id="btn-view-blur">Solo Visión Paciente</button>
            <button class="toggle-pill-btn" id="btn-view-sharp">Solo Visión Corregida</button>
          </div>
        `;

        const slider = controlsEl.querySelector('#slider-diopter');
        const valText = controlsEl.querySelector('#val-diopter');
        slider?.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.blurAmount = val * 2.8;
          if (valText) valText.textContent = `-${val.toFixed(2)} D`;
          this.renderTestScenes();
        });

        controlsEl.querySelector('#btn-compare-all')?.addEventListener('click', () => this.updateSplit(50));
        controlsEl.querySelector('#btn-view-blur')?.addEventListener('click', () => this.updateSplit(100));
        controlsEl.querySelector('#btn-view-sharp')?.addEventListener('click', () => this.updateSplit(0));
      }
    } else if (this.mode === 'hyperopia') {
      if (kickerEl) kickerEl.textContent = 'SIMULADOR DE PERCEPCIÓN';
      if (titleEl) titleEl.textContent = '¿Cómo ve el mundo un paciente con Hipermetropía?';
      if (descEl) {
        descEl.textContent = 'La visión de lejos suele mantenerse aceptable gracias al esfuerzo acomodativo del cristalino, pero en visión cercana (lectura, pantallas, teléfono) las letras pierden definición y se vuelven borrosas, provocando fatiga ocular y dolor de cabeza.';
      }
      if (controlsEl) {
        controlsEl.innerHTML = `
          <div class="control-row">
            <div class="control-label">
              <span>Potencia Dióptrica (+) Simulada:</span>
              <span class="control-val" id="val-hyper">+3.00 D</span>
            </div>
            <input type="range" class="range-slider" id="slider-hyper" min="1" max="6" value="3" step="0.5">
          </div>
          <div class="toggle-btn-group">
            <button class="toggle-pill-btn active" id="btn-hyper-50">Comparativa 50/50</button>
            <button class="toggle-pill-btn" id="btn-hyper-blur">Solo Hipermetropía</button>
            <button class="toggle-pill-btn" id="btn-hyper-sharp">Solo Corregida</button>
          </div>
        `;

        const slider = controlsEl.querySelector('#slider-hyper');
        const valText = controlsEl.querySelector('#val-hyper');
        slider?.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.blurAmount = val * 2.8;
          if (valText) valText.textContent = `+${val.toFixed(2)} D`;
          this.renderTestScenes();
        });

        controlsEl.querySelector('#btn-hyper-50')?.addEventListener('click', () => this.updateSplit(50));
        controlsEl.querySelector('#btn-hyper-blur')?.addEventListener('click', () => this.updateSplit(100));
        controlsEl.querySelector('#btn-hyper-sharp')?.addEventListener('click', () => this.updateSplit(0));
      }
    } else {
      if (kickerEl) kickerEl.textContent = 'SIMULADOR DE PERCEPCIÓN';
      if (titleEl) titleEl.textContent = '¿Cómo ve el mundo un paciente con Astigmatismo?';
      if (descEl) {
        descEl.textContent = 'El desenfoque no es esférico sino asimétrico y direccional. Se aprecian sombras dobles ("efecto fantasma") tanto de lejos como de cerca y destellos elongados en las luces.';
      }
      if (controlsEl) {
        controlsEl.innerHTML = `
          <div class="control-row">
            <div class="control-label">
              <span>Cilindro Dióptrico Simulado:</span>
              <span class="control-val" id="val-cyl">-2.50 Cyl</span>
            </div>
            <input type="range" class="range-slider" id="slider-cyl" min="1" max="5" value="2.5" step="0.5">
          </div>
          <div class="toggle-btn-group">
            <button class="toggle-pill-btn active" id="btn-astig-50">Comparativa 50/50</button>
            <button class="toggle-pill-btn" id="btn-astig-blur">Solo Astigmatismo</button>
            <button class="toggle-pill-btn" id="btn-astig-sharp">Solo Corregida</button>
          </div>
        `;

        const slider = controlsEl.querySelector('#slider-cyl');
        const valText = controlsEl.querySelector('#val-cyl');
        slider?.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          this.blurAmount = val * 2.6;
          if (valText) valText.textContent = `-${val.toFixed(2)} Cyl`;
          this.renderTestScenes();
        });

        controlsEl.querySelector('#btn-astig-50')?.addEventListener('click', () => this.updateSplit(50));
        controlsEl.querySelector('#btn-astig-blur')?.addEventListener('click', () => this.updateSplit(100));
        controlsEl.querySelector('#btn-astig-sharp')?.addEventListener('click', () => this.updateSplit(0));
      }
    }
  }

  /**
   * Renderiza el lienzo de prueba clínico: Tabla de optotipos Snellen
   * y farolas nocturnas de alto contraste para demostrar halos y bokeh
   */
  renderTestScenes() {
    if (!this.sharpCanvas || !this.blurredCanvas) return;

    const w = this.sharpCanvas.width;
    const h = this.sharpCanvas.height;
    const ctxSharp = this.sharpCanvas.getContext('2d');
    const ctxBlur = this.blurredCanvas.getContext('2d');

    // 1. Dibuja la escena nítida perfecta
    this.drawClinicalScene(ctxSharp, w, h, false);

    // 2. Dibuja la escena con desenfoque / distorsión
    this.drawClinicalScene(ctxBlur, w, h, true);
  }

  drawClinicalScene(ctx, w, h, isBlurred) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Fondo de gabinete clínico nocturno
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#040914');
    bgGrad.addColorStop(0.5, '#071224');
    bgGrad.addColorStop(1, '#02050e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Configuración de desenfoque diferencial según condición clínica
    // A) Optotipo Snellen retroiluminado a la izquierda (Visión Cercana de Gabinete / Lectura)
    ctx.save();
    if (!isBlurred) {
      ctx.filter = 'none';
    } else if (this.mode === 'myopia') {
      ctx.filter = `blur(${this.blurAmount}px)`;
    } else if (this.mode === 'hyperopia') {
      // En hipermetropía la visión de cerca es la más perjudicada
      ctx.filter = `blur(${this.blurAmount * 1.55}px)`;
    } else {
      ctx.filter = `blur(${this.blurAmount * 0.7}px)`;
    }

    const chartX = 140;
    const chartY = 60;
    const chartW = 320;
    const chartH = 400;

    // Caja de optotipo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(chartX, chartY, chartW, chartH);
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.mode === 'hyperopia' && isBlurred ? '#a855f7' : '#0284c7';
    ctx.strokeRect(chartX, chartY, chartW, chartH);

    // Letras Snellen nítidas
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 74px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('E', chartX + chartW / 2, chartY + 95);

    ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('F  P', chartX + chartW / 2, chartY + 165);

    ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('T  O  Z', chartX + chartW / 2, chartY + 225);

    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('L  P  E  D', chartX + chartW / 2, chartY + 280);

    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('P  E  C  F  D', chartX + chartW / 2, chartY + 330);

    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('E  D  F  C  Z  P', chartX + chartW / 2, chartY + 370);

    ctx.restore();

    // B) Paisaje urbano nocturno a la derecha (Visión Lejana / Semáforos y Luces)
    ctx.save();
    if (!isBlurred) {
      ctx.filter = 'none';
    } else if (this.mode === 'myopia') {
      ctx.filter = `blur(${this.blurAmount}px)`;
    } else if (this.mode === 'hyperopia') {
      // En hipermetropía la visión lejana se mantiene mucho más clara
      const farBlur = Math.max(0, (this.blurAmount - 6) * 0.25);
      ctx.filter = farBlur > 0 ? `blur(${farBlur}px)` : 'none';
    } else {
      ctx.filter = `blur(${this.blurAmount * 0.7}px)`;
    }

    const sceneX = 520;
    const sceneY = 60;
    const sceneW = 340;
    const sceneH = 400;

    // Ventana exterior
    ctx.fillStyle = '#050b14';
    ctx.fillRect(sceneX, sceneY, sceneW, sceneH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sceneX, sceneY, sceneW, sceneH);

    // Luces de tráfico lejanas (Bokeh circles)
    const lights = [
      { x: sceneX + 60, y: sceneY + 140, r: 16, color: '#ef4444' }, // Semáforo Rojo
      { x: sceneX + 60, y: sceneY + 200, r: 16, color: '#f59e0b' }, // Semáforo Ámbar
      { x: sceneX + 60, y: sceneY + 260, r: 16, color: '#10b981' }, // Semáforo Verde
      { x: sceneX + 160, y: sceneY + 220, r: 24, color: '#00f2fe' }, // Luz de coche xenon
      { x: sceneX + 260, y: sceneY + 220, r: 24, color: '#38bdf8' },
      { x: sceneX + 210, y: sceneY + 110, r: 12, color: '#fbbf24' }  // Farola lejana
    ];

    lights.forEach(l => {
      ctx.beginPath();
      let radius = l.r;
      if (isBlurred) {
        if (this.mode === 'myopia') {
          radius = l.r * (1 + this.blurAmount * 0.45);
        } else if (this.mode === 'hyperopia') {
          radius = l.r * (1 + this.blurAmount * 0.08);
        }
      }
      ctx.arc(l.x, l.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = l.color;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = isBlurred ? (this.mode === 'hyperopia' ? 12 : 25) : 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();

    // En astigmatismo: dibuja sombra fantasma superpuesta
    if (isBlurred && this.mode === 'astigmatism') {
      ctx.filter = `blur(${this.blurAmount * 0.4}px)`;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      const ghostOffset = this.blurAmount * 1.5;
      ctx.fillText('E', chartX + chartW / 2 + ghostOffset, chartY + 95 + ghostOffset);
      ctx.fillText('F  P', chartX + chartW / 2 + ghostOffset, chartY + 165 + ghostOffset);
    }

    ctx.restore();
  }

  attachDragListeners() {
    if (!this.container) return;

    const onPointerMove = (clientX) => {
      if (!this.isDragging) return;
      const sceneEl = document.getElementById('perception-scene');
      if (!sceneEl) return;
      const rect = sceneEl.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      this.updateSplit(percent);
    };

    const onPointerUp = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    const onMouseMove = (e) => onPointerMove(e.clientX);
    const onTouchMove = (e) => {
      if (e.touches[0]) onPointerMove(e.touches[0].clientX);
    };

    this.divider?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onPointerUp);
    });

    this.divider?.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
    }, { passive: true });
  }

  updateSplit(percent) {
    this.splitPercent = percent;
    if (this.wrapper) {
      this.wrapper.style.width = `${percent}%`;
    }
    if (this.divider) {
      this.divider.style.left = `${percent}%`;
    }
  }
}
