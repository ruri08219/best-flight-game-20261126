// Ridge Runner — Alpine Courier: the game loop and the screens. Title,
// flying, paused, crashed and complete. The loop runs on requestAnimationFrame
// at a fixed 60 Hz simulation step so the flight model is deterministic.
import { CONFIG } from './config.js';
import { makeAudio } from './audio.js';
import { makeInput, titleClick } from './input.js';
import { currentWind, makePlane, stepFlight } from './physics.js';
import { endCardLines, makeMissionState, updateMission } from './missions.js';
import { makeClouds } from './terrain.js';
import { renderFrame } from './render.js';
import { buildShot, parseShotParams } from './shots.js';
import { drawEndCard, drawTitle } from './hud.js';
import { clamp } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  screen: 'title',           // title | playing | paused | crashed | complete
  plane: null,
  mission: null,
  clouds: makeClouds(1, 14),
  time: 0,
  wind: { x: 0, z: 0 },
  stalled: false,
  audioOn: true,
  audio: makeAudio(),
  shot: null,
  shotFrames: 0,
  mood: 'day',
  crashCause: '',
  frames: 0,
};

const input = makeInput(canvas);

function startMission(id) {
  game.mission = makeMissionState(id);
  game.plane = makePlane(game.mission.mission);
  game.screen = 'playing';
  game.time = 0;
  game.crashCause = '';
  input.clearPressed();
}

function startShotMode(shot, seed) {
  const staged = buildShot(shot, seed);
  if (!staged) return false;
  game.plane = staged.plane;
  game.mission = staged.mission;
  game.clouds = staged.clouds;
  game.mood = staged.mood;
  game.shot = shot;
  game.shotFrames = 0;
  game.screen = staged.endCard ? 'complete' : 'playing';
  game.time = 0;
  return true;
}

function update(dt) {
  game.time += dt;
  const mission = game.mission;
  const plane = game.plane;
  const storm = mission.mission.id === 'rescue';
  game.wind = currentWind(game.time, storm);

  input.poll();
  if (input.wasPressed('pause')) {
    game.screen = game.screen === 'playing' ? 'paused' : 'playing';
    return;
  }
  if (input.wasPressed('restart')) { startMission(mission.mission.id); return; }
  if (input.wasPressed('title')) { game.screen = 'title'; return; }
  if (input.wasPressed('sound')) {
    game.audioOn = !game.audioOn;
    game.audio.setEnabled(game.audioOn);
  }
  if (input.wasPressed('gear')) plane.gearDown = !plane.gearDown;
  if (input.wasPressed('flaps')) plane.flaps = !plane.flaps;

  // Mouse: throttle slider under the speed tape, gear/flaps lamps.
  const click = input.consumeClick();
  if (click) {
    if (click.x >= 16 && click.x <= 102 && click.y >= 470 && click.y <= 496) {
      plane.throttle = clamp((click.x - 20) / 78, 0, 1);
    }
  }

  const result = stepFlight(plane, input, game.wind, dt, mission.mission);
  game.stalled = !!result.stalled;
  const event = updateMission(mission, plane, result, dt);
  if (event === 'ring') game.audio.ring();
  if (event === 'complete') {
    game.screen = 'complete';
    game.audio.fanfare();
  }
  if (event === 'landed') {
    game.audio.touchdown();
    game.screen = 'complete';
  }
  if (event === 'failed') {
    game.screen = 'crashed';
    game.crashCause = mission.failCause;
    game.audio.crash();
  }
  if (game.stalled && Math.floor(game.time * 2) !== Math.floor((game.time - dt) * 2)) {
    game.audio.warn();
  }
  game.audio.update(plane.throttle, plane.speed * 1.94384, plane.onGround);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = 1 / 60;
  game.frames += 1;

  if (game.screen === 'title') {
    // Idle valley behind the title: slow drift through the clouds.
    game.time += dt;
    const click = input.consumeClick();
    const picked = titleClick(click, CONFIG.canvasWidth);
    if (picked) { game.audio.ensure(); startMission(picked); return; }
    if (input.wasPressed('mission1')) { game.audio.ensure(); startMission('rings'); return; }
    if (input.wasPressed('mission2')) { game.audio.ensure(); startMission('delivery'); return; }
    if (input.wasPressed('mission3')) { game.audio.ensure(); startMission('rescue'); return; }
    renderFrame(ctx, {
      ...game,
      plane: game.plane || makePlane(CONFIG.missions.rings),
      mission: game.mission || makeMissionState('rings'),
    });
    drawTitle(ctx, game.time);
    return;
  }

  if (game.screen === 'paused') {
    renderFrame(ctx, game);
    ctx.fillStyle = 'rgba(6, 14, 26, 0.55)';
    ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    return;
  }

  if (game.screen === 'crashed') {
    renderFrame(ctx, game);
    drawEndCard(ctx, 'FLIGHT OVER', [game.crashCause, `Score: ${game.mission.score}`], '#ff5a4d');
    if (input.wasPressed('restart')) startMission(game.mission.mission.id);
    if (input.wasPressed('title')) game.screen = 'title';
    return;
  }

  if (game.screen === 'complete') {
    renderFrame(ctx, game);
    drawEndCard(ctx, game.mission.landed ? 'DELIVERY COMPLETE' : 'MISSION COMPLETE',
      endCardLines(game.mission, game.plane), '#7dffb0');
    if (input.wasPressed('restart')) startMission(game.mission.mission.id);
    if (input.wasPressed('title')) game.screen = 'title';
    return;
  }

  // Playing. In shot mode, run a fixed number of steps then freeze the frame.
  if (game.shot) {
    if (game.shotFrames < 40) {
      game.shotFrames += 1;
      update(dt);
    }
    renderFrame(ctx, game);
    return;
  }
  update(dt);
  renderFrame(ctx, game);
}

// Boot: a ?shot=N parameter stages a frozen screenshot moment; otherwise the
// title screen waits for the player.
const { shot, seed } = parseShotParams();
if (shot >= 1 && shot <= 4) {
  startShotMode(shot, seed);
}
canvas.addEventListener('pointerdown', () => game.audio.ensure(), { once: true });
window.addEventListener('keydown', () => game.audio.ensure(), { once: true });
requestAnimationFrame(frame);
