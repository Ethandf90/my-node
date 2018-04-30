'use strict';

var _config = require('./config/config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_config2.default); // @flow


var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var port = process.env.PORT;

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.status(200).send('it works!!');
});

app.listen(port, function () {
  console.log('Started up on port ' + String(port));
});