import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type InterviewAccess = {
  candidateId: string;
  candidateEmail?: string;
  interviewerIds: string[];
};

type Identity = {
  subject: string;
  email?: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const canAccessInterview = (interview: InterviewAccess, identity: Identity) => {
  const normalizedUserEmail = normalizeEmail(identity.email || "");
  const normalizedCandidateEmail = interview.candidateEmail ? normalizeEmail(interview.candidateEmail) : "";

  return (
    interview.candidateId === identity.subject ||
    interview.interviewerIds.includes(identity.subject) ||
    (normalizedUserEmail.length > 0 && normalizedCandidateEmail === normalizedUserEmail)
  );
};

const getInterviewByRoomId = async (ctx: any, roomId: string) => {
  return await ctx.db
    .query("interviews")
    .withIndex("by_stream_call_id", (q: any) => q.eq("streamCallId", roomId))
    .first();
};

export const getWhiteboardStateByRoomId = query({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const interview = await getInterviewByRoomId(ctx, args.roomId);
    if (!interview || !canAccessInterview(interview, identity)) {
      return null;
    }

    return await ctx.db
      .query("whiteboardStates")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();
  },
});

export const upsertWhiteboardState = mutation({
  args: {
    roomId: v.string(),
    elements: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("Only authenticated users can update the whiteboard");
    }

    const interview = await getInterviewByRoomId(ctx, args.roomId);
    if (!interview) {
      throw new Error("Interview not found");
    }

    if (!canAccessInterview(interview, identity)) {
      throw new Error("Not allowed to update this whiteboard");
    }

    const existing = await ctx.db
      .query("whiteboardStates")
      .withIndex("by_room_id", (q) => q.eq("roomId", args.roomId))
      .first();

    const nextState = {
      roomId: args.roomId,
      elements: args.elements,
      updatedBy: identity.subject,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextState);
      return existing._id;
    }

    return await ctx.db.insert("whiteboardStates", nextState);
  },
});