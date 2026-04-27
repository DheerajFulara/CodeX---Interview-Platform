import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const hideRecording = mutation({
  args: {
    recordingUrl: v.string(),
    recordingFilename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "interviewer") {
      throw new Error("Only interviewers can delete recordings from dashboard");
    }

    const existing = await ctx.db
      .query("recordingDeletions")
      .withIndex("by_interviewer_and_url", (q) =>
        q.eq("interviewerId", identity.subject).eq("recordingUrl", args.recordingUrl)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("recordingDeletions", {
      interviewerId: identity.subject,
      recordingUrl: args.recordingUrl,
      recordingFilename: args.recordingFilename,
      createdAt: Date.now(),
    });
  },
});

export const getMyHiddenRecordingUrls = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "interviewer") {
      return [];
    }

    const hiddenRecordings = await ctx.db
      .query("recordingDeletions")
      .withIndex("by_interviewer_id", (q) => q.eq("interviewerId", identity.subject))
      .collect();

    return hiddenRecordings.flatMap((item) => [
      item.recordingUrl,
      item.recordingFilename,
    ]).filter((value): value is string => Boolean(value));
  },
});
