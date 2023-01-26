import type { EndptsRequest } from "./server/request.js";

export interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: Path;
  handler(req: EndptsRequest): Promise<Response>;
}

export interface Path {
  raw: string;
  exactMatch: boolean;
  regex?: RegExp;
}
