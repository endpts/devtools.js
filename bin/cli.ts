#!/usr/bin/env node

const _argv = process.argv.slice(2);
const cmd = _argv.shift();

if (cmd === "dev") {
  await import("../src/commands/dev.js");
} else {
  console.log("Unkown command");
}
