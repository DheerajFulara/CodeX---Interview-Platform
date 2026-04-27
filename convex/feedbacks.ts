import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitInterviewFeedback = mutation({
  args: {
    interviewId: v.id("interviews"),
    candidateId: v.string(),
    suggestions: v.optional(v.string()),
    strengths: v.optional(v.string()),
    rating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "interviewer") {
      throw new Error("Only interviewers can submit feedback");
    }

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (
      interview.candidateId !== args.candidateId ||
      !interview.interviewerIds.includes(identity.subject)
    ) {
      throw new Error("Not allowed to submit feedback for this interview");
    }

    const suggestions = args.suggestions?.trim();
    const strengths = args.strengths?.trim();

    if (!suggestions && !strengths && !args.rating) {
      throw new Error("Please provide at least one feedback field");
    }

    const existingFeedback = (
      await ctx.db
        .query("feedbacks")
        .withIndex("by_interview_id", (q) => q.eq("interviewId", args.interviewId))
        .collect()
    ).find((feedback) => feedback.interviewerId === identity.subject);

    if (existingFeedback) {
      await ctx.db.patch(existingFeedback._id, {
        suggestions,
        strengths,
        rating: args.rating,
        createdAt: Date.now(),
      });

      await ctx.db.insert("notifications", {
        candidateId: args.candidateId,
        interviewId: args.interviewId,
        type: "feedback_received",
        title: "New Feedback",
        message: `${currentUser.name} submitted feedback for your interview`,
        interviewerId: identity.subject,
        interviewerName: currentUser.name,
        isRead: false,
        createdAt: Date.now(),
      });

      return existingFeedback._id;
    }

    const feedbackId = await ctx.db.insert("feedbacks", {
      interviewId: args.interviewId,
      interviewerId: identity.subject,
      candidateId: args.candidateId,
      suggestions,
      strengths,
      rating: args.rating,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      candidateId: args.candidateId,
      interviewId: args.interviewId,
      type: "feedback_received",
      title: "New Feedback",
      message: `${currentUser.name} submitted feedback for your interview`,
      interviewerId: identity.subject,
      interviewerName: currentUser.name,
      isRead: false,
      createdAt: Date.now(),
    });

    return feedbackId;
  },
});

export const getMyFeedback = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "candidate") {
      return [];
    }

    const feedbacks = await ctx.db
      .query("feedbacks")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return feedbacks.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const deleteMyFeedback = mutation({
  args: { feedbackId: v.id("feedbacks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "candidate") {
      throw new Error("Only candidates can delete feedback from their dashboard");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) throw new Error("Feedback not found");

    if (feedback.candidateId !== identity.subject) {
      throw new Error("Not allowed to delete this feedback");
    }

    await ctx.db.delete(args.feedbackId);
    return true;
  },
});
