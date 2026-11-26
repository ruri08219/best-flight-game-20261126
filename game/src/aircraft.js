// Ridge Runner: the Kestrel K-9 bush plane, drawn from the chase view. The
// drawing is all canvas paths — a fuselage that tapers to the tail, wings
// with dihedral, a fin with the registration, gear legs, nav lights and an
// exhaust glow that answers the throttle.
import { CONFIG } from './config.js';
import { clamp } from './random.js';

// Draw the plane centred at (cx, cy), banked by rollDeg and pitched by
// pitchDeg. `t` is the running clock (propeller spin), `throttle` 0..1,
// `gearDown` and `flaps` set the configuration, `scale` sizes the drawing.
export function drawAircraft(ctx, cx, cy, rollDeg, pitchDeg, t, throttle, gearDown, flaps, scale) {
  ctx.save();
  ctx.translate(cx, cy + pitchDeg * 1.1);
  ctx.rotate((rollDeg * Math.PI) / 180);
  ctx.scale(scale, scale);

  const body = ctx.createLinearGradient(0, -46, 0, 40);
  body.addColorStop(0, '#f4f1e8');
  body.addColorStop(0.45, '#e8833a');
  body.addColorStop(1, '#c95f1e');

  // Propeller blur disc at the far nose (drawn first, behind the body).
  // From the chase view it is mostly hidden by the fuselage: keep it faint.
  ctx.save();
  ctx.globalAlpha = 0.07 + 0.06 * throttle;
  ctx.fillStyle = '#dfe8ef';
  ctx.beginPath();
  ctx.ellipse(0, -118, 10 + 14 * throttle, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Spinning prop blades, faint.
  ctx.save();
  ctx.translate(0, -118);
  ctx.rotate(t * (6 + throttle * 22));
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#2c313a';
  ctx.fillRect(-2, -34, 4, 68);
  ctx.fillRect(-34, -2, 68, 4);
  ctx.restore();

  // Main wings with dihedral (tips rise).
  ctx.fillStyle = '#e8833a';
  ctx.strokeStyle = '#8a4a16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -58); ctx.lineTo(-168, -34); ctx.lineTo(-168, -18);
  ctx.lineTo(-14, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, -58); ctx.lineTo(168, -34); ctx.lineTo(168, -18);
  ctx.lineTo(14, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Wing stripes.
  ctx.fillStyle = '#2f6f8f';
  ctx.fillRect(-168, -30, 60, 7);
  ctx.fillRect(108, -30, 60, 7);

  // Tailplane.
  ctx.fillStyle = '#d96f28';
  ctx.beginPath();
  ctx.moveTo(-10, 26); ctx.lineTo(-72, 44); ctx.lineTo(-72, 54);
  ctx.lineTo(-10, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, 26); ctx.lineTo(72, 44); ctx.lineTo(72, 54);
  ctx.lineTo(10, 40); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Fuselage: a long tapered body, nose away from the viewer.
  ctx.fillStyle = body;
  ctx.strokeStyle = '#7a3f12';
  ctx.beginPath();
  ctx.moveTo(-26, -96);
  ctx.quadraticCurveTo(-34, -20, -24, 44);
  ctx.quadraticCurveTo(-20, 58, 0, 58);
  ctx.quadraticCurveTo(20, 58, 24, 44);
  ctx.quadraticCurveTo(34, -20, 26, -96);
  ctx.quadraticCurveTo(0, -108, -26, -96);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Belly stripe and windows.
  ctx.fillStyle = '#2f6f8f';
  ctx.beginPath();
  ctx.moveTo(-24, -72); ctx.lineTo(24, -72); ctx.lineTo(20, -58); ctx.lineTo(-20, -58);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath(); ctx.ellipse(-13, -84, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -84, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -90, 8, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Vertical fin with registration.
  ctx.fillStyle = '#2f6f8f';
  ctx.beginPath();
  ctx.moveTo(-12, 34); ctx.lineTo(-16, 78); ctx.lineTo(16, 78); ctx.lineTo(12, 34);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f4f1e8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RR-7', 0, 68);

  // Flaps: extended trailing-edge segments on the inner wings only.
  if (flaps) {
    ctx.fillStyle = 'rgba(47, 111, 143, 0.9)';
    ctx.fillRect(-120, -16, 96, 6);
    ctx.fillRect(24, -16, 96, 6);
  }

  // Landing gear legs and wheels.
  if (gearDown) {
    ctx.strokeStyle = '#3a3f45';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-18, 30); ctx.lineTo(-30, 66); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 30); ctx.lineTo(30, 66); ctx.stroke();
    ctx.fillStyle = '#22262b';
    ctx.beginPath(); ctx.arc(-32, 70, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, 70, 9, 0, Math.PI * 2); ctx.fill();
  }

  // Nav lights: red left, green right, white strobe on the tail.
  const blink = Math.sin(t * 6) > 0;
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath(); ctx.arc(-170, -26, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#35e07a';
  ctx.beginPath(); ctx.arc(170, -26, 5, 0, Math.PI * 2); ctx.fill();
  if (blink) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0, 80, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Exhaust glow at the rear when the throttle is up.
  if (throttle > 0.15) {
    const glow = ctx.createRadialGradient(0, 62, 2, 0, 62, 14 + 26 * throttle);
    glow.addColorStop(0, `rgba(255, 190, 90, ${0.25 + 0.5 * throttle})`);
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 62, 14 + 26 * throttle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
