/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chatMessages from "../chatMessages.js";
import type * as codeSessions from "../codeSessions.js";
import type * as comments from "../comments.js";
import type * as feedbacks from "../feedbacks.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as notifications from "../notifications.js";
import type * as problems from "../problems.js";
import type * as recordingDeletions from "../recordingDeletions.js";
import type * as users from "../users.js";
import type * as whiteboard from "../whiteboard.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chatMessages: typeof chatMessages;
  codeSessions: typeof codeSessions;
  comments: typeof comments;
  feedbacks: typeof feedbacks;
  http: typeof http;
  interviews: typeof interviews;
  notifications: typeof notifications;
  problems: typeof problems;
  recordingDeletions: typeof recordingDeletions;
  users: typeof users;
  whiteboard: typeof whiteboard;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
