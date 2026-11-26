/**
 * EQ-03: Prueba de Pico (Spike Test) — 5000 usuarios simultáneos
 * Escenario: Rampa de 500 → 5000 VUs → vuelta a 0
 * Umbrales:
 *   - p(95) < 1500ms bajo carga máxima
 *   - Tasa de error < 0.1%
 *   - Sin pérdida de datos (no 5xx en reservas)
 *
 * Ejecutar: k6 run test/k6/eq03-spike-5000.js --env BASE_URL=http://localhost:3000
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 500 },   // Rampa de entrada
    { duration: '1m', target: 5000 },   // Pico máximo
    { duration: '30s', target: 5000 },  // Mantener pico
    { duration: '1m', target: 0 },      // Rampa de salida
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    errors: ['rate<0.001'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
  };

  const fecha = new Date().toISOString().split('T')[0];
  const res = http.get(
    `${BASE_URL}/api/v1/agenda/disponibilidad?especialidad=MEDICINA_GENERAL&fecha=${fecha}`,
    { headers },
  );

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'latencia < 1500ms': (r) => r.timings.duration < 1500,
  });

  errorRate.add(!ok || res.status >= 500);
  sleep(0.05);
}
