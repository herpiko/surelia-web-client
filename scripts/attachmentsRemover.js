'use strict'

// This script used to remove expired attachment that stored in surelia db

const fs = require('fs');

const db = JSON.parse(fs.readFileSync(__dirname + '/../api/hapi-mongoose-db-connector.settings.json')).options.mongodbUrl;
const lifetime = process.env.LIFETIME || 36000;

const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const moment = require('moment');
const async = require('async');

console.log(lifetime);
if (mongoose.connection.readyState === 0) {
  mongoose.connect(db);
}
mongoose.connection.once("open", () => {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo);
  mongoose.connection.db.collection('fs.files', (err, collection) => {
    const query = {
      'uploadDate': {$lt : new Date(moment().subtract(lifetime, "seconds")) }
    }
    console.log(query);
    collection.find(query).toArray((err, objs)=> {
      if (err) {
        console.log(err);
        process.exit();
      }
      async.forEach(objs, (obj, cb) => {
        console.log(obj);
        gfs.remove(obj, (err) => {
          cb();
        })
      }, (err) => {
        process.exit();
      })
    })
  });
});

