// @flow

import { pgQuery } from './db/db';
import status from '../shared/status'; // Todo: make local dependency

interface RouteSuccessType {
  type: 'success';
  object: any;
}

interface RouteErrorType {
  type: 'error';
  message: string;
  details?: Object;
  status_code: number;
}

export type RouteResponseType = RouteSuccessType | RouteErrorType;

type RouteOptionsType = {
  noCache: ?boolean,
};

type WrapFunctionType = (body: any, params: Object) => Promise<RouteResponseType>;

type AuthFunctionType = (user: User, body: any, params: Object) => Promise<RouteResponseType>;

const writeRouteResponse = (
  res: any,
  prom: Promise<RouteResponseType>,
  options: ?RouteOptionsType,
) => {
  prom
    .then((r: RouteResponseType) => {
      if (options && options.noCache) {
        res.append('Cache', 'no-cache');
      }

      if (r.type === 'success') {
        res.status(200).json(r.object);
        return;
      }

      if (r.type === 'error') {
        console.log('error', r);

        res.status(r.status_code).json({
          message: r.message,
          details: r.details,
          status_code: r.status_code,
        });
        return;
      }

      throw r;
    })
    .catch((r) => {
      console.log('error', r);

      res.status((r && r.status_code) || 500).json({
        message: r && r.message,
        details: r && r.details,
        status_code: r.status_code || 500,
      });
    });
};

// Wrap, with no authentication
export const openWrap = (fn: WrapFunctionType) => (req: any, res: any) => {
  const params = req.params || {};

  for (const f in req.query) {
    if (!params.hasOwnProperty(f) && req.query.hasOwnProperty(f)) {
      params[f] = req.query[f];
    }
  }

  writeRouteResponse(
    res,
    fn(req.body, params, {
      ip: req.ip,
      headers: req.headers,
      file: req.file,
    }),
  );
};

export const authWrap = (fn: AuthFunctionType, options: ?Object) => (req: any, res: any) => {
  // const params = req.params;

  // for (const f in req.query) {
  //   if (!params.hasOwnProperty(f) && req.query.hasOwnProperty(f)) {
  //     params[f] = req.query[f];
  //   }
  // }

  // We expect a session token that is in the header
  const route = async () => {
    const [user] = await pgQuery(
      `SELECT users.* FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = $1 AND sessions.deleted IS NULL`,
      [req.headers['session-id']],
    );

    if (!user) {
      return {
        type: 'error',
        status_code: status.UNAUTHORIZED,
        message: 'Unauthorized',
      };
    }

    return fn(user, req.body, params, {
      ip: req.ip,
      headers: req.headers,
      file: req.file,
    });
  };

  writeRouteResponse(res, route(), options);
};
