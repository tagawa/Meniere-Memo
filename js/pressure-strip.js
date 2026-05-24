import { getCachedForecast, getCachedPressure } from './weather.js';

// Renders (or hides) the pressure strip above the tab bar.
// Call after initWeather resolves and whenever the home tab becomes active.
export function renderPressureStrip() {
  const strip = document.getElementById('pressure-strip');
  if (!strip) return;
  const forecast = getCachedForecast();

  if (!forecast || forecast.length < 2) {
    strip.hidden = true;
    return;
  }

  const W = 240, H = 28;
  const min = Math.min(...forecast);
  const max = Math.max(...forecast);
  const range = max - min || 1; // avoid div-by-zero when all values are equal

  const xOf = i => (i / (forecast.length - 1)) * (W - 1);
  const yOf = p => (H - 1) - ((p - min) / range) * (H - 1);

  const points = forecast
    .map((p, i) => `${xOf(i).toFixed(1)},${yOf(p).toFixed(1)}`)
    .join(' ');

  // "Now" marker: fractional index within the slot array.
  // Slot 0 = today 00:00 local; each slot = 3h. Clamp to array bounds.
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const nowIndex = Math.min(currentHour / 3, forecast.length - 1);
  const i0 = Math.floor(nowIndex);
  const i1 = Math.min(i0 + 1, forecast.length - 1);
  const t = nowIndex - i0;
  const nowX = (xOf(i0) * (1 - t) + xOf(i1) * t).toFixed(1);
  const nowY = yOf(forecast[i0] * (1 - t) + forecast[i1] * t).toFixed(1);

  const currentHpa = getCachedPressure();
  const valueLabel = currentHpa !== null ? `${currentHpa} hPa` : '';

  strip.innerHTML = `
    <span class="pressure-strip-value">${valueLabel}</span>
    <svg class="pressure-sparkline" viewBox="0 0 ${W} ${H}"
         aria-hidden="true" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="var(--color-accent)"
                stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${nowX}" cy="${nowY}" r="3" fill="var(--color-accent)"/>
    </svg>
  `;
  strip.hidden = false;
}
