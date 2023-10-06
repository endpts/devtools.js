import { watch } from "node:fs";
import { Router } from "./router.js";

import type { Builder } from "./builder.js";
import type { Server } from "./server.js";
import type { Logger } from "../logger.js";

export class Watcher {
  private logger: Logger;

  private readonly server: Server;
  private readonly builder: Builder;

  constructor(logger: Logger, server: Server, builder: Builder) {
    this.logger = logger;

    this.server = server;
    this.builder = builder;
  }

  // reloads the built routes and wires up the server with an updated request handler
  reload = (event: any, filename: any) => {
    this.logger.info(
      `Deteced changes in routes directory. Reloading routes...`
    );

    this.builder
      .getRoutes()
      .then((routes) => {
        const router = new Router(this.logger, routes);
        this.server.setRequestHandler(router.handleRequest);
      })
      .catch((e) => {
        this.logger.error("Failed to reload routes", e);
      });
  };

  // watches the routes build output directory and triggers a route reload
  start() {
    watch(
      this.builder.getRoutesBuildOutputDir(),
      // esbuild outputs route files in a flat structure, so we don't need to watch recursively
      { recursive: false },
      this.debounce(this.reload)
    );
  }

  debounce(fn: (event: any, filename: any) => void, timeout = 100) {
    let timer: NodeJS.Timeout;

    return (event: any, filename: any) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, [event, filename]);
      }, timeout);
    };
  }
}
