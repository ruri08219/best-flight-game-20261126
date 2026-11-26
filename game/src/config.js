// Ridge Runner — Alpine Courier: every tunable number lives here.
// Units: metres, seconds, degrees. Speeds are shown to the pilot in knots.
export const CONFIG = {
  canvasWidth: 1280,
  canvasHeight: 800,
  horizonY: 380,            // screen y of the horizon when level
  fov: 520,                 // projection focal length (px)
  valleyHalfWidth: 260,     // valley floor half-width in metres
  ridgeHeight: 620,         // tallest ridge height in metres
  groundY: 0,               // valley floor altitude
  runway: {
    z: 4200, x: 0, heading: 0,
    length: 700, width: 46,
    name: "EAGLE'S NEST",
    elevation: 0,
  },
  plane: {
    cruiseSpeed: 62,        // m/s at full throttle, level
    maxSpeed: 95,
    stallSpeed: 26,         // m/s — below this the wing quits
    maxClimb: 14,           // m/s vertical at full power
    rollRate: 95,           // deg/s at full deflection
    pitchRate: 42,          // deg/s
    turnRate: 26,           // deg/s of heading at full bank
    fuelCapacity: 100,      // percent
    fuelBurn: 0.55,         // %/s at full throttle
    fuelBurnIdle: 0.10,     // %/s at idle
    damagePerSecondTerrain: 100,
    hardLandingVs: 6,       // m/s vertical speed that starts hurting
    crashVs: 10,            // m/s vertical speed that breaks the plane
    overspeedBank: 34,      // deg of bank where overspeed stress starts
  },
  wind: {
    baseSpeed: 4,           // m/s from the west in calm air
    gustStrength: 9,        // extra m/s in storm missions
    gustPeriod: 3.1,        // seconds per gust cycle
  },
  missions: {
    rings: {
      id: 'rings', name: 'RING RUN',
      blurb: 'Thread all 8 valley rings. Throttle discipline wins — every ring is a turn.',
      ringCount: 8, ringSpacing: 430, ringStartZ: 700,
      timeLimit: 0, fuelStart: 100,
    },
    delivery: {
      id: 'delivery', name: 'VALLEY DELIVERY',
      blurb: 'Bring the medicine crate down onto Eagle\u2019s Nest strip. Gear down, gentle hands.',
      ringCount: 0, timeLimit: 0, fuelStart: 55,
      startZ: 1200, startY: 260, startSpeed: 48,
    },
    rescue: {
      id: 'rescue', name: 'STORM RESCUE',
      blurb: 'A hiker is stranded at the north hut. Five beacons, 240 seconds, gusting wind.',
      ringCount: 5, ringSpacing: 620, ringStartZ: 900,
      timeLimit: 240, fuelStart: 100, storm: true,
      startZ: 300, startY: 200, startSpeed: 55,
    },
  },
  scoring: {
    ringPoints: 1000,
    ringTimeBonus: 12,       // points per second under par, ring run
    landingSoftBonus: 1500,  // perfect touchdown
    fuelBonusPerPercent: 8,
    crashPenalty: 0,
  },
  colours: {
    skyTop: '#2e5d8f', skyMid: '#7fa8c9', skyLow: '#e8c98f',
    stormTop: '#2b3442', stormMid: '#5a6a7d', stormLow: '#8d97a3',
    duskTop: '#3a3f6e', duskMid: '#c97e5a', duskLow: '#f2b879',
    ridgeFar: '#7d94b0', ridgeMid: '#5b748f', ridgeNear: '#3d556e',
    snow: '#eef3f7', rock: '#6b6259',
    groundFar: '#7d8f6a', groundMid: '#6a7f56', groundNear: '#556b43',
    fieldA: '#8a9a5b', fieldB: '#a8a06a', fieldC: '#5f7d4e',
    river: '#5f93b8', road: '#4a4640',
    runway: '#3c3f45', runwayLine: '#f2f2e8',
    ringNext: '#ffd23e', ringDone: '#58d68d', ringMissed: '#e74c3c',
    hudGreen: '#7dffb0', hudAmber: '#ffcf4d', hudRed: '#ff5a4d', hudCyan: '#8fe8ff',
    panel: 'rgba(8, 18, 30, 0.62)', panelEdge: 'rgba(140, 220, 255, 0.55)',
  },
};
