/**
 * A script to create vector tiles from generated GeoJSON, using a landsat-api
 * database as the source.
 */
'use strict';

let MongoClient = require('mongodb').MongoClient;
import iron_worker from 'iron_worker';
import { find, matchesProperty } from 'lodash';
import { crossTest, warpArray } from './warp.js';
import { series } from 'async';
import { writeFileSync } from 'fs';
import upload from 'mapbox-upload';
import moment from 'moment';
let Winston = require('winston');
let winston = new (Winston.Logger)({
  transports: [
    new (Winston.transports.Console)({'timestamp': true, colorize: true})
  ]
});

let params = iron_worker.params() || {};

let dbURL = params.dbURL || 'mongodb://localhost/landsat-api';
let groupings = params.groupings || [];
let mapboxToken = params.mapboxToken;

// Set logging level
winston.level = params.logLevel || 'info';

/**
* Zero padding function
*
* @param {string} n The string to be padded
* @param {number} c The length of final string
* @return {string} A zero-padded string
*/
export function zp (n, c) {
  var s = String(n);
  if (s.length < c) {
    return zp(`0${n}`, c);
  } else {
    return s;
  }
}

/**
 * Add scene specific properties to a feature's properties array
 *
 * @param {object} feature The GeoJSON feature to add props to
 * @param {object} doc The Mongo record containing scene information
 * @return {object} feature with added information in properties array
 */
export function addSceneProperties (feature, doc) {
  // Exit if we have an empty object
  if (typeof doc === 'object' && Object.keys(doc).length === 0) {
    return feature;
  }

  winston.verbose(`Adding properties for ${doc.sceneID}`);
  // First, we need to figure out what scene index we're on, so account for
  // pr prop and divide by three unique keys
  let keysLength = Object.keys(feature.properties).length - 1;
  let idx = keysLength / 3;  // Three unique keys for each scene

  // Unique scene information
  feature.properties[`s${idx}`] = `${doc.sceneID.substring(1, 2)}${doc.sceneID.substring(18, 19)}${doc.sceneID.substring(20, 21)}`;

  // Cloud cover
  feature.properties[`c${idx}`] = doc.cloudCoverFull;

  // Date
  // The three digits are from the Landsat 8 ID, day of the year
  feature.properties[`d${idx}`] = Number(doc.sceneID.substring(13, 16));

  return feature;
}

/**
 * The main run loop for the script, this will start up Mongo, grab the data,
 * build the GeoJSON and upload to Mabox for rendering as a vector tile.
 */
export function doTheThing () {
  MongoClient.connect(dbURL, (err, db) => {
    if (err) {
      winston.error(err);
      return process.exit(1);
    }

    winston.info('Connected to the database.');

    // Our landsat collection
    let c = db.collection('landsats');

    // Grab all daytime items given our regex pattern and return the geojson,
    // so that we don't beat the data stores, don't get items for today
    let buildGeoJSON = function (pattern, cb) {
      // Get today's date in YYYY-MM-DD

      let query = {
        $and: [
          {'dayOrNight': 'DAY'},
          {'acquisitionDate': {$lt: moment().format('YYYY-MM-DD')}}
        ]
      };

      // Add regex if we have a pattern
      if (pattern !== 'all') {
        query['$and'].push({'acquisitionDate': {$regex: new RegExp(pattern)}});
      }

      let cursor = c.find(query);
      let count = 0;
      let geojson = {
        type: 'FeatureCollection',
        features: []
      };

      cursor.on('data', (doc) => {
        // Get PR
        let p = zp(doc.path, 3);
        let r = zp(doc.row, 3);
        let pr = `${p},${r}`; // Just because

        // Add to GeoJSON based on PR
        let feature = find(geojson.features, matchesProperty(['properties', 'pr'], pr));
        if (feature) {
          winston.verbose(`We found a matching feature for ${pr}`);

          // Add addition scene specific properties unless this is for all years
          if (pattern !== 'all') {
            feature = addSceneProperties(feature, doc);
          }
        } else {
          winston.verbose(`Adding a new feature for for ${pr}`);

          // Create new base feature
          let feature = {
            'type': 'Feature',
            'geometry': doc.boundingBox,
            'properties': {
              'pr': pr
            }
          };

          // Add addition scene specific properties unless this is for all years
          if (pattern !== 'all') {
            feature = addSceneProperties(feature, doc);
          }

          // Add feature to array
          geojson.features.push(feature);

          // Handle world wrapping
          for (let f of geojson.features) {
            let coordArray = f.geometry.coordinates[0];
            let crosses = crossTest(coordArray);
            if (crosses) {
              f.geometry.coordinates[0] = warpArray(coordArray);
            }
          }

          count++;
          if (count % 1000 === 0) {
            winston.info(`Processed ${count} records.`);
          }
        }
      });
      cursor.once('end', () => {
        winston.verbose('Mongo stream ended');
        cb(geojson);
      });
    };

    // Build up task groups
    let groups = groupings.map((g) => {
      return function (done) {
        winston.info(`Running for grouping ${g.pattern} and uploading to ${g.mapboxID}`);
        buildGeoJSON(g.pattern, (geojson) => {
          // Save it to disk so we can upload to Mapbox, we're already blocked
          // here so just do it sync
          let filename = `${g.mapboxID}.geojson`;
          winston.info(`Saving geojson to disk at ${filename}`);
          writeFileSync(filename, JSON.stringify(geojson));

          // We have the geojson, upload to Mapbox
          winston.info(`Started uploading to ${g.mapboxAccount}.${g.mapboxID}`);
          let progress = upload({
            file: __dirname + `/${filename}`,
            account: g.mapboxAccount,
            accesstoken: mapboxToken,
            mapid: `${g.mapboxAccount}.${g.mapboxID}`
          });

          progress.once('error', (err) => {
            done(err);
          });

          progress.on('progress', (p) => {
            winston.verbose(`Upload progress for ${g.mapboxID}: ${p.percentage}`);
          });

          progress.once('finished', () => {
            winston.info(`Finished uploading to ${g.mapboxID}`);
            done(null);
          });
        });
      };
    });

    // Run in a series
    series(groups, (err, results) => {
      if (err) {
        winston.error('Exiting with an error');
        winston.error(err);
        process.exit(1);
      }

      winston.info('All vectorization processes have finished.');
      process.exit(0);
    });
  });
}
