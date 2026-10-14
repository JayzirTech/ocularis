/**
 * Detección de dispositivos (Mobile Gate) y wrappers de Fullscreen API.
 */

/**
 * Retorna true si el dispositivo actual es un smartphone/móvil
 * (ancho de pantalla < 768px o userAgent móvil).
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  const isSmallScreen = window.innerWidth < 768;
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUA = /ipad|tablet|playbook|silk/i.test(userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth >= 768);

  // Si es tablet con pantalla amplia, está permitido
  if (isTabletUA && window.innerWidth >= 768) {
    return false;
  }

  return isSmallScreen || (isMobileUA && !isTabletUA);
}

/**
 * Solicita entrar en pantalla completa de forma cross-browser.
 * Debe ser invocado dentro de un evento de usuario (click/tap).
 */
export async function requestFullscreen() {
  const docEl = document.documentElement;
  try {
    if (docEl.requestFullscreen) {
      await docEl.requestFullscreen();
    } else if (docEl.webkitRequestFullscreen) {
      await docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
      await docEl.msRequestFullscreen();
    }
  } catch (err) {
    console.warn('[DeviceGuard] No se pudo activar pantalla completa:', err);
  }
}

/**
 * Sale de la pantalla completa.
 */
export async function exitFullscreen() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen();
    }
  } catch (err) {
    console.warn('[DeviceGuard] Error al salir de pantalla completa:', err);
  }
}

/**
 * Retorna true si actualmente está en pantalla completa.
 */
export function isFullscreenActive() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Alterna entre entrar y salir de pantalla completa.
 */
export async function toggleFullscreen() {
  if (isFullscreenActive()) {
    await exitFullscreen();
  } else {
    await requestFullscreen();
  }
}
