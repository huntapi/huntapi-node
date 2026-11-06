import { HuntApiClient } from "@huntapi/sdk";

const client = new HuntApiClient({ apiKey: process.env.HUNTAPI_API_KEY });

const response = await client.mediaMetadata({
  query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
});
console.log(JSON.stringify(response.data, null, 2));
