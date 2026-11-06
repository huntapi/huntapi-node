# Examples

Set your API key, then run an example with [tsx](https://tsx.is):

```sh
export HUNTAPI_API_KEY="YOUR_API_KEY"
npx tsx examples/json.ts
```

- `json.ts` — call the featured endpoint and print the JSON result.
- `request.ts` — call any path with `request()` and handle API errors.
- `wait-for-job.ts` — start an async job and wait for its result.
