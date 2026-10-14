import { events } from './events.js';

export const States = Object.freeze({
  ENTRY: 'entry',
  EYE_HERO: 'eye-hero',
  ANATOMY: 'anatomy',
  MYOPIA: 'myopia',
  MYOPIA_PERCEPTION: 'myopia-perception',
  ASTIGMATISM: 'astigmatism',
  ASTIGMATISM_PERCEPTION: 'astigmatism-perception',
  SYNTHESIS: 'synthesis'
});

export const STAGE_SEQUENCE = [
  States.EYE_HERO,
  States.ANATOMY,
  States.MYOPIA,
  States.MYOPIA_PERCEPTION,
  States.ASTIGMATISM,
  States.ASTIGMATISM_PERCEPTION,
  States.SYNTHESIS
];

export const STAGE_TITLES = {
  [States.EYE_HERO]: 'Etapa 1: Ojo General (Macro-Ojo)',
  [States.ANATOMY]: 'Etapa 2: Descubrir la Anatomía Interna',
  [States.MYOPIA]: 'Etapa 3: Física de la Miopía',
  [States.MYOPIA_PERCEPTION]: 'Etapa 4: Simulación de Visión Miópica',
  [States.ASTIGMATISM]: 'Etapa 5: Física del Astigmatismo',
  [States.ASTIGMATISM_PERCEPTION]: 'Etapa 6: Simulación de Visión Astigmática',
  [States.SYNTHESIS]: 'Etapa 7: Conexión con tu Caso Clínico'
};

class StateMachine {
  constructor() {
    this.current = States.ENTRY;
    this.history = [];
    this.isPaused = false;
  }

  /**
   * Obtiene el índice numérico (0 a 6) de la etapa en el recorrido, o -1 si está en ENTRY.
   */
  get currentStageIndex() {
    return STAGE_SEQUENCE.indexOf(this.current);
  }

  /**
   * Transiciona a un nuevo estado.
   * @param {string} nextState
   * @param {object} [payload]
   */
  transition(nextState, payload = {}) {
    if (this.current === nextState) return;

    const prevState = this.current;
    this.history.push(prevState);
    this.current = nextState;

    events.emit('state:change', {
      from: prevState,
      to: nextState,
      index: this.currentStageIndex,
      title: STAGE_TITLES[nextState] || '',
      payload
    });
  }

  /**
   * Avanza a la siguiente etapa de la secuencia pedagógica.
   */
  next() {
    const idx = this.currentStageIndex;
    if (idx >= 0 && idx < STAGE_SEQUENCE.length - 1) {
      this.transition(STAGE_SEQUENCE[idx + 1]);
    } else if (this.current === States.ENTRY) {
      this.transition(STAGE_SEQUENCE[0]);
    }
  }

  /**
   * Retrocede a la etapa previa.
   */
  prev() {
    const idx = this.currentStageIndex;
    if (idx > 0) {
      this.transition(STAGE_SEQUENCE[idx - 1]);
    }
  }

  /**
   * Salta directamente a una etapa por su clave de estado o por su índice numérico.
   * @param {string|number} target
   */
  jumpTo(target) {
    if (typeof target === 'number') {
      if (target >= 0 && target < STAGE_SEQUENCE.length) {
        this.transition(STAGE_SEQUENCE[target]);
      }
    } else if (Object.values(States).includes(target)) {
      this.transition(target);
    }
  }

  /**
   * Alterna el estado de pausa de la simulación.
   */
  togglePlayPause() {
    this.isPaused = !this.isPaused;
    events.emit('simulation:pause', this.isPaused);
    return this.isPaused;
  }

  /**
   * Reinicia la experiencia al Macro-Ojo.
   */
  reset() {
    this.transition(States.EYE_HERO);
  }
}

export const stateMachine = new StateMachine();
