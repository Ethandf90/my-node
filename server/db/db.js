// @flow

import pg from 'pg';
import Q from 'q';

import type { RouteResponseType } from '../wrap';

// create a config to configure both pooling behavior
// and client options
// note: all config is optional and the environment variables
// will be read if the config is not present
const config = {
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  ssl: true,
};

// Type casting to get Numbers out of PG
const castToNumber = col => Number(col);

pg.types.setTypeParser(1700 /* OID for NUMERIC data type in Postgres */, castToNumber);
pg.types.setTypeParser(700 /* OID for FLOAT4 data type in Postgres */, castToNumber);
pg.types.setTypeParser(701 /* OID for FLOAT8 data type in Postgres */, castToNumber);
pg.types.setTypeParser(20 /* OID for INT8 data type in Postgres */, castToNumber);
pg.types.setTypeParser(21 /* OID for INT2 data type in Postgres */, castToNumber);
pg.types.setTypeParser(23 /* OID for INT4 data type in Postgres */, castToNumber);

const pool = new pg.Pool(config);

type QueryArg = string | number | null;

const pgQuery = (q: string, replace?: [QueryArg]): Promise<*> =>
  Q.Promise((resolve, reject) => {
    pool.query(q, replace, (err, results) => {
      if (err) {
        reject(err);
        return;
      }
      if (results.rows) {
        resolve(results.rows);
        return;
      }
      resolve(results);
    });
  });

const poolConnect = () =>
  Q.Promise((resolve, reject) => {
    pool.connect((err, client, done) => {
      if (err) {
        reject(err);
        return;
      }
      resolve([client, done]);
    });
  });

export type QueryFunction = (query: string, args?: [QueryArg]) => Promise<Array<any>>;

type TransactionCommitType = {
  transaction: 'commit',
  response: RouteResponseType,
};

type TransactionRollbackType = {
  transaction: 'rollback',
  response: RouteResponseType,
};

type TransactionResponseType = TransactionCommitType | TransactionRollbackType;

type TransactionFunctionType = (fn: QueryFunction) => Promise<TransactionResponseType>;

async function transaction(fn: TransactionFunctionType): Promise<RouteResponseType> {
  const [client, done] = await poolConnect();

  const query = async (queryStr: string, args?: [QueryArg]): Promise<Array<any>> =>
    Q.Promise((resolve, reject) => {
      client.query(queryStr, args, (err, results) => {
        if (err) {
          reject(err);
          return;
        }
        if (results.rows) {
          resolve(results.rows);
          return;
        }
        resolve(results);
      });
    });

  await query('BEGIN');

  try {
    const res: TransactionResponseType = await fn(query);

    if (res.transaction === 'commit') {
      await query('COMMIT');
    } else {
      await query('ROLLBACK');
    }

    done();

    return res.response;
  } catch (e) {
    await query('ROLLBACK');

    done();

    throw e;
  }
}

const commit = (res: RouteResponseType): TransactionCommitType => ({
  response: res,
  transaction: 'commit',
});

const rollback = (res: RouteResponseType): TransactionRollbackType => ({
  response: res,
  transaction: 'rollback',
});

export { pgQuery, transaction, commit, rollback };
