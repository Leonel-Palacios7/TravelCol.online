import 'server-only';

/**
 * Hora de la solicitud para componentes de servidor (se renderizan una vez por petición, por lo que
 * la lectura del reloj es estable dentro de ese render).
 */
export function requestTime(): number {
  return Date.now();
}
