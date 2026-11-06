# HuntAPI Node.js SDK

The official Node.js and TypeScript SDK for the [HuntAPI](https://www.huntapi.com) media download API.

Download video and audio from public media URLs, or extract their metadata, with one async REST API.

The SDK exposes **6 typed methods**, one per documented endpoint, plus a generic `request()` for anything else.

## Requirements

- Node.js 20 or newer

## Installation

```sh
npm install @huntapi/sdk
```

The SDK works with TypeScript and JavaScript (ES modules). The examples below use TypeScript; JavaScript users can use the same API by omitting TypeScript-only syntax.

## Get your API key

[Sign up for HuntAPI](https://app.huntapi.com/register) or sign in to your existing account, then copy your API key from the [dashboard](https://app.huntapi.com). Store it securely, for example in the `HUNTAPI_API_KEY` environment variable, which the client reads by default.

## Quick start

```ts
import { HuntApiClient } from "@huntapi/sdk";

const client = new HuntApiClient({ apiKey: process.env.HUNTAPI_API_KEY });

const response = await client.mediaMetadata({
  query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
});
console.log(response.data);
```

Every method takes a parameter object that mirrors the [API reference](https://docs.huntapi.com) (snake_case names, exactly as documented) and an optional `RequestOptions` object.

## Async jobs

Download endpoints are asynchronous: they return a `job_id`, and jobs can run for up to 12 hours. `waitForJob()` polls `GET /v1/jobs/{id}` until the job reaches a terminal status (`CompletedJob`, `Error`, `NotFound`, `BadRequest`):

```ts
const submitted = await client.videoDownload({
  query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
  video_quality: "720p",
});
const job = await client.waitForJob(submitted.data.job_id, {
  onProgress: (j) => console.log(`${j.status} ${j.progress ?? 0}%`),
});
console.log(JSON.stringify(job.data, null, 2));
```

## GET or POST

Methods use GET when the endpoint supports it: parameters travel in the query string. POST sends the same parameters as a JSON body.

```ts
await client.audioDownload({ query: "test" }, { method: "POST" });
```

`null`, `undefined` and empty arrays are omitted, `false` and `0` are sent, and arrays repeat the parameter name (`a=1&a=2`).

## Any endpoint

`request()` reaches any path, including endpoints released after this SDK version:

```ts
const response = await client.request("GET", "/v1/usage");
```

## Responses

- `JsonResponse` — `kind: "json"`, the parsed body in `data` (pass a type argument to type it: `client.mediaMetadata<MyType>(…)`).
- `BinaryResponse` — `kind: "binary"`, the body in `bytes` and its `contentType`.

Both keep the buffered `rawResponse` (status, headers, content type, body bytes).

## Errors

```ts
import { HuntApiApiError } from "@huntapi/sdk";

try {
  await client.mediaMetadata({
    query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
  });
} catch (error) {
  if (error instanceof HuntApiApiError) {
    console.error(error.status, error.message, error.responseBody);
  }
  throw error;
}
```

| Error                          | When                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `HuntApiConfigurationError`    | Missing API key, invalid options or unsupported method.                       |
| `HuntApiSerializationError`    | A required parameter is missing or a value can't be sent.                     |
| `HuntApiTransportError`        | Network failure or client-side timeout.                                       |
| `HuntApiApiError`              | The API answered with a non-2xx status (`status`, `message`, `responseBody`). |
| `HuntApiResponseDecodingError` | A success response could not be decoded.                                      |

All of them extend `HuntApiError`. Common statuses: `400` invalid parameters, `401` invalid API key, `402` no credits left, `429` rate limit exceeded.

## Retries

Requests are retried up to 3 times after a network error, a `408`, `500`, `502`, `503` or `504`, or a rate limit — which the API returns as `401` (or `429`) with a `Rate limit exceeded` message. Per-key quota errors (`…: quota daily`) are not retried, nor are `400`, `402`, `404` or client-side timeouts. The delay starts at 1 second and grows 1.5× per retry (capped at 30 seconds); a `Retry-After` header wins.

```ts
const client = new HuntApiClient({ maxRetries: 5, retryDelay: 500 });

// or for one request
await client.mediaMetadata(
  { query: "https://www.youtube.com/watch?v=Z5YP8kznWZs" },
  { maxRetries: 0 },
);
```

## Batch requests

`batch()` runs a task per item with at most 10 in flight (`concurrency`), and returns one result per item in input order, shaped like `Promise.allSettled`. One failure never stops the others.

```ts
const inputs = [
  "https://www.youtube.com/watch?v=Z5YP8kznWZs",
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
];
const results = await client.batch(
  inputs,
  (query) => client.mediaMetadata({ query }),
  { concurrency: 5 },
);

for (const result of results) {
  if (result.status === "fulfilled") console.log(result.value.data);
  else console.error(inputs[result.index], result.reason);
}
```

| Constant                 | Default  | Description                                                     |
| ------------------------ | -------- | --------------------------------------------------------------- |
| `DEFAULT_CONCURRENCY`    | `10`     | Tasks run at the same time by batch                             |
| `DEFAULT_TIMEOUT_MS`     | `120000` | Request timeout (milliseconds)                                  |
| `MAX_RETRIES`            | `3`      | Retry attempts after a network error, a 408/5xx or a rate limit |
| `RETRY_BACKOFF_FACTOR`   | `1.5`    | Exponential backoff multiplier                                  |
| `DEFAULT_RETRY_DELAY_MS` | `1000`   | Delay before the first retry (milliseconds)                     |

## Timeouts and cancellation

```ts
const client = new HuntApiClient({ timeout: 60_000 }); // default 120000 ms, 0 disables

await client.mediaMetadata(
  { query: "https://www.youtube.com/watch?v=Z5YP8kznWZs" },
  {
    signal: AbortSignal.timeout(30_000),
  },
);
```

## Advanced: custom Fetch transport

```ts
import { HuntApiClient, type HuntApiFetch } from "@huntapi/sdk";

const loggingFetch: HuntApiFetch = async (input, init) => {
  const response = await fetch(input, init);
  console.log(init.method, String(input), response.status);
  return response;
};

const client = new HuntApiClient({ fetch: loggingFetch });
```

## Endpoints

6 methods, generated from the [OpenAPI document](https://app.huntapi.com/openapi).

| Method            | HTTP                            | Description                                                                                                                                  |
| ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `audioDownload()` | GET / POST `/v1/audio/download` | Download audio from a URL via HuntAPI and receive a job id.                                                                                  |
| `jobs()`          | GET `/v1/jobs/{id}`             | Poll status, progress (0–100), and result of an async HuntAPI job.                                                                           |
| `mediaMetadata()` | GET `/v1/media/metadata`        | Extract metadata from a media URL without downloading the file.                                                                              |
| `stats()`         | GET `/v1/stats`                 | Infrastructure health for an engine or endpoint over the last hour. Not scoped to your account or tenant. Enabled per account: HTTP 403 mea… |
| `usage()`         | GET `/v1/usage`                 | Retrieve real-time usage statistics and credit balance for your Huntapi account.                                                             |
| `videoDownload()` | GET / POST `/v1/video/download` | Video Download                                                                                                                               |

## All HuntAPI SDKs

| SDK        | Package                                                          | Install                                |
| ---------- | ---------------------------------------------------------------- | -------------------------------------- |
| Node.js    | [`@huntapi/sdk`](https://www.npmjs.com/package/@huntapi/sdk)     | `npm install @huntapi/sdk`             |
| Python     | [`huntapi`](https://pypi.org/project/huntapi/)                   | `pip install huntapi`                  |
| Go         | [`huntapi-go`](https://pkg.go.dev/github.com/huntapi/huntapi-go) | `go get github.com/huntapi/huntapi-go` |
| .NET       | [`HuntApi`](https://www.nuget.org/packages/HuntApi)              | `dotnet add package HuntApi`           |
| Ruby       | [`huntapi`](https://rubygems.org/gems/huntapi)                   | `gem install huntapi`                  |
| PHP        | [`huntapi/sdk`](https://packagist.org/packages/huntapi/sdk)      | `composer require huntapi/sdk`         |
| Java       | [`huntapi-java`](https://github.com/huntapi/huntapi-java)        | build from source, see its README      |
| CLI        | [`@huntapi/cli`](https://www.npmjs.com/package/@huntapi/cli)     | `npm install -g @huntapi/cli`          |
| MCP server | [`@huntapi/mcp`](https://www.npmjs.com/package/@huntapi/mcp)     | `npx -y @huntapi/mcp`                  |

## License

MIT — see [LICENSE](LICENSE).
