// Ridge Runner: deterministic screenshot staging. ?shot=N&seed=S freezes the
// game in a composed moment after a fixed number of simulated frames, so a
// headless browser captures the same frame every time. The shots are renders
// of the game's own code — no compositing, no borrowed images.
import { CONFIG } from './config.js';
import { makePlane } from './physics.js';
import { makeMissionState } from './missions.js';
import { makeClouds } from './terrain.js';

export function parseShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = Number(q.get('shot') || 0);
  const seed = Number(q.get('seed') || 1);
  return { shot, seed };
}

// Build the frozen state for one shot. Returns { plane, mission, clouds,
// mood, freezeAfter } — the game runs `freezeAfter` fixed steps, then stops.
export function buildShot(shot, seed) {
  const clouds = makeClouds(seed, 14);
  if (shot === 1) {
    // Ring Run, mid-flight: ring 3 dead ahead, gentle bank, golden hour.
    const mission = makeMissionState('rings');
    const plane = makePlane(mission.mission);
    plane.x = 70; plane.y = 168; plane.z = 1150;
    plane.heading = 2; plane.roll = -10; plane.pitch = 1;
    plane.speed = 64; plane.throttle = 0.78; plane.fuel = 81;
    mission.ringsDone = 2; mission.nextRing = 2;
    mission.rings[0].passed = true; mission.rings[1].passed = true;
    mission.score = 2000; mission.time = 41.2;
    mission.toast = 'RING 2/8  +1000'; mission.toastAge = 0.4;
    return { plane, mission, clouds, mood: 'dusk', freezeAfter: 40 };
  }
  if (shot === 2) {
    // Valley Delivery, final approach: gear down, flaps out, strip ahead.
    const mission = makeMissionState('delivery');
    const plane = makePlane(mission.mission);
    plane.x = 12; plane.y = 86; plane.z = 3500;
    plane.heading = -1; plane.roll = 3; plane.pitch = -4;
    plane.speed = 44; plane.throttle = 0.42; plane.fuel = 47;
    plane.gearDown = true; plane.flaps = true;
    mission.score = 0; mission.time = 96.5;
    return { plane, mission, clouds, mood: 'day', freezeAfter: 40 };
  }
  if (shot === 3) {
    // Storm Rescue: dark cloud, rain of warnings, a beacon ring ahead.
    const mission = makeMissionState('rescue');
    const plane = makePlane(mission.mission);
    plane.x = -120; plane.y = 170; plane.z = 2250;
    plane.heading = -6; plane.roll = 14; plane.pitch = 3;
    plane.speed = 58; plane.throttle = 0.85; plane.fuel = 63;
    plane.damage = 18;
    mission.ringsDone = 3; mission.nextRing = 3;
    mission.rings[0].passed = true; mission.rings[1].passed = true;
    mission.rings[2].passed = true;
    mission.score = 3000; mission.time = 118.0; mission.timeLeft = 122;
    mission.toast = 'RING 3/5  +1000'; mission.toastAge = 0.5;
    return { plane, mission, clouds, mood: 'storm', freezeAfter: 40 };
  }
  if (shot === 4) {
    // Landed: on the strip, crate delivered, score card up.
    const mission = makeMissionState('delivery');
    const plane = makePlane(mission.mission);
    plane.x = 2; plane.y = 0.5; plane.z = 4200;
    plane.heading = 0; plane.roll = 0; plane.pitch = 0;
    plane.speed = 0; plane.throttle = 0; plane.fuel = 41;
    plane.gearDown = true; plane.flaps = true; plane.onGround = true;
    mission.done = true; mission.landed = true;
    mission.touchdownVs = 1.8; mission.objective = 'CRATE DELIVERED';
    mission.score = 2140; mission.time = 132.4;
    return { plane, mission, clouds, mood: 'day', freezeAfter: 40, endCard: true };
  }
  return null;
}

export const SHOT_NAMES = {
  1: '1-ring-run.jpg',
  2: '2-final-approach.jpg',
  3: '3-storm-rescue.jpg',
  4: '4-delivery-complete.jpg',
};
