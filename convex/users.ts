import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const linkCandidateInterviewsByEmail = async (ctx: any, candidateId: string, email: string) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const interviews = await ctx.db
    .query("interviews")
    .withIndex("by_candidate_email", (q: any) => q.eq("candidateEmail", normalizedEmail))
    .collect();

  await Promise.all(
    interviews
      .filter((interview: any) => !interview.candidateId)
      .map((interview: any) =>
        ctx.db.patch(interview._id, {
          candidateId,
        })
      )
  );
};

export const syncUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: normalizedEmail,
        image: args.image,
      });

      await linkCandidateInterviewsByEmail(ctx, args.clerkId, normalizedEmail);
      return existingUser._id;
    }

    const newUserId = await ctx.db.insert("users", {
      ...args,
      email: normalizedEmail,
    });

    await linkCandidateInterviewsByEmail(ctx, args.clerkId, normalizedEmail);

    return newUserId;
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

      if (existingUser.email) {
        await linkCandidateInterviewsByEmail(ctx, args.userId, existingUser.email);
      }

      return existingUser._id;
    }

    const email = normalizeEmail(identity.email ?? `${args.userId}@unknown.local`);

    const createdUserId = await ctx.db.insert("users", {
      clerkId: args.userId,
      role: args.role,
      name: identity.name ?? "User",
      email,
      image: identity.pictureUrl,
    });

    await linkCandidateInterviewsByEmail(ctx, args.userId, email);

    return createdUserId;
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
