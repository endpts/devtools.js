import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, basename } from "node:path";

import * as esbuild from "esbuild";
import { globby } from "globby";

import type { Logger } from "../logger.js";
import type { Route, Path } from "../types.js";

export class Builder {
  private logger: Logger;

  private readonly routesSrcDir: string;
  private readonly buildOutputDir: string;
  private readonly routesBuildOutputDir: string;
  // the directory in which the ep dev command was run
  private readonly projectRootDir = process.cwd();

  constructor(logger: Logger, routesDir: string, buildOutputDir: string) {
    this.logger = logger;

    this.routesSrcDir = join(this.projectRootDir, routesDir); // ./routes
    this.buildOutputDir = join(this.projectRootDir, buildOutputDir); // ./ep
    this.routesBuildOutputDir = join(this.buildOutputDir, "routes"); // ./ep/routes

    this.clearBuildDirectory();
  }

  // clears the build directories and recreates them
  private clearBuildDirectory() {
    if (existsSync(this.routesBuildOutputDir)) {
      rmSync(this.routesBuildOutputDir, { recursive: true, force: true });
    }

    mkdirSync(this.routesBuildOutputDir, { recursive: true });
  }

  // watches the route files directory for any changes and triggers a rebuild
  async watch() {
    const routeFilePaths = await globby([`${this.routesSrcDir}/**/*.ts`]);

    const ctx = await esbuild.context({
      entryPoints: routeFilePaths,
      entryNames: "[name]-[hash]",
      bundle: true,
      platform: "neutral",
      packages: "external",
      outdir: this.routesBuildOutputDir,
      format: "esm",
    });
    await ctx.watch();

    return ctx.dispose;
  }

  // scans the routes build output directory and produces the list of route objects
  getRoutes = async () => {
    let routes: Route[] = [];

    const builtRouteFilePaths = await globby([
      `${this.routesBuildOutputDir}/**/*.js`,
    ]);

    // once esbuild generates the new route files, we need to use them
    for (const routeFilePath of builtRouteFilePaths) {
      // copy the route to .ep/ (eventually run the transpilation process for TS)
      const outputFileName = basename(routeFilePath);
      const outputFilePath = join(this.routesBuildOutputDir, outputFileName);

      // TODO: consider using module loaders when they reach a more stable stage
      // Today, the memory usage will continue to grow as the route files are generated
      // with different hashes since the dynamic imports are not garbage collected
      // https://github.com/nodejs/loaders
      const routeDefinition = await import(outputFilePath);
      const { method, path: rawPath, handler } = routeDefinition.default;

      if (routes.some((r) => r.method === method && r.path.raw === rawPath)) {
        this.logger.error(`Duplicate routes detected: ${method} ${rawPath}`);
        return [];
      }

      let path: Path;

      if (rawPath.includes(":")) {
        path = {
          raw: rawPath,
          regex: new RegExp(this.generatePathRegex(rawPath)),
          exactMatch: false,
        };
      } else {
        path = {
          raw: rawPath,
          exactMatch: true,
        };
      }

      routes.push({
        method,
        path,
        handler,
      });
    }

    return routes;
  };

  // generates the regex for matching dynamic paths and capture groups
  generatePathRegex(path: string) {
    const segments = path.split("/");
    const regexComponents = ["^"];

    for (const segment of segments) {
      if (segment.length === 0) {
        // ignore the empty string as the first segment from splitting by '/'
        continue;
      }

      if (segment.startsWith(":")) {
        // create regex named capture group
        regexComponents.push(`\/(?<${segment.slice(1)}>[^/]+?)`);
      } else {
        regexComponents.push(`\/${segment}`);
      }
    }

    regexComponents.push("$");

    return regexComponents.join("");
  }

  // returns the routes build output directory
  getRoutesBuildOutputDir() {
    return this.routesBuildOutputDir;
  }
}
