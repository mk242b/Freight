import test from 'node:test';
import assert from 'node:assert/strict';
import { Logic } from './extract.mjs';

const WRENCH = Logic.WRENCH;

test('a new hand is empty', () => {
  const hand = Logic.createHand();
  assert.equal(hand.type, null);
  assert.equal(hand.id, null);
  assert.equal(Logic.handLabel(hand), 'Empty');
  assert.equal(Logic.toolIsTaken(hand, WRENCH), false);
});

test('taking the wrench fills the hand', () => {
  const hand = Logic.createHand();
  const result = Logic.takeTool(hand, WRENCH);
  assert.equal(result.ok, true);
  assert.equal(hand.type, 'tool');
  assert.equal(hand.id, WRENCH);
  assert.equal(Logic.toolIsTaken(hand, WRENCH), true);
  assert.equal(Logic.handLabel(hand), 'Wrench');
});

test('a full hand cannot take another tool', () => {
  const hand = Logic.createHand();
  Logic.takeTool(hand, WRENCH);
  const result = Logic.takeTool(hand, 'hammer');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Hands full');
  assert.equal(hand.id, WRENCH);
});

test('returning the wrench empties the hand', () => {
  const hand = Logic.createHand();
  Logic.takeTool(hand, WRENCH);
  const result = Logic.returnTool(hand, WRENCH);
  assert.equal(result.ok, true);
  assert.equal(hand.type, null);
  assert.equal(hand.id, null);
  assert.equal(Logic.handLabel(hand), 'Empty');
});

test('you cannot return a tool you are not holding', () => {
  const hand = Logic.createHand();
  const empty = Logic.returnTool(hand, WRENCH);
  assert.equal(empty.ok, false);
  assert.equal(empty.reason, 'Not holding that tool');

  Logic.takeTool(hand, WRENCH);
  const other = Logic.returnTool(hand, 'hammer');
  assert.equal(other.ok, false);
  assert.equal(other.reason, 'Not holding that tool');
  assert.equal(hand.id, WRENCH);
});

test('handLabel describes carried cargo', () => {
  assert.equal(Logic.handLabel({ type: 'crate', id: 'crate-1' }), 'Crate');
  assert.equal(Logic.handLabel({ type: 'tool', id: WRENCH }), 'Wrench');
});
