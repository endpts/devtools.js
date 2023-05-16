import { createServer, RequestListener, Server as NodeServer } from "node:http";
import * as dotenv from "dotenv";
dotenv.config();

import type { AddressInfo } from "node:net";
import type { Logger } from "../logger.js";

export class Server {
  private readonly server: NodeServer;
  private port: number = 3000;

  constructor(logger: Logger, requestHandler: RequestListener) {
    this.server = createServer(requestHandler);

    this.server.on("error", (e: any) => {
      if (e.code === "EADDRINUSE") {
        setTimeout(() => {
          this.server.close();
          this.server.listen(this.port++); // try to get the next available port
        }, 500);
      }
    });

    this.server.listen(this.port, () => {
      const address = this.server.address() as AddressInfo;

      logger.info(
        `endpts dev server is running on: http://localhost:${address.port}`
      );
    });
  }

  setRequestHandler(requestHandler: RequestListener) {
    this.server.removeAllListeners("request");
    this.server.addListener("request", requestHandler);
  }

  shutdown(cb: (err?: Error | undefined) => void) {
    this.server.close(cb);
  }
}
