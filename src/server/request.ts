import { EndptsRequest as IEndptsRequest } from "@endpts/types";

interface EndptsRequestInit extends RequestInit {
  params: Record<string, string>;
}

export class EndptsRequest extends Request implements IEndptsRequest {
  public readonly query: URLSearchParams;
  public readonly params: Record<string, string>;

  constructor(url: URL, init: EndptsRequestInit) {
    super(url, init);

    this.params = init.params;
    this.query = url.searchParams;
  }
}
