/**
 * EQ-04: Prueba de Concurrencia Atómica
 * Escenario: 50 VUs intentan reservar el MISMO slot simultáneamente.
 * Criterio de éxito:
 *   - Exactamente 1 respuesta HTTP 201 (reserva exitosa)
 *   - Exactamente 49 respuestas HTTP 409 (conflicto de concurrencia)
 *   - 0 respuestas 5xx
 *
 * Ejecutar: k6 run test/k6/eq04-concurrencia.js --env BASE_URL=http://localhost:3000 --env SLOT_ID=<uuid>
 */
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const reservasExitosas = new Counter('reservas_exitosas');
const conflictos409 = new Counter('conflictos_409');
const errores5xx = new Counter('errores_5xx');

export const options = {
  vus: 50,
  iterations: 50,
  thresholds: {
    reservas_exitosas: ['count==1'],
    conflictos_409: ['count==49'],
    errores_5xx: ['count==0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SLOT_ID = __ENV.SLOT_ID || 'slot-prueba-concurrencia-eq04';
const TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
  };

  const payload = JSON.stringify({
    slotId: SLOT_ID,
    pacienteId: `pac-eq04-${__VU}`,
    motivoConsulta: 'Prueba concurrencia EQ-04',
  });

  const res = http.post(`${BASE_URL}/api/v1/citas`, payload, { headers });

  check(res, { 'sin error 5xx': (r) => r.status < 500 });

  if (res.status === 201) reservasExitosas.add(1);
  else if (res.status === 409) conflictos409.add(1);
  else if (res.status >= 500) errores5xx.add(1);
}
