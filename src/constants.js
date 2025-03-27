// Game stage display names
export const STAGE_DISPLAY_NAMES = {
  'WAITING_FOR_PLAYERS': 'Waiting for Players',
  'FIGHTER_SELECTION': 'Selecting Fighters',
  'PRE_MATCH_CEREMONY': 'Pre-Match Ceremony',
  'MATCH_IN_PROGRESS': 'Match in Progress',
  'VICTORY_CEREMONY': 'Victory Ceremony',
  'POST_MATCH_COOLDOWN': 'Post-Match Cooldown'
};

// Scene constants
export const RING_RADIUS = 7;
export const RING_HEIGHT = 1.0;
export const FLOOR_SIZE = RING_RADIUS * 5;
export const SQUARE_RING_RADIUS = RING_RADIUS + 0.3;
export const SQUARE_BOTTOM_RADIUS = SQUARE_RING_RADIUS + 0.5;

// Audience seating constants
export const ELEVATION_INCREMENT = 0.8;
export const SEATS_PER_FIRST_ROW = 6;
export const SEATS_INCREMENT = 2;
export const FIRST_ROW_DISTANCE = RING_RADIUS * 1.4;
export const BENCH_WIDTH = 2.0 * RING_RADIUS / SEATS_PER_FIRST_ROW;
export const BENCH_HEIGHT = 0.1;
export const BENCH_DEPTH = BENCH_WIDTH;
export const ROW_SPACING = BENCH_WIDTH;

// Camera constants
export const CAMERA_MOVE_SPEED = 0.5;
export const CAMERA_ROTATE_SPEED = 0.02;
export const FACE_ZOOM_DISTANCE = 1.2;
export const FACE_ZOOM_HEIGHT = 1.0;

// Physics constants
export const FALL_PHYSICS = {
  GRAVITY: 0.015,
  INITIAL_UPWARD_VELOCITY: 0.1,
  ROTATION_SPEED: 0.05,
  FORWARD_MOMENTUM: 0.1,
  BOUNCE_DAMPING: 0.4,
  MIN_BOUNCE_VELOCITY: 0.05
};

// Socket statistics tracking
export const DEFAULT_SOCKET_STATS = {
  connect: 0,
  gameState: 0,
  stageChange: 0,
  playerJoined: 0,
  playerLeft: 0,
  playerMoved: 0,
  playerEmote: 0,
  playerMessage: 0,
  fightersSelected: 0,
  preCeremonyStart: 0,
  sponsorBanner: 0,
  matchStart: 0,
  matchEnd: 0,
  matchDraw: 0,
  newReferee: 0,
  gameStateReset: 0,
  playerRoleChanged: 0
};

// Game state store
class GameState {
  constructor() {
    this.fighters = [];
    this.referee = null;
    this.viewers = [];
    this.myRole = 'viewer';
    this.myId = null;
    this.stage = 'WAITING_FOR_PLAYERS';
    this.stageTimer = null;
    this.stageTimeRemaining = 0;
  }

  update(newState) {
    Object.assign(this, newState);
  }

  findPlayer(id) {
    return this.fighters.find(f => f.id === id) ||
           this.viewers.find(v => v.id === id) ||
           (this.referee?.id === id ? this.referee : null);
  }
}

export const gameState = new GameState(); 