// Ridge Runner: the instruments — every gauge the pilot reads, drawn lit on
// glass panels. Altitude, speed and heading sit on tapes; the attitude ball
// shows the horizon; the radar shows the valley, the strip and the rings.
import { CONFIG } from './config.js';
import { angleDiff, clamp } from './random.js';

const C = CONFIG.colours;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = C.panel;
  ctx.strokeStyle = C.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function text(ctx, s, x, y, size, col, align = 'left', bold = false) {
  ctx.fillStyle = col;
  ctx.font = `${bold ? 'bold ' : ''}${size}px "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// Rounded-rect pill with a centred digital readout, used by both tapes.
function pill(ctx, x, y, w, h, text, fill, fg) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

function headingLabel(deg) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const d = ((Math.round(deg) % 360) + 360) % 360;
  if (d % 45 === 0) return names[Math.round(d / 45) % 8];
  return String(d).padStart(3, '0');
}

export function drawCompass(ctx, heading) {
  const W = CONFIG.canvasWidth;
  const cx = W / 2, y = 26;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 220, 8, 440, 46);
  ctx.clip();
  ctx.fillStyle = C.panel;
  ctx.fillRect(cx - 220, 8, 440, 46);
  ctx.strokeStyle = C.panelEdge;
  ctx.strokeRect(cx - 220, 8, 440, 46);
  // Ticks on the absolute heading grid, so a cardinal always lands in view.
  // Ticks live in the top half of the strip, labels in the bottom half.
  const start = Math.floor((heading - 95) / 5) * 5;
  for (let h = start; h <= heading + 95; h += 5) {
    const off = angleDiff(h, heading);
    const x = cx + off * 2.4;
    const hd = ((h % 360) + 360) % 360;
    const major = hd % 45 === 0;
    ctx.strokeStyle = major ? C.hudCyan : 'rgba(160, 200, 230, 0.6)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 14);
    ctx.lineTo(x, major ? 26 : 22);
    ctx.stroke();
    if (major) text(ctx, headingLabel(hd), x, 42, 11, C.hudCyan, 'center', true);
  }
  ctx.restore();
  // Centre caret below the strip + readout.
  ctx.fillStyle = C.hudAmber;
  ctx.beginPath();
  ctx.moveTo(cx - 7, 54); ctx.lineTo(cx + 7, 54); ctx.lineTo(cx, 62);
  ctx.closePath(); ctx.fill();
  text(ctx, headingLabel(heading), cx, 74, 14, C.hudAmber, 'center', true);
}

function drawTape(ctx, x, y, w, h, value, step, unit, format, colour) {
  panel(ctx, x, y, w, h);
  const cy = y + h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const pxPerUnit = h / (step * 8);
  const centre = Math.round(value / step) * step;
  for (let v = centre - step * 4; v <= centre + step * 4; v += step) {
    const yy = cy - (v - value) * pxPerUnit;
    if (yy < y + 4 || yy > y + h - 4) continue;
    ctx.strokeStyle = 'rgba(160, 200, 230, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + w - 14, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke();
    text(ctx, format(v), x + w - 18, yy, 11, '#cfe8ff', 'right');
  }
  ctx.restore();
  // Centre readout on a bright pill so it reads against the dark panel.
  pill(ctx, x + 3, cy - 13, w - 6, 26, format(value), colour, '#08121e');
  text(ctx, unit, x + 6, y + h + 12, 11, C.hudCyan, 'left', true);
}

export function drawSpeedTape(ctx, knots, throttle) {
  drawTape(ctx, 16, 150, 86, 300, knots, 10, 'KT', (v) => String(Math.round(v)), C.hudGreen);
  // Throttle bar under the speed tape.
  panel(ctx, 16, 470, 86, 26);
  const w = 78 * throttle;
  ctx.fillStyle = throttle > 0.9 ? C.hudAmber : C.hudGreen;
  ctx.fillRect(20, 474, w, 18);
  text(ctx, 'THR ' + Math.round(throttle * 100) + '%', 20, 483, 11, '#eaf6ff', 'left', true);
}

export function drawAltitudeTape(ctx, altM, vs) {
  drawTape(ctx, CONFIG.canvasWidth - 102, 150, 86, 300, altM, 50, 'M',
    (v) => String(Math.round(v)), C.hudCyan);
  const arrow = vs > 0.5 ? '▲' : vs < -0.5 ? '▼' : '—';
  text(ctx, arrow + ' ' + Math.abs(vs).toFixed(1) + ' m/s', CONFIG.canvasWidth - 98, 470, 13,
    vs < -6 ? C.hudRed : '#cfe8ff', 'left', true);
}

export function drawAttitude(ctx, roll, pitch) {
  const cx = 92, cy = 700, r = 62;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-roll * Math.PI) / 180);
  const off = clamp(pitch * 2.2, -r, r);
  // Sky half and ground half, shifted by pitch.
  ctx.fillStyle = '#3d7ab8';
  ctx.fillRect(-r, -r + off - r, r * 2, r * 2);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, off, r * 2, r * 2);
  // Pitch ladder.
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  for (const p of [-20, -10, 10, 20]) {
    const yy = off - p * 2.2;
    ctx.beginPath(); ctx.moveTo(-26, yy); ctx.lineTo(26, yy); ctx.stroke();
  }
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-r, off); ctx.lineTo(r, off); ctx.stroke();
  ctx.restore();
  // Bezel + fixed wings symbol.
  ctx.strokeStyle = C.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = C.hudAmber;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 8, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 30, cy); ctx.stroke();
  ctx.fillStyle = C.hudAmber;
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'ATT', cx, cy + r + 14, 11, C.hudCyan, 'center', true);
}

export function drawFuelDamage(ctx, fuel, damage, gearDown, flaps, wind) {
  const x = CONFIG.canvasWidth - 240, y = 640;
  panel(ctx, x, y, 224, 130);
  // Fuel bar.
  text(ctx, 'FUEL', x + 12, y + 18, 12, '#cfe8ff', 'left', true);
  const fw = 130 * clamp(fuel / 100, 0, 1);
  ctx.fillStyle = '#12283a';
  ctx.fillRect(x + 64, y + 8, 130, 18);
  ctx.fillStyle = fuel < 20 ? C.hudRed : fuel < 40 ? C.hudAmber : C.hudGreen;
  ctx.fillRect(x + 64, y + 8, fw, 18);
  text(ctx, Math.round(fuel) + '%', x + 200, y + 18, 12, '#eaf6ff', 'right', true);
  // Damage bar.
  text(ctx, 'DMG', x + 12, y + 46, 12, '#cfe8ff', 'left', true);
  ctx.fillStyle = '#12283a';
  ctx.fillRect(x + 64, y + 36, 130, 18);
  ctx.fillStyle = damage > 60 ? C.hudRed : damage > 25 ? C.hudAmber : C.hudGreen;
  ctx.fillRect(x + 64, y + 36, 130 * clamp(damage / 100, 0, 1), 18);
  text(ctx, Math.round(damage) + '%', x + 200, y + 46, 12, '#eaf6ff', 'right', true);
  // Gear / flaps lamps.
  const gearCol = gearDown ? C.hudGreen : '#5a6a7a';
  const flapCol = flaps ? C.hudAmber : '#5a6a7a';
  ctx.fillStyle = gearCol;
  ctx.beginPath(); ctx.arc(x + 22, y + 78, 8, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'GEAR', x + 36, y + 78, 12, '#cfe8ff', 'left', true);
  ctx.fillStyle = flapCol;
  ctx.beginPath(); ctx.arc(x + 122, y + 78, 8, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'FLAPS', x + 136, y + 78, 12, '#cfe8ff', 'left', true);
  // Wind.
  const wdir = Math.atan2(wind.x, wind.z) * 180 / Math.PI;
  text(ctx, 'WIND ' + Math.round(Math.hypot(wind.x, wind.z) * 1.94) + ' KT', x + 12, y + 110,
    12, '#cfe8ff', 'left', true);
  ctx.save();
  ctx.translate(x + 190, y + 110);
  ctx.rotate((wdir * Math.PI) / 180);
  ctx.fillStyle = C.hudCyan;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawRadar(ctx, plane, rings, nextIndex) {
  const x = CONFIG.canvasWidth - 240, y = 92, w = 224, h = 200;
  panel(ctx, x, y, w, h);
  text(ctx, 'VALLEY RADAR', x + 12, y + 16, 11, C.hudCyan, 'left', true);
  const mapX = (wx) => x + w / 2 + (wx / 320) * (w / 2 - 8);
  const mapZ = (wz) => y + h - 14 - ((wz - plane.z + 900) / 2600) * (h - 34);
  // Valley walls.
  ctx.fillStyle = 'rgba(90, 120, 90, 0.35)';
  ctx.fillRect(mapX(-260), y + 20, mapX(260) - mapX(-260), h - 34);
  // Runway.
  const r = CONFIG.runway;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(mapX(-23), mapZ(r.z + 350), 6, Math.max(4, mapZ(r.z - 350) - mapZ(r.z + 350)));
  // Rings.
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    ctx.fillStyle = ring.passed ? C.ringDone : i === nextIndex ? C.ringNext : 'rgba(200,220,240,0.8)';
    ctx.beginPath();
    ctx.arc(mapX(ring.x), mapZ(ring.z), i === nextIndex ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Plane triangle, pointing up the valley.
  ctx.save();
  ctx.translate(mapX(plane.x), mapZ(plane.z));
  ctx.rotate(((plane.heading) * Math.PI) / 180);
  ctx.fillStyle = C.hudAmber;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawMissionPanel(ctx, mission, state) {
  const x = 16, y = 64, w = 330;
  panel(ctx, x, y, w, 92);
  text(ctx, mission.name, x + 12, y + 18, 14, C.hudAmber, 'left', true);
  text(ctx, mission.blurb, x + 12, y + 40, 11, '#dfeefc', 'left');
  const right = state.ringsTotal > 0
    ? `RINGS ${state.ringsDone}/${state.ringsTotal}`
    : state.objective;
  text(ctx, right, x + 12, y + 62, 13, C.hudGreen, 'left', true);
  if (state.timeLeft > 0) {
    text(ctx, 'T-' + Math.ceil(state.timeLeft) + 's', x + w - 12, y + 62, 13,
      state.timeLeft < 30 ? C.hudRed : '#eaf6ff', 'right', true);
  }
  text(ctx, 'SCORE ' + state.score, x + 12, y + 82, 12, C.hudCyan, 'left', true);
}

export function drawWarnings(ctx, warns, time) {
  if (!warns.length) return;
  const blink = Math.sin(time * 10) > 0;
  const y = 168;
  let x = CONFIG.canvasWidth / 2 - (warns.length * 110) / 2;
  for (const w of warns) {
    ctx.fillStyle = blink ? C.hudRed : 'rgba(120, 30, 25, 0.9)';
    ctx.strokeStyle = '#ffb0a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, 100, 30, 6);
    ctx.fill(); ctx.stroke();
    text(ctx, w, x + 50, y + 15, 13, '#ffffff', 'center', true);
    x += 110;
  }
}

export function drawFlightPathMarker(ctx, plane) {
  // The velocity vector marker sits where the nose is going: offset from the
  // centre by pitch and by the heading drift.
  const cx = CONFIG.canvasWidth / 2 + plane.roll * 0.4;
  const cy = CONFIG.horizonY - plane.pitch * 6;
  ctx.strokeStyle = C.hudGreen;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 12);
  ctx.stroke();
  ctx.fillStyle = C.hudGreen;
  ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.fill();
}

export function drawToast(ctx, msg, age) {
  if (!msg) return;
  const alpha = clamp(1.6 - age, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  text(ctx, msg, CONFIG.canvasWidth / 2, 240, 26, C.hudAmber, 'center', true);
  ctx.restore();
}

export function drawTitle(ctx, time) {
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  ctx.fillStyle = 'rgba(6, 14, 26, 0.55)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'RIDGE RUNNER', W / 2, 150, 64, '#ffd23e', 'center', true);
  text(ctx, 'A L P I N E   C O U R I E R', W / 2, 205, 20, '#bfe6ff', 'center', true);
  text(ctx, 'Fly the Kestrel K-9 through the valley. Rings, a strip landing, a storm rescue.',
    W / 2, 250, 16, '#eaf6ff', 'center');
  const missions = [
    ['1', 'RING RUN', 'Thread 8 glowing rings — throttle discipline wins.'],
    ['2', 'VALLEY DELIVERY', 'Land the medicine crate on Eagle\u2019s Nest strip.'],
    ['3', 'STORM RESCUE', 'Five beacons in 240 seconds, gusting wind.'],
  ];
  let y = 320;
  for (const [key, name, blurb] of missions) {
    panel(ctx, W / 2 - 300, y, 600, 62);
    text(ctx, key, W / 2 - 278, y + 31, 24, C.hudAmber, 'left', true);
    text(ctx, name, W / 2 - 240, y + 20, 17, '#ffffff', 'left', true);
    text(ctx, blurb, W / 2 - 240, y + 44, 13, '#cfe8ff', 'left');
    y += 76;
  }
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, 'Press 1 / 2 / 3 or click a mission to fly', W / 2, y + 26, 16, '#ffd23e', 'center', true);
  ctx.restore();
  text(ctx, 'W/S throttle · Arrow keys pitch & bank · SPACE airbrake · G gear · F flaps · P pause · R restart',
    W / 2, H - 44, 14, '#bfe6ff', 'center');
}

export function drawEndCard(ctx, title, lines, accent) {
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  ctx.fillStyle = 'rgba(6, 14, 26, 0.62)';
  ctx.fillRect(0, 0, W, H);
  panel(ctx, W / 2 - 330, 190, 660, 330);
  text(ctx, title, W / 2, 240, 34, accent, 'center', true);
  let y = 300;
  for (const line of lines) {
    text(ctx, line, W / 2, y, 17, '#eaf6ff', 'center');
    y += 34;
  }
  text(ctx, 'Press R to fly again · Press T for the title screen', W / 2, 486, 14, '#bfe6ff', 'center');
}
