import test from 'node:test';
import assert from 'node:assert/strict';
import { Logic } from './extract.mjs';

const board = Logic.buildStarterBoard();
const objects = Logic.starterObjects();

function countCells(predicate) {
  let total = 0;
  for (let y = 0; y < Logic.ROWS; y++) {
    for (let x = 0; x < Logic.COLS; x++) {
      if (predicate(x, y)) total++;
    }
  }
  return total;
}

function step(player, dx, dy, times) {
  for (let i = 0; i < times; i++) {
    Logic.moveWithCollision(board, objects, player, dx, dy, Logic.PLAYER_RADIUS);
  }
}

test('starter board has the documented cell counts', () => {
  const floor = countCells((x, y) => board[y][x] === Logic.T_FLOOR);
  const objectCells = countCells((x, y) => Logic.objectAt(objects, x, y) !== null);
  const usable = countCells((x, y) => {
    if (board[y][x] !== Logic.T_FLOOR) return false;
    if (Logic.objectAt(objects, x, y)) return false;
    return !Logic.RESERVED.some((cell) => cell.x === x && cell.y === y);
  });

  assert.equal(floor, 28);
  assert.equal(objectCells, 6);
  assert.equal(Logic.RESERVED.length, 3);
  assert.equal(usable, 19);
});

test('the three reserved cells are floor and free of objects', () => {
  for (const cell of Logic.RESERVED) {
    assert.equal(board[cell.y][cell.x], Logic.T_FLOOR);
    assert.equal(Logic.objectAt(objects, cell.x, cell.y), null);
  }
});

test('every object stands on floor cells', () => {
  for (const object of objects) {
    for (let y = object.y; y < object.y + object.h; y++) {
      for (let x = object.x; x < object.x + object.w; x++) {
        assert.equal(board[y][x], Logic.T_FLOOR, `${object.id} covers non-floor cell ${x},${y}`);
      }
    }
  }
});

test('solidity matches the tile and object layout', () => {
  assert.equal(Logic.isSolidCell(board, objects, 0, 0), true);
  assert.equal(Logic.isSolidCell(board, objects, 1, 1), false);
  assert.equal(Logic.isSolidCell(board, objects, 2, 3), false);
  assert.equal(Logic.isSolidCell(board, objects, 6, 1), true);
  assert.equal(Logic.isSolidCell(board, objects, 7, 2), true);
  assert.equal(Logic.isSolidCell(board, objects, 7, 4), true);
  assert.equal(Logic.isSolidCell(board, objects, 2, 4), true);
  assert.equal(Logic.isSolidCell(board, objects, 0, 2), true);
  assert.equal(Logic.isSolidCell(board, objects, 0, 4), true);
  assert.equal(Logic.isSolidCell(board, objects, 16, 7), true);
  assert.equal(Logic.isSolidCell(board, objects, -1, 3), true);
});

test('the player spawns in a free cell', () => {
  const player = Logic.starterPlayer();
  assert.equal(Logic.collidesAt(board, objects, player.x, player.y, Logic.PLAYER_RADIUS), false);
});

test('facing picks the adjacent tile in all four directions', () => {
  const player = { x: 2.5, y: 3.5, facing: Logic.DOWN };
  function assertTarget(facing, x, y) {
    player.facing = facing;
    const target = Logic.targetCell(player);
    assert.equal(target.x, x);
    assert.equal(target.y, y);
  }
  assertTarget(Logic.DOWN, 2, 4);
  assertTarget(Logic.UP, 2, 2);
  assertTarget(Logic.RIGHT, 3, 3);
  assertTarget(Logic.LEFT, 1, 3);
});

test('tile names identify objects and terrain', () => {
  assert.equal(Logic.tileName(board, objects, 1, 1), 'Floor');
  assert.equal(Logic.tileName(board, objects, 6, 1), 'Engine');
  assert.equal(Logic.tileName(board, objects, 7, 4), 'Pilot Console');
  assert.equal(Logic.tileName(board, objects, 2, 4), 'Wrench Bench');
  assert.equal(Logic.tileName(board, objects, 0, 2), 'Ramp');
  assert.equal(Logic.tileName(board, objects, 0, 4), 'Side door');
  assert.equal(Logic.tileName(board, objects, 16, 7), 'Space');
});

test('movement stops against the engine instead of passing through it', () => {
  const player = { x: 5.5, y: 1.5, facing: Logic.RIGHT };
  step(player, 0.05, 0, 40);
  assert.ok(player.x < 6);
  assert.ok(Math.abs(player.x - (6 - Logic.PLAYER_RADIUS)) < 1e-6);
});

test('large steps never tunnel through a solid object', () => {
  const player = { x: 2.5, y: 1.5, facing: Logic.RIGHT };
  step(player, 0.22, 0, 100);
  assert.ok(player.x <= 6 - Logic.PLAYER_RADIUS + 1e-6);
});

test('the player slides along a wall when blocked on one axis', () => {
  const player = { x: 2.5, y: 1.5, facing: Logic.UP };
  step(player, 0, -0.05, 20);
  const restingY = player.y;
  assert.ok(Math.abs(restingY - (1 + Logic.PLAYER_RADIUS)) < 1e-6);

  const startX = player.x;
  step(player, 0.05, 0, 6);
  assert.ok(player.x > startX);
  assert.ok(Math.abs(player.y - restingY) < 1e-9);
  assert.equal(Logic.collidesAt(board, objects, player.x, player.y, Logic.PLAYER_RADIUS), false);
});

test('the bottom wall blocks downward movement', () => {
  const player = { x: 3.5, y: 4.0, facing: Logic.DOWN };
  step(player, 0, 0.05, 20);
  assert.ok(Math.abs(player.y - (5 - Logic.PLAYER_RADIUS)) < 1e-6);
});

test('health colors follow the documented thresholds', () => {
  assert.equal(Logic.healthColor(100), '#6fcf7c');
  assert.equal(Logic.healthColor(60.1), '#6fcf7c');
  assert.equal(Logic.healthColor(60), '#f2a93b');
  assert.equal(Logic.healthColor(30), '#f2a93b');
  assert.equal(Logic.healthColor(29.9), '#e5533d');
});
