import chalk from "chalk";
import { IncomingMessage } from "node:http";

export class Logger {
  request(req: IncomingMessage) {
    console.log(chalk.green("REQ"), req.method, req.url);
  }

  info(...msg: any) {
    console.log(chalk.blue("INFO"), ...msg);
  }

  error(...msg: any) {
    console.error(chalk.red("ERROR"), ...msg);
  }
}
