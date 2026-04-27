import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMessagesByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .collect();

    return messages.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const getUnreadCountByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .collect();

    return messages.filter(
      (message) =>
        message.senderId !== identity.subject &&
        !(message.seenBy ?? []).includes(identity.subject)
    ).length;
  },
});

export const markMessagesAsSeen = mutation({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .collect();

    const unseen = messages.filter(
      (message) =>
        message.senderId !== identity.subject &&
        !(message.seenBy ?? []).includes(identity.subject)
    );

    await Promise.all(
      unseen.map((message) =>
        ctx.db.patch(message._id, {
          seenBy: [...(message.seenBy ?? []), identity.subject],
        })
      )
    );

    return unseen.length;
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const trimmedText = args.text.trim();
    if (!trimmedText) throw new Error("Message cannot be empty");

    const sender = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return await ctx.db.insert("chatMessages", {
      roomId: args.roomId,
      senderId: identity.subject,
      senderName: sender?.name || identity.name || "Unknown user",
      senderImage: sender?.image,
      text: trimmedText,
      seenBy: [identity.subject],
    });
  },
});
