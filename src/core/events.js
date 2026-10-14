/**
 * Bus de eventos pub/sub desacoplado para comunicación entre
 * la máquina de estados, el motor de canvas, HUD y escenas.
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Suscribe un callback a un evento.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Función para cancelar la suscripción
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Desuscribe un callback de un evento.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emite un evento con datos asociados.
   * @param {string} event
   * @param {any} [data]
   */
  emit(event, data) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Error al procesar evento "${event}":`, err);
      }
    }
  }
}

export const events = new EventBus();
