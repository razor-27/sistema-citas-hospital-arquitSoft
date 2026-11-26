/**
 * EQ-02: Prueba de Rendimiento Sostenido
 * Escenario: 2000 VUs durante 2 minutos — 10:1 ratio lecturas:reservas
 * Umbrales:
 *   - Consulta disponibilidad p(95) < 300ms
 *   - Reserva cita p(95) < 800ms
 *   - Tasa de error < 0.1%
 *
 * Ejecutar: k6 run test/k6/eq02-rendimiento.js --env BASE_URL=http://localhost:3000
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latenciaLectura = new Trend('http_req_duration_lectura', true);
const latenciaReserva = new Trend('http_req_duration_reserva', true);

export const options = {
  vus: 2000,
  duration: '2m',
  thresholds: {
    http_req_duration_lectura: ['p(95)<300'],
    http_req_duration_reserva: ['p(95)<800'],
    errors: ['rate<0.001'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.AUTH_TOKEN || '';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
  };
}

// 10 consultas de disponibilidad por cada reserva
export default function () {
  const vuId = __VU % 10;

  if (vuId < 9) {
    // Lectura: consultar disponibilidad
    const fecha = new Date().toISOString().split('T')[0];
    const res = http.get(
      `${BASE_URL}/api/v1/agenda/disponibilidad?especialidad=MEDICINA_GENERAL&fecha=${fecha}`,
      { headers: getHeaders(), tags: { type: 'lectura' } },
    );
    latenciaLectura.add(res.timings.duration);
    check(res, { 'disponibilidad 200': (r) => r.status === 200 });
    errorRate.add(res.status >= 500);
  } else {
    // Escritura: reservar cita
    const payload = JSON.stringify({
      slotId: `slot-${Math.floor(Math.random() * 1000)}`,
      pacienteId: `pac-${__VU}`,
      motivoConsulta: 'Consulta de rendimiento EQ-02',
    });
    const res = http.post(`${BASE_URL}/api/v1/citas`, payload, {
      headers: getHeaders(),
      tags: { type: 'reserva' },
    });
    latenciaReserva.add(res.timings.duration);
    check(res, { 'reserva 201 o 409': (r) => r.status === 201 || r.status === 409 });
    errorRate.add(res.status >= 500);
  }

  sleep(0.1);
}
