// Generated from the HuntAPI OpenAPI document. Do not edit by hand.

import type { OpenString } from "./types.js";

/** Parameters for operations that take none. */
export type EmptyParams = Record<string, never>;

/** Parameters for `audioDownload()` — `GET / POST /v1/audio/download`. */
export interface AudioDownloadParams {
  /** URL to download audio from. */
  query: string;
  /** Desired download type. Supported values: audio (default). Default: `"audio"`. */
  download_type?: string | undefined;
  /** Maximum duration of the downloaded content in seconds. If the audio is longer than this value, only the content up to this duration will be downloaded. */
  max_duration?: number | undefined;
  /** Desired audio quality. Default: `"best"`. */
  audio_quality?: string | undefined;
  /** Desired output format for the audio. Default: `"mp3"`. */
  audio_format?: string | undefined;
  /** URL of the webhook where results will be sent. When specified, the system will attempt to send the response to this URL up to 3 times with a 5-second delay between each attempt. The results will be sent as a POST request. */
  webhook_url?: string | undefined;
  /** Authorization header for the webhook. This parameter allows you to add authentication to your webhook endpoint. */
  webhook_authorization?: string | undefined;
  /** Comma-separated list of fields to keep in the response, with dot notation for nested fields (e.g. name,location.city). Does not change the credit cost. */
  fields?: string | undefined;
  /** Process the request asynchronously: the response is a job_id to poll on /v1/jobs/{id} (see waitForJob). Default: `false`. */
  is_async?: boolean | undefined;
  /** Return HTTP 200 even when an error occurs; the error is then in the response body. Default: `false`. */
  soft_fail?: boolean | undefined;
}

/** Parameters for `jobs()` — `GET /v1/jobs/{id}`. */
export interface JobsParams {
  /** Job UUID returned as job_id by async endpoints such as /v1/video/download and /v1/audio/download. */
  id: string;
}

/** Parameters for `mediaMetadata()` — `GET /v1/media/metadata`. */
export interface MediaMetadataParams {
  /** Media URL to inspect (YouTube, Instagram, TikTok, Vimeo, X, Facebook, Twitch, Reddit, etc.). */
  query: string;
  /** Comma-separated list of fields to keep in the response, with dot notation for nested fields (e.g. name,location.city). Does not change the credit cost. */
  fields?: string | undefined;
  /** Process the request asynchronously: the response is a job_id to poll on /v1/jobs/{id} (see waitForJob). Default: `false`. */
  is_async?: boolean | undefined;
  /** Return HTTP 200 even when an error occurs; the error is then in the response body. Default: `false`. */
  soft_fail?: boolean | undefined;
}

/** Parameters for `stats()` — `GET /v1/stats`. */
export interface StatsParams {
  /** API family to check, for example video. Provide at least engine or path. */
  engine?: string | undefined;
  /** Specific endpoint to check, for example /v1/video/download. If you also pass engine, use an endpoint from that API. */
  path?: string | undefined;
}

/** Parameters for `videoDownload()` — `GET / POST /v1/video/download`. */
export interface VideoDownloadParams {
  /** Video URL to download. */
  query: string;
  /** Desired download type. You have three options: Default: `"audio_video"`. */
  download_type?: string | undefined;
  /** Maximum duration of the downloaded content in seconds. If the video/audio is longer than this value, only the content up to this duration will be downloaded. */
  max_duration?: number | undefined;
  /** Desired video quality. Available options: Default: `"best"`. */
  video_quality?: string | undefined;
  /** Desired output format for the video. Available options: Default: `"mp4"`. */
  video_format?: string | undefined;
  /** URL of the webhook where results will be sent. When specified, the system will attempt to send the response to this URL up to 3 times with a 5-second delay between each attempt. The results will be sent as a POST request. */
  webhook_url?: string | undefined;
  /** Authorization header for the webhook. This parameter allows you to add authentication to your webhook endpoint. This value will be included in the Authorization header when making the webhook request to your server. */
  webhook_authorization?: string | undefined;
  /** Comma-separated list of fields to keep in the response, with dot notation for nested fields (e.g. name,location.city). Does not change the credit cost. */
  fields?: string | undefined;
  /** Process the request asynchronously: the response is a job_id to poll on /v1/jobs/{id} (see waitForJob). Default: `false`. */
  is_async?: boolean | undefined;
  /** Return HTTP 200 even when an error occurs; the error is then in the response body. Default: `false`. */
  soft_fail?: boolean | undefined;
}
