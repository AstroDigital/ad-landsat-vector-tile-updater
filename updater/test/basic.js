'use strict';

let test = require('tape');
import { zp, addSceneProperties } from '../updater';

test('Test zero padding', (t) => {
  t.equal(zp('a', 3), '00a');
  t.equal(zp('aa', 3), '0aa');
  t.equal(zp('aaa', 3), 'aaa');
  t.equal(zp('a', 1), 'a');
  t.end();
});

test('Scene properties', (t) => {
  let addFeature = {
    'foo': 'bar',
    'grr': 'arg',
    'sceneID': 'LC81080342015001LGN00',
    'cloudCoverFull': 10
  };

  // Test case where nothing should be added
  t.test('Adding no properties', (t) => {
    let feature = {
      'type': 'Feature',
      'geometry': {},
      'properties': {
        'pr': '123'
      }
    };
    t.same(addSceneProperties(feature, {}), feature);
    t.end();
  });

  // Test case where we are adding properties
  t.test('Adding properties', (t) => {
    let feature = {
      'type': 'Feature',
      'geometry': {},
      'properties': {
        'pr': '123'
      }
    };
    let expected = {pr: '123', s0: 'CN0', c0: 10, d0: 1};
    t.same(addSceneProperties(feature, addFeature).properties, expected);
    t.end();
  });

  // Test multiple indexes
  t.test('Adding properties', (t) => {
    let feature = {
      'type': 'Feature',
      'geometry': {},
      'properties': {
        'pr': '123'
      }
    };
    feature = addSceneProperties(feature, addFeature);
    let expected = {pr: '123', s0: 'CN0', c0: 10, d0: 1, s1: 'CN0', c1: 10, d1: 1};
    t.same(addSceneProperties(feature, addFeature).properties, expected);
    t.end();
  });
});
