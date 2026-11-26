// Ridge Runner: the three missions — what counts as done, what counts as a
// fail, and how the score is built. The flight model stays in physics.js;
// this file only watches the plane against the mission's goals.
import { CONFIG } from './config.js';
import { makeRings } from './terrain.js';

export function makeMissionState(missionId) {
  const mission = CONFIG.missions[missionId];
  return {
    mission,
    rings: makeRings(mission),
    nextRing: 0,
    ringsDone: 0,
    score: 0,
    time: 0,
    timeLeft: mission.timeLimit || 0,
    objective: missionId === 'delivery'
      ? 'LAND ON EAGLE\u2019S NEST'
      : missionId === 'rescue'
        ? 'REACH THE NORTH HUT'
        : 'THREAD THE RINGS',
    done: false,
    failed: false,
    failCause: '',
    toast: '',
    toastAge: 99,
    touchdownVs: null,
    landed: false,
  };
}

function setToast(state, msg) {
  state.toast = msg;
  state.toastAge = 0;
}

// Watch one simulation step. Returns 'ring' | 'landed' | 'complete' | 'failed'
// when something worth a sound or a screen happens, else null.
export function updateMission(state, plane, result, dt) {
  state.time += dt;
  state.toastAge += dt;
  if (state.timeLeft > 0) state.timeLeft -= dt;

  if (result.crashed) {
    state.failed = true;
    state.failCause = result.cause || 'The flight ended.';
    return 'failed';
  }

  // Ring passing: the next ring counts when the plane crosses its plane
  // within its radius.
  const mission = state.mission;
  if (state.nextRing < state.rings.length) {
    const ring = state.rings[state.nextRing];
    const dz = plane.z - ring.z;
    if (dz > -6 && dz < 34) {
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      const dist = Math.hypot(dx, dy);
      if (dist < ring.r) {
        ring.passed = true;
        state.ringsDone += 1;
        state.nextRing += 1;
        const pts = CONFIG.scoring.ringPoints;
        state.score += pts;
        setToast(state, `RING ${state.ringsDone}/${state.rings.length}  +${pts}`);
        if (state.nextRing >= state.rings.length) {
          return finishMission(state, plane);
        }
        return 'ring';
      }
    }
    // A ring left far behind unpassed is missed, not retried.
    if (dz > 60 && !ring.passed) {
      ring.missed = true;
      state.nextRing += 1;
      setToast(state, `RING MISSED — ${state.rings.length - state.ringsDone} left`);
      if (state.nextRing >= state.rings.length) {
        return finishMission(state, plane);
      }
    }
  }

  if (result.landed) {
    state.landed = true;
    state.touchdownVs = result.touchdownVs;
    if (mission.id === 'delivery') {
      const soft = Math.max(0, 1 - result.touchdownVs / CONFIG.plane.hardLandingVs);
      const bonus = Math.round(CONFIG.scoring.landingSoftBonus * soft);
      const fuelBonus = Math.round(plane.fuel * CONFIG.scoring.fuelBonusPerPercent);
      state.score += bonus + fuelBonus;
      state.done = true;
      state.objective = 'CRATE DELIVERED';
      setToast(state, `TOUCHDOWN ${result.touchdownVs.toFixed(1)} m/s  +${bonus + fuelBonus}`);
      return 'complete';
    }
    // Other missions: a landing just ends the sortie safely.
    state.done = true;
    state.objective = 'ON THE GROUND — SORTIE OVER';
    return 'landed';
  }

  if (mission.timeLimit > 0 && state.timeLeft <= 0) {
    state.failed = true;
    state.failCause = 'The clock ran out before the last beacon.';
    return 'failed';
  }

  if (plane.fuel <= 0 && !plane.onGround && plane.speed < 12) {
    state.failed = true;
    state.failCause = 'Out of fuel — the engine quit over the valley.';
    return 'failed';
  }

  return null;
}

function finishMission(state, plane) {
  const mission = state.mission;
  if (mission.id === 'rings') {
    const par = 150;
    const under = Math.max(0, par - state.time);
    const timeBonus = Math.round(under * CONFIG.scoring.ringTimeBonus);
    const fuelBonus = Math.round(plane.fuel * CONFIG.scoring.fuelBonusPerPercent);
    state.score += timeBonus + fuelBonus;
    state.objective = 'ALL RINGS THREADED';
    setToast(state, `COURSE CLEAR  +${timeBonus + fuelBonus}`);
  } else if (mission.id === 'rescue') {
    const timeBonus = Math.round(Math.max(0, state.timeLeft) * 10);
    state.score += timeBonus;
    state.objective = 'HIKER FOUND — FLY HOME';
    setToast(state, `BEACONS DONE  +${timeBonus}`);
  }
  state.done = true;
  return 'complete';
}

export function endCardLines(state, plane) {
  const lines = [];
  lines.push(`Mission: ${state.mission.name}`);
  if (state.rings.length) lines.push(`Rings: ${state.ringsDone} of ${state.rings.length}`);
  lines.push(`Flight time: ${state.time.toFixed(1)} s`);
  if (state.touchdownVs !== null) lines.push(`Touchdown: ${state.touchdownVs.toFixed(1)} m/s vertical`);
  lines.push(`Fuel left: ${Math.round(plane.fuel)}%`);
  lines.push(`Damage: ${Math.round(plane.damage)}%`);
  lines.push(`SCORE: ${state.score}`);
  return lines;
}
