'use strict';

// @flow

var env = process.env.NODE_ENV || 'development';
var config = require('./config.json');

if (env === 'development' || env === 'test') {
  var envConfig = config[env];

  Object.keys(envConfig).forEach(function (key) {
    process.env[key] = envConfig[key];
  });
}