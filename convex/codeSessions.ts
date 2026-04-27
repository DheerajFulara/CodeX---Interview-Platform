import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getSessionByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("codeSessions")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();
  },
});

export const upsertSession = mutation({
  args: {
    roomId: v.string(),
    questionId: v.string(),
    language: v.union(v.literal("javascript"), v.literal("python"), v.literal("java")),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("codeSessions")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        questionId: args.questionId,
        language: args.language,
        code: args.code,
        updatedBy: identity.subject,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("codeSessions", {
      roomId: args.roomId,
      questionId: args.questionId,
      language: args.language,
      code: args.code,
      updatedBy: identity.subject,
      updatedAt: Date.now(),
    });
  },
});
