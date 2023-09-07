import type { EndptsRequest } from "./server/request.js";

export interface Route {
  method:
    | "ALL"
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";
  path: Path;
  handler(req: EndptsRequest): Promise<Response>;
}

export interface Path {
  raw: string;
  exactMatch: boolean;
  regex?: RegExp;
}
