import { IncomingMessage, ServerResponse } from "node:http";
import { Writable } from "node:stream";

import { EndptsRequest } from "./request.js";

import type { Logger } from "../logger.js";
import type { Route } from "../types.js";

export class Router {
  private readonly logger: Logger;
  private readonly routes: Route[];

  constructor(logger: Logger, routes: Route[]) {
    this.logger = logger;
    this.routes = routes;
  }

  handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    this.logger.request(req);

    let path = "";

    try {
      path = new URL(req.url!, `http://${req.headers.host}`).pathname;
    } catch (e) {
      this.logger.error("Failed to parse URL", e);
      res.statusCode = 500;
      res.end();
      return;
    }

    const route = this.findMatchingRoute(req.method!, path);

    if (!route) {
      this.logger.error(
        "A matching route could not be found for:",
        req.method,
        path
      );
      res.statusCode = 404;
      res.end();
      return;
    }

    const reqPayload = await this.prepareRequestPayload(req, route);

    try {
      const handlerResponse = await route.handler(reqPayload);
      await this.handleResponse(res, handlerResponse);
    } catch (e) {
      this.logger.error("Request failed", e);
      res.writeHead(500);
      res.end();
    }
  };

  async handleResponse(res: ServerResponse, handlerResponse: Response) {
    // set status code and defaults
    res.statusCode = handlerResponse.status;
    res.statusMessage = handlerResponse.statusText;
    handlerResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (handlerResponse.body === null) {
      res.end();
      return;
    }

    return handlerResponse.body.pipeTo(Writable.toWeb(res));
  }

  findMatchingRoute(method: string, path: string) {
    return this.routes.find((r) => {
      if (r.method === method) {
        if (r.path.exactMatch && r.path.raw === path) {
          return r;
        } else if (r.path.regex?.test(path)) {
          return r;
        }
      }
    });
  }

  async prepareRequestPayload(
    req: IncomingMessage,
    matchedRoute: Route
  ): Promise<EndptsRequest> {
    const url = new URL(req.url!, `http://${req.headers["host"]}`);

    const headers = new Headers();
    for (const key in req.headers) {
      const value = req.headers[key];

      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
        continue;
      }

      if (typeof value === "string") {
        if (key === "cookie") {
          value.split("; ").forEach((v) => headers.append(key, v));
        } else {
          value.split(", ").forEach((v) => headers.append(key, v));
        }
      }
    }

    let params: Record<string, string> = {};
    if (!matchedRoute.path.exactMatch) {
      const { groups } = matchedRoute.path.regex?.exec(url.pathname)!;

      if (groups) {
        params = { ...groups };
      }
    }

    const request = new EndptsRequest(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method!)
        ? null
        : await this.readBody(req),
      params,
    });

    return request;
  }

  readBody(req: IncomingMessage): Promise<string> {
    const chunks: any[] = [];

    return new Promise((resolve, reject) => {
      req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      req.on("error", (err) => reject(err));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
}
