import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const syncUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      ...args,
    });
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("candidate"), v.literal("interviewer")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    if (identity.subject !== args.userId) {
      throw new Error("Not allowed to set role for another user");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, { role: args.role });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.userId,
      role: args.role,
      name: identity.name ?? "User",
      email: identity.email ?? `${args.userId}@unknown.local`,
      image: identity.pictureUrl,
    });
  },
});

export const getUsers = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("User is not authenticated");

    const users = await ctx.db.query("users").collect();

    return users;
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});
