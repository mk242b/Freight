import test from 'node:test';
import assert from 'node:assert/strict';
import { Logic } from './extract.mjs';

const board = Logic.buildStarterBoard();
const objects = Logic.starterObjects();
const spawn = Logic.starterPlayer();

function crate(id, x, y) {
  return { id, x, y };
}

test('dock constants match the rendered view', () => {
  assert.equal(Logic.DOCK_MARGIN, 96);
  assert.equal(Logic.VIEW_WIDTH, Logic.WIDTH + Logic.DOCK_MARGIN);
  assert.equal(Logic.VIEW_WIDTH, 1048);
  assert.equal(Logic.MISSION_CRATES, 4);
});

test('the empty starter hold is fully reachable', () => {
  const report = Logic.reachabilityReport(board, objects, []);
  assert.equal(report.ok, true);
  assert.equal(report.reason, '');
});

test('a crate may be placed on a free floor cell', () => {
  const check = Logic.canPlaceCrate(board, objects, [], spawn, 3, 3);
  assert.equal(check.ok, true);
  assert.equal(check.reason, '');
});

test('placement rejects out-of-bounds, non-floor, reserved and occupied cells', () => {
  assert.equal(Logic.canPlaceCrate(board, objects, [], spawn, 17, 3).reason, 'Out of bounds');
  assert.equal(Logic.canPlaceCrate(board, objects, [], spawn, -1, 3).reason, 'Out of bounds');
  assert.equal(Logic.canPlaceCrate(board, objects, [], spawn, 0, 0).reason, 'No floor here');
  assert.equal(Logic.canPlaceCrate(board, objects, [], spawn, 0, 2).reason, 'No floor here');

  const reserved = Logic.canPlaceCrate(board, objects, [], spawn, 1, 2);
  assert.equal(reserved.ok, false);
  assert.equal(reserved.reason, 'Keep the ramp access clear');

  const engine = Logic.canPlaceCrate(board, objects, [], spawn, 6, 1);
  assert.equal(engine.ok, false);
  assert.equal(engine.reason, 'Occupied by Engine');

  const crates = [crate('c1', 4, 3)];
  const taken = Logic.canPlaceCrate(board, objects, crates, spawn, 4, 3);
  assert.equal(taken.ok, false);
  assert.equal(taken.reason, 'Crate already here');
});

test('placement rejects a cell under the player', () => {
  const check = Logic.canPlaceCrate(board, objects, [], spawn, 2, 3);
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'Too close to you');
});

test('the ghost jumps one tile forward when the adjacent floor is too close', () => {
  const player = { x: 2.8, y: 3.5, facing: Logic.RIGHT };
  const anchor = Logic.placementAnchor(board, objects, [], player);
  assert.equal(anchor.x, 4);
  assert.equal(anchor.y, 3);
  assert.equal(anchor.jumped, true);
  assert.equal(anchor.check.ok, true);

  const nearby = { x: 2.2, y: 3.5, facing: Logic.RIGHT };
  const adjacent = Logic.placementAnchor(board, objects, [], nearby);
  assert.equal(adjacent.x, 3);
  assert.equal(adjacent.jumped, false);
  assert.equal(adjacent.check.ok, true);
});

test('the ghost does not jump when the adjacent tile is not free floor', () => {
  const player = { x: 2.8, y: 3.5, facing: Logic.RIGHT };
  const crates = [crate('c1', 3, 3)];
  const anchor = Logic.placementAnchor(board, objects, crates, player);
  assert.equal(anchor.x, 3);
  assert.equal(anchor.jumped, false);
  assert.equal(anchor.check.ok, false);
  assert.equal(anchor.check.reason, 'Crate already here');

  const wall = { x: 4.5, y: 4.5, facing: Logic.DOWN };
  const wallAnchor = Logic.placementAnchor(board, objects, [], wall);
  assert.equal(wallAnchor.jumped, false);
  assert.equal(wallAnchor.check.reason, 'No floor here');
});

test('the ghost anchor respects reachability when it jumps', () => {
  const player = { x: 2.8, y: 3.5, facing: Logic.RIGHT };
  const crates = [crate('c1', 4, 3)];
  const anchor = Logic.placementAnchor(board, objects, crates, player);
  assert.equal(anchor.x, 4);
  assert.equal(anchor.jumped, true);
  assert.equal(anchor.check.ok, false);
  assert.equal(anchor.check.reason, 'Crate already here');
});

test('carrying a small crate uses the slower movement speed', () => {
  assert.equal(Logic.CARRY_SPEED, 3.8);
  assert.ok(Logic.CARRY_SPEED < Logic.PLAYER_SPEED);
});

test('placement that seals the engine is rejected', () => {
  const crates = [crate('c1', 5, 1), crate('c2', 5, 2), crate('c3', 6, 3)];
  const far = { x: 2.5, y: 3.5, facing: Logic.DOWN };
  const check = Logic.canPlaceCrate(board, objects, crates, far, 7, 3);
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'Would block access: Engine');
  assert.equal(Logic.reachabilityReport(board, objects, crates, crate('c4', 7, 3)).ok, false);
});

test('a crate that splits the hold is rejected', () => {
  const custom = Array.from({ length: Logic.ROWS }, () => new Array(Logic.COLS).fill(Logic.T_VOID));
  custom[0][1] = Logic.T_FLOOR;
  custom[1][1] = Logic.T_FLOOR;
  for (const cell of Logic.RESERVED) custom[cell.y][cell.x] = Logic.T_FLOOR;

  assert.equal(Logic.reachabilityReport(custom, [], []).ok, true);

  const far = { x: 5.5, y: 5.5, facing: Logic.DOWN };
  const check = Logic.canPlaceCrate(custom, [], [], far, 1, 1);
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'Would cut the hold in two');
});

test('crates are solid for collision and block movement', () => {
  const crates = [crate('c1', 3, 3)];
  assert.equal(Logic.isSolidCell(board, objects, 3, 3, crates), true);
  assert.equal(Logic.isSolidCell(board, objects, 3, 3, []), false);
  assert.equal(Logic.collidesAt(board, objects, 3.5, 3.5, Logic.PLAYER_RADIUS, crates), true);
  assert.equal(Logic.collidesAt(board, objects, 2.5, 3.5, Logic.PLAYER_RADIUS, crates), false);

  const player = { x: 2.5, y: 3.5, facing: Logic.RIGHT };
  for (let i = 0; i < 20; i++) {
    Logic.moveWithCollision(board, objects, player, 0.5, 0, Logic.PLAYER_RADIUS, crates);
  }
  assert.ok(player.x <= 3 - Logic.PLAYER_RADIUS + 1e-9, `player slid into crate at x=${player.x}`);
});

test('addCrate, crateAt and removeCrateAt keep the list consistent', () => {
  const crates = [];
  const added = Logic.addCrate(crates, 'c1', 4, 2);
  assert.equal(crates.length, 1);
  assert.equal(added.id, 'c1');
  assert.equal(Logic.crateAt(crates, 4, 2).id, 'c1');
  assert.equal(Logic.crateAt(crates, 4, 3), null);

  const removed = Logic.removeCrateAt(crates, 4, 2);
  assert.equal(removed.id, 'c1');
  assert.equal(crates.length, 0);
  assert.equal(Logic.removeCrateAt(crates, 4, 2), null);
});

test('isFreeFloor accounts for terrain, objects, reserved and crates', () => {
  assert.equal(Logic.isFreeFloor(board, objects, [], 3, 3), true);
  assert.equal(Logic.isFreeFloor(board, objects, [], 0, 0), false);
  assert.equal(Logic.isFreeFloor(board, objects, [], 6, 1), false);
  assert.equal(Logic.isFreeFloor(board, objects, [], 1, 2), true);
  assert.equal(Logic.isFreeFloor(board, objects, [crate('c1', 3, 3)], 3, 3), false);
});

test('describeInteraction reports the relevant action for every target', () => {
  const empty = Logic.createHand();
  const wrench = { type: 'tool', id: 'wrench' };
  const carrying = { type: 'crate', id: 'crate-1' };

  const atBench = { x: 2.5, y: 3.5, facing: Logic.DOWN };
  assert.equal(Logic.describeInteraction(board, objects, [], atBench, empty, 4).kind, 'take-tool');
  assert.equal(Logic.describeInteraction(board, objects, [], atBench, wrench, 4).kind, 'return-tool');
  assert.equal(Logic.describeInteraction(board, objects, [], atBench, carrying, 4).kind, 'none');

  const atEngine = { x: 5.5, y: 1.5, facing: Logic.RIGHT };
  assert.equal(Logic.describeInteraction(board, objects, [], atEngine, wrench, 4).kind, 'repair');
  assert.equal(Logic.describeInteraction(board, objects, [], atEngine, empty, 4).kind, 'none');

  const atConsole = { x: 7.5, y: 3.5, facing: Logic.DOWN };
  assert.equal(Logic.describeInteraction(board, objects, [], atConsole, empty, 4).kind, 'launch');

  const atRamp = { x: 1.5, y: 2.5, facing: Logic.LEFT };
  assert.equal(Logic.describeInteraction(board, objects, [], atRamp, empty, 4).kind, 'take-crate');
  assert.equal(Logic.describeInteraction(board, objects, [], atRamp, carrying, 4).kind, 'return-crate');
  assert.equal(Logic.describeInteraction(board, objects, [], atRamp, empty, 0).kind, 'none');

  const crates = [crate('c1', 3, 3)];
  const atCrate = { x: 2.5, y: 3.5, facing: Logic.RIGHT };
  assert.equal(Logic.describeInteraction(board, objects, crates, atCrate, empty, 4).kind, 'pick-crate');
  assert.equal(Logic.describeInteraction(board, objects, crates, atCrate, wrench, 4).kind, 'none');

  assert.equal(Logic.describeInteraction(board, objects, [], atCrate, carrying, 4).kind, 'place-crate');
  assert.equal(Logic.describeInteraction(board, objects, [], { x: 2.5, y: 3.5, facing: Logic.LEFT }, carrying, 4).kind, 'none');

  const nearFloor = { x: 2.8, y: 3.5, facing: Logic.RIGHT };
  assert.equal(Logic.describeInteraction(board, objects, [], nearFloor, carrying, 4).kind, 'place-crate');
  const blockedJump = Logic.describeInteraction(board, objects, [crate('c1', 4, 3)], nearFloor, carrying, 4);
  assert.equal(blockedJump.kind, 'none');
  assert.equal(blockedJump.label, 'Crate already here');
});
