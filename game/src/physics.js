// Ridge Runner: the flight model. Arcade-true, not a simulator: throttle sets
// speed, stick sets pitch and bank, bank turns the heading, and the wing
// quits below stall speed. Fuel, wind gusts, damage and landing all live here.
import { CONFIG } from './config.js';
import { angleDiff, clamp, degToRad } from './random.js';
import { terrainHeight } from './terrain.js';

export function makePlane(mission) {
  const start = {
    x: 0,
    y: mission.startY ?? 180,
    z: mission.startZ ?? 200,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: mission.startSpeed ?? 52,
    throttle: 0.62,
    fuel: mission.fuelStart ?? 100,
    damage: 0,
    gearDown: false,
    flaps: false,
    verticalSpeed: 0,
    onGround: false,
    airborne: true,
  };
  return start;
}

// One simulation step. `input` carries stick/throttle deflections in [-1, 1],
// `wind` is the current wind vector {x, z} in m/s, `dt` seconds.
export function stepFlight(p, input, wind, dt, mission) {
  const C = CONFIG.plane;
  const prevY = p.y;

  // Throttle: W/S keys move it, it stays where you leave it.
  p.throttle = clamp(p.throttle + input.throttleDelta * dt, 0, 1);

  // Roll and pitch follow the stick, with a little smoothing.
  const targetRoll = input.roll * 62;
  p.roll += clamp(targetRoll - p.roll, -C.rollRate * dt, C.rollRate * dt);
  const targetPitch = input.pitch * 24;
  p.pitch += clamp(targetPitch - p.pitch, -C.pitchRate * dt, C.pitchRate * dt);

  // Drag and thrust: level speed settles near throttle * cruise, less when
  // climbing, more when diving; gear and flaps add drag. A prop pulls hardest
  // at low speed, so the idle floor keeps the wing flying a little longer.
  const drag = (p.gearDown ? 0.08 : 0) + (p.flaps ? 0.10 : 0);
  const targetSpeed = C.cruiseSpeed * (0.35 + 0.65 * p.throttle) * (1 - drag)
    - Math.max(0, p.pitch) * 0.55 + Math.max(0, -p.pitch) * 0.5;
  p.speed += clamp(targetSpeed - p.speed, -12 * dt, 16 * dt);
  p.speed = clamp(p.speed, 0, C.maxSpeed);

  // A banked wing turns the heading; a level wing does not. Banking right
  // (positive roll) turns right (heading grows); banking left turns left.
  const turn = Math.sin(degToRad(p.roll)) * C.turnRate * (p.speed / C.cruiseSpeed);
  p.heading = (p.heading + turn * dt + 360) % 360;

  // Stall: below stall speed the nose drops and the wing stops answering.
  const stalled = p.speed < C.stallSpeed && !p.onGround;
  if (stalled) {
    p.pitch = Math.max(p.pitch - 18 * dt, -22);
  }

  // Vertical speed from pitch and power; gravity wins when stalled.
  const climb = Math.sin(degToRad(p.pitch)) * p.speed
    + (p.throttle - 0.45) * C.maxClimb * 0.4;
  p.verticalSpeed = stalled ? Math.min(p.verticalSpeed - 22 * dt, -9) : climb;

  // Position: forward along the heading, plus wind drift.
  const hdg = degToRad(p.heading);
  const fwdX = Math.sin(hdg), fwdZ = Math.cos(hdg);
  p.x += (fwdX * p.speed + wind.x) * dt;
  p.z += (fwdZ * p.speed + wind.z) * dt;
  p.y += p.verticalSpeed * dt;

  // Fuel: thirst grows with throttle; empty tanks stop the engine.
  const burn = (C.fuelBurnIdle + (C.fuelBurn - C.fuelBurnIdle) * p.throttle) * dt;
  p.fuel = Math.max(0, p.fuel - burn);
  if (p.fuel <= 0 && p.throttle > 0) p.throttle = 0;

  // Overspeed stress: a hard bank at high speed strains the airframe.
  if (Math.abs(p.roll) > C.overspeedBank && p.speed > C.cruiseSpeed * 1.15) {
    p.damage += 4.5 * dt;
  }

  // Ground: the valley floor is at y = 0 near the centre line.
  if (p.y <= 0.5 && !p.onGround) {
    const runway = CONFIG.runway;
    const overRunway = Math.abs(p.x - runway.x) < runway.width / 2
      && Math.abs(p.z - runway.z) < runway.length / 2
      && Math.abs(angleDiff(p.heading, runway.heading)) < 18;
    const vs = -p.verticalSpeed;
    if (overRunway && p.gearDown && vs < C.crashVs && Math.abs(p.roll) < 14) {
      // A landing: touchdown quality decides the verdict.
      p.onGround = true;
      p.y = 0.5;
      p.verticalSpeed = 0;
      p.pitch = 0;
      p.roll = 0;
      if (vs > C.hardLandingVs) p.damage += (vs - C.hardLandingVs) * 9;
      return { landed: true, touchdownVs: vs, overRunway: true };
    }
    // Anything else at ground level is a crash.
    p.y = 0.5;
    p.damage = 100;
    return { crashed: true, cause: overRunway && !p.gearDown
      ? 'Belly landing — the gear was up.'
      : 'You hit the valley floor.' };
  }

  // Terrain: the walls rise on both sides of the valley. Collide against the
  // real height field once past the valley edge; the floor itself is handled
  // by the ground check above.
  if (Math.abs(p.x) > CONFIG.valleyHalfWidth) {
    const ground = terrainHeight(p.x, p.z);
    if (p.y < ground + 2) {
      p.damage = 100;
      return { crashed: true, cause: 'You flew into the ridge wall.' };
    }
  }
  if (p.damage >= 100) {
    return { crashed: true, cause: 'The airframe gave out.' };
  }
  if (p.fuel <= 0 && p.speed < 8 && p.y > 2) {
    return { crashed: true, cause: 'Out of fuel — the engine quit over the valley.' };
  }
  return { landed: false, crashed: false, stalled };
}

// Wind right now: a steady westerly plus a slow gust cycle in storm missions.
export function currentWind(time, storm) {
  const base = CONFIG.wind.baseSpeed;
  const gust = storm
    ? Math.sin(time * (2 * Math.PI / CONFIG.wind.gustPeriod)) * CONFIG.wind.gustStrength
    : Math.sin(time * 0.11) * 1.5;
  return { x: -(base + gust), z: Math.cos(time * 0.07) * 1.2 };
}
