import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const languageValidator = v.union(v.literal("javascript"), v.literal("python"), v.literal("java"));

const problemExampleValidator = v.object({
  input: v.string(),
  output: v.string(),
  explanation: v.optional(v.string()),
});

const starterCodeValidator = v.object({
  javascript: v.string(),
  python: v.string(),
  java: v.string(),
});

const interviewProblemValidator = v.union(
  v.object({
    type: v.literal("predefined"),
    problemId: v.id("problems"),
  }),
  v.object({
    type: v.literal("custom"),
    title: v.string(),
    description: v.string(),
    examples: v.array(problemExampleValidator),
    constraints: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    supportedLanguages: v.optional(v.array(languageValidator)),
    starterCode: v.optional(starterCodeValidator),
  })
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.optional(v.union(v.literal("candidate"), v.literal("interviewer"))),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  problems: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    examples: v.array(problemExampleValidator),
    constraints: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    supportedLanguages: v.optional(v.array(languageValidator)),
    starterCode: starterCodeValidator,
  }).index("by_slug", ["slug"]),

  interviews: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
    problems: v.optional(v.array(interviewProblemValidator)),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_stream_call_id", ["streamCallId"]),

  comments: defineTable({
    content: v.string(),
    rating: v.number(),
    interviewerId: v.string(),
    interviewId: v.id("interviews"),
  }).index("by_interview_id", ["interviewId"]),

  feedbacks: defineTable({
    interviewId: v.id("interviews"),
    interviewerId: v.string(),
    candidateId: v.string(),
    suggestions: v.optional(v.string()),
    strengths: v.optional(v.string()),
    rating: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_interview_id", ["interviewId"]),

  recordingDeletions: defineTable({
    interviewerId: v.string(),
    recordingUrl: v.string(),
    recordingFilename: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_interviewer_id", ["interviewerId"])
    .index("by_interviewer_and_url", ["interviewerId", "recordingUrl"]),

  interviewerHiddenInterviews: defineTable({
    interviewerId: v.string(),
    interviewId: v.id("interviews"),
    createdAt: v.number(),
  })
    .index("by_interviewer_id", ["interviewerId"])
    .index("by_interviewer_and_interview_id", ["interviewerId", "interviewId"]),

  candidateHiddenInterviews: defineTable({
    candidateId: v.string(),
    interviewId: v.id("interviews"),
    createdAt: v.number(),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_candidate_and_interview_id", ["candidateId", "interviewId"]),

  notifications: defineTable({
    candidateId: v.string(),
    interviewId: v.optional(v.id("interviews")),
    type: v.union(
      v.literal("meeting_scheduled"),
      v.literal("meeting_canceled"),
      v.literal("feedback_received")
    ),
    title: v.string(),
    message: v.string(),
    interviewerId: v.optional(v.string()),
    interviewerName: v.optional(v.string()),
    isRead: v.optional(v.boolean()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_candidate_and_created_at", ["candidateId", "createdAt"]),

  codeSessions: defineTable({
    roomId: v.string(),
    questionId: v.string(),
    language: v.union(v.literal("javascript"), v.literal("python"), v.literal("java")),
    code: v.string(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_room_id", ["roomId"]),

  chatMessages: defineTable({
    roomId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderImage: v.optional(v.string()),
    text: v.string(),
    seenBy: v.optional(v.array(v.string())),
  }).index("by_room_id", ["roomId"]),
});
