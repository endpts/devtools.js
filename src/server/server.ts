import { createServer, RequestListener, Server as NodeServer } from "node:http";

import type { AddressInfo } from "node:net";
import type { Logger } from "../logger.js";

export class Server {
  private readonly server: NodeServer;

  constructor(logger: Logger, requestHandler: RequestListener) {
    this.server = createServer(requestHandler);

    this.server.on("error", (e: any) => {
      if (e.code === "EADDRINUSE") {
        setTimeout(() => {
          this.server.close();
          this.server.listen(); // get an arbitrary port assigned by the OS
        }, 500);
      }
    });

    this.server.listen(3000, () => {
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
