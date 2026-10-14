import { stateMachine, States, STAGE_SEQUENCE, STAGE_TITLES } from '../core/state-machine.js';
import { events } from '../core/events.js';
import { toggleFullscreen, isFullscreenActive } from '../core/device-guard.js';

export class HudController {
  constructor() {
    this.stageBadgeEl = document.getElementById('current-stage-badge');
    this.btnPrev = document.getElementById('hud-btn-prev');
    this.btnNext = document.getElementById('hud-btn-next');
    this.btnReset = document.getElementById('hud-btn-reset');
    this.btnPlayPause = document.getElementById('hud-btn-playpause');
    this.iconPlay = document.getElementById('icon-play');
    this.iconPause = document.getElementById('icon-pause');
    this.stageDots = document.querySelectorAll('.stage-dot');
    this.btnToggleFs = document.getElementById('btn-toggle-fullscreen');
    this.iconFsEnter = document.getElementById('icon-fullscreen-enter');
    this.iconFsExit = document.getElementById('icon-fullscreen-exit');
    this.shortcutBtns = document.querySelectorAll('.shortcut-pill');

    this.bindEvents();
  }

  bindEvents() {
    // Navegación HUD
    this.btnPrev?.addEventListener('click', () => stateMachine.prev());
    this.btnNext?.addEventListener('click', () => stateMachine.next());
    this.btnReset?.addEventListener('click', () => stateMachine.reset());

    // Play / Pause
    this.btnPlayPause?.addEventListener('click', () => {
      const isPaused = stateMachine.togglePlayPause();
      if (this.iconPlay && this.iconPause) {
        this.iconPlay.style.display = isPaused ? 'block' : 'none';
        this.iconPause.style.display = isPaused ? 'none' : 'block';
      }
    });

    // Clic en los puntos de etapa de la línea de tiempo
    this.stageDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const stageIdx = parseInt(dot.dataset.stage, 10);
        stateMachine.jumpTo(stageIdx);
      });
    });

    // Accesos directos superiores
    this.shortcutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.jump;
        stateMachine.jumpTo(target);
      });
    });

    // Botón discreto de pantalla completa
    this.btnToggleFs?.addEventListener('click', async () => {
      await toggleFullscreen();
      this.updateFullscreenIcon();
    });

    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());

    // Botón discreto encima del Macro-Ojo
    const btnEnterEye = document.getElementById('btn-enter-interior');
    btnEnterEye?.addEventListener('click', () => {
      stateMachine.jumpTo(States.ANATOMY);
    });

    // Escuchar cambios de estado desde la máquina de estados
    events.on('state:change', ({ to, index, title }) => {
      this.syncUI(to, index, title);
    });
  }

  syncUI(toState, index, title) {
    // 1. Badge superior
    if (this.stageBadgeEl) {
      this.stageBadgeEl.textContent = title || STAGE_TITLES[toState] || '';
    }

    // 2. Línea de tiempo de etapas
    this.stageDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === index);
      dot.classList.toggle('completed', idx < index);
    });

    // 3. Accesos directos superiores
    this.shortcutBtns.forEach(btn => {
      const jump = btn.dataset.jump;
      const isMatch = (jump === 'eye-hero' && toState === States.EYE_HERO) ||
                      (jump === 'anatomy' && toState === States.ANATOMY) ||
                      (jump === 'myopia' && (toState === States.MYOPIA || toState === States.MYOPIA_PERCEPTION)) ||
                      (jump === 'astigmatism' && (toState === States.ASTIGMATISM || toState === States.ASTIGMATISM_PERCEPTION));
      btn.classList.toggle('active', isMatch);
    });

    // 4. Botón Anterior (deshabilitado en etapa 0)
    if (this.btnPrev) {
      this.btnPrev.style.opacity = index <= 0 ? '0.35' : '1';
      this.btnPrev.style.pointerEvents = index <= 0 ? 'none' : 'auto';
    }

    // 5. Botón Siguiente (texto dinámico en etapa final)
    if (this.btnNext) {
      const nextSpan = this.btnNext.querySelector('span');
      if (nextSpan) {
        nextSpan.textContent = index === STAGE_SEQUENCE.length - 1 ? 'Finalizar' : 'Siguiente';
      }
    }
  }

  updateFullscreenIcon() {
    const isFs = isFullscreenActive();
    if (this.iconFsEnter && this.iconFsExit) {
      this.iconFsEnter.style.display = isFs ? 'none' : 'block';
      this.iconFsExit.style.display = isFs ? 'block' : 'none';
    }
  }
}
