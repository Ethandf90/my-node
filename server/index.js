// @flow

import cors from 'cors';
import morgan from 'morgan';

require('./config/config');
// require('./db/db');

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT;

// middleware

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined')); // production env
}
app.use(cors());
app.use(bodyParser.json());

// routes

app.get('/', (req, res) => {
  res.status(200).send('it works!!');
});

app.listen(port, () => {
  console.log(`Started up on port ${String(port)}`);
});
