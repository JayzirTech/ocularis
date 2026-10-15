import { stateMachine, States } from './core/state-machine.js';
import { events } from './core/events.js';
import { isMobileDevice, requestFullscreen } from './core/device-guard.js';
import { OpticalEngine } from './engine/optical-engine.js';
import { HudController } from './components/hud.js';
import { MacroEyeScene } from './components/macro-eye.js';
import { AnatomyExplorerScene } from './components/anatomy-explorer.js';
import { RefractionScene } from './components/refraction-scene.js';
import { PerceptionSimulator } from './components/perception-simulator.js';
import { SynthesisScene } from './components/synthesis-scene.js';

class App {
  constructor() {
    this.canvas = document.getElementById('optical-canvas');
    this.engine = new OpticalEngine(this.canvas);
    this.hud = new HudController();

    // Instancias de escenas
    this.macroEyeScene = new MacroEyeScene();
    this.anatomyScene = new AnatomyExplorerScene();
    this.myopiaRefractionScene = new RefractionScene('myopia');
    this.myopiaPerceptionScene = new PerceptionSimulator('myopia');
    this.hyperopiaRefractionScene = new RefractionScene('hyperopia');
    this.hyperopiaPerceptionScene = new PerceptionSimulator('hyperopia');
    this.astigmatismRefractionScene = new RefractionScene('astigmatism');
    this.astigmatismPerceptionScene = new PerceptionSimulator('astigmatism');
    this.synthesisScene = new SynthesisScene();

    this.init();
  }

  init() {
    // 1. Verificación de Mobile Gate
    this.checkMobileGate();
    window.addEventListener('resize', () => this.checkMobileGate());

    // 2. Control de la pantalla de bienvenida / Fullscreen
    const entryGate = document.getElementById('entry-gate');
    const btnStart = document.getElementById('btn-start-experience');

    btnStart?.addEventListener('click', async () => {
      // Intenta activar pantalla completa nativa vía gesto de usuario
      await requestFullscreen();

      // Cierra la pantalla de bienvenida con fade out
      if (entryGate) {
        entryGate.classList.add('dismissed');
      }

      // Transiciona al primer estado del recorrido
      stateMachine.transition(States.EYE_HERO);
    });

    // 3. Orquestador de cambio de escenas con transiciones cinemáticas
    events.on('state:change', ({ from, to }) => {
      this.handleSceneSwitch(from, to);
    });

    // 4. Pausa de simulación
    events.on('simulation:pause', (isPaused) => {
      this.engine.setPaused(isPaused);
    });

    // Iniciar bucle a 60 FPS
    this.engine.start();
  }

  checkMobileGate() {
    const mobileGateEl = document.getElementById('mobile-gate');
    if (!mobileGateEl) return;
    if (isMobileDevice()) {
      mobileGateEl.style.display = 'flex';
      this.engine.setPaused(true);
    } else {
      mobileGateEl.style.display = 'none';
      this.engine.setPaused(false);
    }
  }

  /**
   * Gestiona el cambio de escenas con transiciones animadas tanto en el Canvas
   * como en los overlays de la interfaz.
   * @param {string} from Estado previo
   * @param {string} to Estado objetivo
   */
  handleSceneSwitch(from, to) {
    const sceneOverlay = document.getElementById('scene-overlay');

    // Desactivar simulador de percepción si estaba activo con animación de salida
    if (from === States.MYOPIA_PERCEPTION) {
      this.myopiaPerceptionScene.onExit();
    }
    if (from === States.HYPEROPIA_PERCEPTION) {
      this.hyperopiaPerceptionScene.onExit();
    }
    if (from === States.ASTIGMATISM_PERCEPTION) {
      this.astigmatismPerceptionScene.onExit();
    }

    // Ocultar dock de refracción al entrar a cualquiera de los ejemplos de percepción
    if (to === States.MYOPIA_PERCEPTION || to === States.HYPEROPIA_PERCEPTION || to === States.ASTIGMATISM_PERCEPTION) {
      const dockEl = document.getElementById('refraction-dock');
      if (dockEl) {
        dockEl.style.display = 'none';
        dockEl.innerHTML = '';
      }
    }

    // Configurar tipo de transición cinemática
    let transitionType = 'photon-sweep';
    let duration = 0.85;

    if (from === States.EYE_HERO && to === States.ANATOMY) {
      // Zoom-In cinemático: de la vista frontal macro al interior sagital
      transitionType = 'zoom-in';
      duration = 0.95;
    } else if (from === States.ANATOMY && to === States.EYE_HERO) {
      // Zoom-Out cinemático: regreso al macro-ojo
      transitionType = 'zoom-out';
      duration = 0.95;
    } else if (from === States.ENTRY) {
      // Entrada inicial suave
      transitionType = 'crossfade';
      duration = 0.6;
    }

    // Animar la tarjeta de explicación clínica
    this.animateCardChange(() => {
      switch (to) {
        case States.EYE_HERO:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.updateCardForHero();
          this.engine.transitionTo(this.macroEyeScene, transitionType, duration);
          break;

        case States.ANATOMY:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.engine.transitionTo(this.anatomyScene, transitionType, duration);
          break;

        case States.MYOPIA:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.engine.transitionTo(this.myopiaRefractionScene, transitionType, duration);
          break;

        case States.MYOPIA_PERCEPTION:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.myopiaPerceptionScene.onEnter();
          break;

        case States.HYPEROPIA:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.engine.transitionTo(this.hyperopiaRefractionScene, transitionType, duration);
          break;

        case States.HYPEROPIA_PERCEPTION:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.hyperopiaPerceptionScene.onEnter();
          break;

        case States.ASTIGMATISM:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.engine.transitionTo(this.astigmatismRefractionScene, transitionType, duration);
          break;

        case States.ASTIGMATISM_PERCEPTION:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.astigmatismPerceptionScene.onEnter();
          break;

        case States.SYNTHESIS:
          if (sceneOverlay) sceneOverlay.style.display = 'block';
          this.engine.transitionTo(this.synthesisScene, transitionType, duration);
          break;
      }
    });
  }

  /**
   * Suaviza la actualización de texto y controles en la tarjeta clínica
   * @param {Function} updateFn 
   */
  animateCardChange(updateFn) {
    const card = document.getElementById('scene-card');
    if (!card) {
      updateFn();
      return;
    }
    card.classList.add('switching');
    setTimeout(() => {
      updateFn();
      card.classList.remove('switching');
    }, 180);
  }

  updateCardForHero() {
    const kickerEl = document.getElementById('card-kicker');
    const titleEl = document.getElementById('card-title');
    const descEl = document.getElementById('card-desc');
    const controlsEl = document.getElementById('card-controls');

    if (kickerEl) kickerEl.textContent = 'BIENVENIDO A OCULARIS';
    if (titleEl) titleEl.textContent = 'El Sistema Óptico Humano';
    if (descEl) {
      descEl.textContent = 'El ojo humano capta la luz del entorno y la enfoca sobre la retina para formar imágenes nítidas. Puedes tocar el botón sobre el ojo o hacer clic en "Siguiente" para explorar su estructura interna.';
    }
    if (controlsEl) {
      controlsEl.innerHTML = `
        <div class="control-row">
          <div class="toggle-btn-group">
            <button class="toggle-pill-btn active" id="btn-hero-explore">
              <span>✦ Explorar Anatomía Interna</span>
            </button>
          </div>
        </div>
      `;
      controlsEl.querySelector('#btn-hero-explore')?.addEventListener('click', () => {
        stateMachine.next();
      });
    }
  }
}

// Inicializar la aplicación una vez cargado el DOM
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
