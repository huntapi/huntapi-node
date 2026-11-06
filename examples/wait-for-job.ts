import { HuntApiClient } from "@huntapi/sdk";

const client = new HuntApiClient({ apiKey: process.env.HUNTAPI_API_KEY });

const submitted = await client.videoDownload({
  query: "https://www.youtube.com/watch?v=Z5YP8kznWZs",
  video_quality: "720p",
});
const job = await client.waitForJob(submitted.data.job_id, {
  onProgress: (j) => console.log(`${j.status} ${j.progress ?? 0}%`),
});
console.log(JSON.stringify(job.data, null, 2));
