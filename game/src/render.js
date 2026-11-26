// Ridge Runner: the scene composer. One frame is sky, sun, clouds, ridges,
// valley floor, runway, rings, the aircraft, then the instruments — in that
// order, so nearer things cover farther ones.
import { CONFIG } from './config.js';
import { makeCamera } from './camera.js';
import { drawAircraft } from './aircraft.js';
import { drawClouds, drawGround, drawRidges, drawRings, drawRunway, drawSky } from './scenery.js';
import {
  drawAltitudeTape, drawAttitude, drawCompass, drawFlightPathMarker,
  drawFuelDamage, drawMissionPanel, drawRadar, drawSpeedTape, drawToast,
  drawWarnings,
} from './hud.js';
import { clamp } from './random.js';

const MS_PER_KNOT = 1.94384;

export function renderFrame(ctx, game) {
  const { plane, mission, clouds, time, mood } = game;
  const W = CONFIG.canvasWidth, H = CONFIG.canvasHeight;
  const cam = makeCamera(plane);

  drawSky(ctx, cam, time, mood);
  drawClouds(ctx, cam, clouds, time);
  drawRidges(ctx, cam);
  drawGround(ctx, cam, plane, time);
  drawRunway(ctx, cam, time);
  drawRings(ctx, cam, mission.rings, mission.nextRing, time);

  // Rain streaks in storm weather.
  if (mood === 'storm') {
    ctx.strokeStyle = 'rgba(200, 215, 230, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = ((i * 173 + time * 260) % (W + 40)) - 20;
      const y = ((i * 311 + time * 700) % (H + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 18);
      ctx.stroke();
    }
  }

  // The aircraft, chased from behind, centred just below the horizon.
  const scale = plane.onGround ? 0.82 : 1;
  drawAircraft(ctx, W / 2, 560, plane.roll, plane.pitch, time,
    plane.throttle, plane.gearDown, plane.flaps, scale);

  // Instruments, lit.
  const knots = plane.speed * MS_PER_KNOT;
  drawCompass(ctx, plane.heading);
  drawSpeedTape(ctx, knots, plane.throttle);
  drawAltitudeTape(ctx, plane.y, plane.verticalSpeed);
  drawAttitude(ctx, plane.roll, plane.pitch);
  drawFuelDamage(ctx, plane.fuel, plane.damage, plane.gearDown, plane.flaps, game.wind);
  drawRadar(ctx, plane, mission.rings, mission.nextRing);
  drawMissionPanel(ctx, mission.mission, {
    ringsTotal: mission.rings.length,
    ringsDone: mission.ringsDone,
    objective: mission.objective,
    timeLeft: mission.timeLeft,
    score: mission.score,
  });
  drawFlightPathMarker(ctx, plane);
  drawToast(ctx, mission.toast, mission.toastAge);

  // Warnings, computed from the live state.
  const warns = [];
  if (game.stalled) warns.push('STALL');
  if (plane.fuel < 20) warns.push('LOW FUEL');
  if (plane.y < 60 && Math.abs(plane.x) > CONFIG.valleyHalfWidth - 40) warns.push('TERRAIN');
  if (plane.y < 120 && plane.z > CONFIG.runway.z - 900 && !plane.gearDown
    && mission.mission.id === 'delivery') warns.push('GEAR UP');
  if (plane.damage > 70) warns.push('DAMAGE');
  drawWarnings(ctx, warns, time);

  // Small footer: controls reminder + sound state.
  ctx.fillStyle = 'rgba(190, 220, 245, 0.75)';
  ctx.font = '12px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('W/S throttle · arrows fly · G gear · F flaps · P pause · L sound '
    + (game.audioOn ? 'ON' : 'OFF'), 180, H - 16);
}
