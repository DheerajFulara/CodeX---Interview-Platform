import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const languageValidator = v.union(v.literal("javascript"), v.literal("python"), v.literal("java"));

const starterCodeValidator = v.object({
  javascript: v.string(),
  python: v.string(),
  java: v.string(),
});

const exampleValidator = v.object({
  input: v.string(),
  output: v.string(),
  explanation: v.optional(v.string()),
});

const selectedProblemValidator = v.union(
  v.object({
    type: v.literal("predefined"),
    problemId: v.id("problems"),
  }),
  v.object({
    type: v.literal("custom"),
    title: v.string(),
    description: v.string(),
    examples: v.array(exampleValidator),
    constraints: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    supportedLanguages: v.optional(v.array(languageValidator)),
    starterCode: v.optional(starterCodeValidator),
  })
);

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviews = await ctx.db.query("interviews").collect();

    return interviews;
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return interviews.filter((interview) => interview.status !== "canceled");
  },
});

export const getInterviewByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const getInterviewerPreviousInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "interviewer") {
      return [];
    }

    const hiddenInterviews = await ctx.db
      .query("interviewerHiddenInterviews")
      .withIndex("by_interviewer_id", (q) => q.eq("interviewerId", identity.subject))
      .collect();

    const hiddenInterviewIds = new Set(hiddenInterviews.map((item) => item.interviewId));

    const interviews = await ctx.db.query("interviews").collect();

    return interviews.filter(
      (interview) =>
        interview.interviewerIds.includes(identity.subject) &&
        !hiddenInterviewIds.has(interview._id) &&
        interview.status !== "upcoming"
    );
  },
});

export const getCandidatePreviousInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const hiddenInterviews = await ctx.db
      .query("candidateHiddenInterviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    const hiddenInterviewIds = new Set(hiddenInterviews.map((item) => item.interviewId));

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return interviews
      .filter((interview) => interview.status === "completed" && !hiddenInterviewIds.has(interview._id))
      .sort((a, b) => b.startTime - a.startTime);
  },
});

export const hideInterviewerInterview = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "interviewer") {
      throw new Error("Only interviewers can delete interview details from profile");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (!interview.interviewerIds.includes(identity.subject)) {
      throw new Error("Not allowed to delete this interview");
    }

    const existing = await ctx.db
      .query("interviewerHiddenInterviews")
      .withIndex("by_interviewer_and_interview_id", (q) =>
        q.eq("interviewerId", identity.subject).eq("interviewId", args.interviewId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("interviewerHiddenInterviews", {
      interviewerId: identity.subject,
      interviewId: args.interviewId,
      createdAt: Date.now(),
    });
  },
});

export const hideCandidateInterview = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (interview.candidateId !== identity.subject) {
      throw new Error("Not allowed to delete this interview history");
    }

    const existing = await ctx.db
      .query("candidateHiddenInterviews")
      .withIndex("by_candidate_and_interview_id", (q) =>
        q.eq("candidateId", identity.subject).eq("interviewId", args.interviewId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("candidateHiddenInterviews", {
      candidateId: identity.subject,
      interviewId: args.interviewId,
      createdAt: Date.now(),
    });
  },
});

export const createInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
    problems: v.optional(v.array(selectedProblemValidator)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviewer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const interviewerName = interviewer?.name || "Interviewer";

    const interviewId = await ctx.db.insert("interviews", {
      ...args,
      problems: args.problems ?? [],
    });

    await ctx.db.insert("notifications", {
      candidateId: args.candidateId,
      interviewId,
      type: "meeting_scheduled",
      title: "Interview Scheduled",
      message: `${interviewerName} scheduled an interview: ${args.title}`,
      interviewerId: identity.subject,
      interviewerName,
      isRead: false,
      createdAt: Date.now(),
    });

    return interviewId;
  },
});

export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    });
  },
});

export const updateInterviewDetails = mutation({
  args: {
    id: v.id("interviews"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    problems: v.optional(v.array(selectedProblemValidator)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.id);
    if (!interview) throw new Error("Interview not found");

    if (!interview.interviewerIds.includes(identity.subject)) {
      throw new Error("Only assigned interviewers can edit this interview");
    }

    return await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      problems: args.problems ?? interview.problems ?? [],
    });
  },
});

export const cancelInterview = mutation({
  args: {
    id: v.id("interviews"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.id);
    if (!interview) throw new Error("Interview not found");

    if (!interview.interviewerIds.includes(identity.subject)) {
      throw new Error("Only assigned interviewers can cancel this interview");
    }

    const interviewer = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const interviewerName = interviewer?.name || "Interviewer";

    await ctx.db.patch(args.id, {
      status: "canceled",
      endTime: Date.now(),
    });

    await ctx.db.insert("notifications", {
      candidateId: interview.candidateId,
      interviewId: interview._id,
      type: "meeting_canceled",
      title: "Interview Canceled",
      message: `${interviewerName} canceled interview: ${interview.title}`,
      interviewerId: identity.subject,
      interviewerName,
      isRead: false,
      createdAt: Date.now(),
    });

    return true;
  },
});
