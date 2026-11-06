// Generated from the HuntAPI OpenAPI document. Do not edit by hand.

import type { EndpointDefinition } from "./types.js";

/** Every documented operation, keyed by its snake_case name. */
export const ENDPOINTS = {
  audio_download: {
    path: "/v1/audio/download",
    methods: ["GET", "POST"],
    response: "json",
    required: ["query"],
  },
  jobs: {
    path: "/v1/jobs/{id}",
    methods: ["GET"],
    response: "json",
    required: ["id"],
  },
  media_metadata: {
    path: "/v1/media/metadata",
    methods: ["GET"],
    response: "json",
    required: ["query"],
  },
  stats: {
    path: "/v1/stats",
    methods: ["GET"],
    response: "json",
    required: [],
  },
  usage: {
    path: "/v1/usage",
    methods: ["GET"],
    response: "json",
    required: [],
  },
  video_download: {
    path: "/v1/video/download",
    methods: ["GET", "POST"],
    response: "json",
    required: ["query"],
  },
} as const satisfies Record<string, EndpointDefinition>;

export type EndpointName = keyof typeof ENDPOINTS;
