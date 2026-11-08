import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openGolfHoles, openGolfSaveKey, parseOpenGolfProgress} from '../src/features/games/open-golf/state/open-golf-progress';

const save = (storage: unknown) => JSON.stringify({schemaVersion: 1, stores: {'open-golf.storage': JSON.stringify(storage)}, resultIds: []});

test('lobby progress reads the engine storage carried in the bundle save', () => {
  const progress = parseOpenGolfProgress(save({seen_tutorial_0: 1, stroke_count_level_0: 2, stroke_count_level_1: 1, stroke_count_level_2: 4}));
  assert.equal(progress.bests.length, openGolfHoles);
  assert.deepEqual(progress.bests.slice(0, 4), [2, 1, 4, null]);
  assert.equal(progress.cleared, 3);
  assert.equal(progress.total, 7);
  assert.equal(progress.aces, 1);
  assert.equal(progress.next, 3);
});

test('a missing, foreign or corrupt save is a fresh course', () => {
  for (const raw of [null, '', '{', JSON.stringify({schemaVersion: 2, stores: {}}), JSON.stringify({schemaVersion: 1, stores: {'open-golf.storage': '{nope'}})]) {
    const progress = parseOpenGolfProgress(raw);
    assert.equal(progress.cleared, 0);
    assert.equal(progress.next, 0);
  }
});

test('invalid stroke values are ignored and a full card has no next hole', () => {
  assert.equal(parseOpenGolfProgress(save({stroke_count_level_0: 0, stroke_count_level_1: 'x', stroke_count_level_2: -3})).cleared, 0);
  const full = parseOpenGolfProgress(save(Object.fromEntries(Array.from({length: openGolfHoles}, (_, hole) => [`stroke_count_level_${hole}`, 3]))));
  assert.equal(full.cleared, openGolfHoles);
  assert.equal(full.next, null);
});

test('the save key matches the account-scoped bundle save', () => {
  assert.equal(openGolfSaveKey(null), 'statoz.games.web.bundle.open-golf.guest');
  assert.equal(openGolfSaveKey('a+b@example.com'), 'statoz.games.web.bundle.open-golf.a%2Bb%40example.com');
});
