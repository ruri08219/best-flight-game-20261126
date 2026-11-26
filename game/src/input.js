// Ridge Runner: keyboard and mouse. The stick is the arrow keys, W/S move
// the throttle, and the HUD buttons answer the mouse: throttle slider,
// gear, flaps, pause and the title-screen mission cards.
export function makeInput(canvas) {
  const keys = new Set();
  const input = {
    roll: 0, pitch: 0, throttleDelta: 0,
    pressed: new Set(),   // edge-triggered keys, consumed by main.js
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
  };

  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right',
    ArrowUp: 'up', ArrowDown: 'down',
    KeyW: 'throttleUp', KeyS: 'throttleDown',
    Space: 'brake',
    KeyG: 'gear', KeyF: 'flaps', KeyP: 'pause',
    KeyR: 'restart', KeyT: 'title',
    KeyL: 'sound',
    Digit1: 'mission1', Digit2: 'mission2', Digit3: 'mission3',
  };

  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    e.preventDefault();
    if (!keys.has(name)) input.pressed.add(name);
    keys.add(name);
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) keys.delete(name);
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.clickX = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouse.clickY = ((e.clientY - r.top) / r.height) * canvas.height;
    input.mouse.clicked = true;
  });

  // Recompute the analog deflections from the held keys each frame.
  input.poll = function () {
    input.roll = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    input.pitch = (keys.has('up') ? -1 : 0) + (keys.has('down') ? 1 : 0);
    input.throttleDelta = (keys.has('throttleUp') ? 0.55 : 0)
      - (keys.has('throttleDown') ? 0.55 : 0);
    if (keys.has('brake')) input.throttleDelta -= 0.9;
  };

  input.consumeClick = function () {
    if (!input.mouse.clicked) return null;
    input.mouse.clicked = false;
    return { x: input.mouse.clickX, y: input.mouse.clickY };
  };

  input.wasPressed = function (name) {
    if (!input.pressed.has(name)) return false;
    input.pressed.delete(name);
    return true;
  };

  input.clearPressed = function () { input.pressed.clear(); };
  return input;
}

// Hit test for the title screen's three mission cards (same geometry as hud.js).
export function titleClick(click, canvasWidth) {
  if (!click) return null;
  const W = canvasWidth;
  let y = 320;
  const ids = ['rings', 'delivery', 'rescue'];
  for (let i = 0; i < 3; i++) {
    if (click.x >= W / 2 - 300 && click.x <= W / 2 + 300 && click.y >= y && click.y <= y + 62) {
      return ids[i];
    }
    y += 76;
  }
  return null;
}
