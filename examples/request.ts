import { HuntApiApiError, HuntApiClient } from "@huntapi/sdk";

const client = new HuntApiClient({ apiKey: process.env.HUNTAPI_API_KEY });

try {
  // Any endpoint, including ones released after this SDK version.
  const response = await client.request("GET", "/v1/usage");
  if (response.kind === "json") console.log(response.data);
} catch (error) {
  if (error instanceof HuntApiApiError) {
    console.error(`HTTP ${error.status}: ${error.message}`);
  } else {
    throw error;
  }
}
