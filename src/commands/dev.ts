import { Builder } from "../server/builder.js";
import { Router } from "../server/router.js";
import { Server } from "../server/server.js";
import { Watcher } from "../server/watcher.js";
import { Logger } from "../logger.js";

const logger = new Logger();
const builder = new Builder(logger, "./routes", "./.ep");
const builderCleanup = await builder.watch();
const router = new Router(logger, await builder.getRoutes());
const server = new Server(logger, router.handleRequest);
const watcher = new Watcher(logger, server, builder);
watcher.start();

process.on("SIGINT", () => {
  logger.info("Shutting down dev server");
  builderCleanup().then(() => {
    server.shutdown(() => {
      process.exit(0);
    });
  });
});
