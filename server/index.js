// @flow
import config from './config/config';

console.log(config);

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).send('it works!!');
});

app.listen(port, () => {
  console.log(`Started up on port ${String(port)}`);
});
