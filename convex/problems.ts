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

const DEFAULT_PROBLEMS = [
  {
    slug: "two-sum",
    title: "Two Sum",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers in the array such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 104",
      "-109 ≤ nums[i] ≤ 109",
      "-109 ≤ target ≤ 109",
      "Only one valid answer exists.",
    ],
    difficulty: "easy",
    supportedLanguages: ["javascript", "python", "java"] as const,
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n\n}`,
      python: `def two_sum(nums, target):\n    # Write your solution here\n    pass`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n\n    }\n}`,
    },
  },
  {
    slug: "reverse-string",
    title: "Reverse String",
    description:
      "Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.",
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
      },
    ],
    difficulty: "easy",
    supportedLanguages: ["javascript", "python", "java"] as const,
    starterCode: {
      javascript: `function reverseString(s) {\n  // Write your solution here\n\n}`,
      python: `def reverse_string(s):\n    # Write your solution here\n    pass`,
      java: `class Solution {\n    public void reverseString(char[] s) {\n        // Write your solution here\n\n    }\n}`,
    },
  },
  {
    slug: "palindrome-number",
    title: "Palindrome Number",
    description:
      "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.",
    examples: [
      {
        input: "x = 121",
        output: "true",
        explanation: "121 reads as 121 from left to right and from right to left.",
      },
      {
        input: "x = -121",
        output: "false",
        explanation:
          "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.",
      },
    ],
    difficulty: "easy",
    supportedLanguages: ["javascript", "python", "java"] as const,
    starterCode: {
      javascript: `function isPalindrome(x) {\n  // Write your solution here\n\n}`,
      python: `def is_palindrome(x):\n    # Write your solution here\n    pass`,
      java: `class Solution {\n    public boolean isPalindrome(int x) {\n        // Write your solution here\n\n    }\n}`,
    },
  },
];

export const getAllProblems = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const problems = await ctx.db.query("problems").collect();
    return problems.sort((a, b) => a.title.localeCompare(b.title));
  },
});

export const createCustomProblem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    examples: v.array(exampleValidator),
    constraints: v.optional(v.array(v.string())),
    difficulty: v.optional(v.string()),
    supportedLanguages: v.optional(v.array(languageValidator)),
    starterCode: v.optional(starterCodeValidator),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const slug = `${args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    return await ctx.db.insert("problems", {
      slug,
      title: args.title,
      description: args.description,
      examples: args.examples,
      constraints: args.constraints,
      difficulty: args.difficulty,
      supportedLanguages: args.supportedLanguages,
      starterCode: args.starterCode ?? {
        javascript: "// Write your solution here",
        python: "# Write your solution here",
        java: "// Write your solution here",
      },
    });
  },
});

export const ensureDefaultProblems = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    for (const problem of DEFAULT_PROBLEMS) {
      const existing = await ctx.db
        .query("problems")
        .withIndex("by_slug", (q) => q.eq("slug", problem.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("problems", {
          slug: problem.slug,
          title: problem.title,
          description: problem.description,
          examples: problem.examples,
          constraints: problem.constraints,
          difficulty: problem.difficulty,
          supportedLanguages: [...problem.supportedLanguages],
          starterCode: problem.starterCode,
        });
      }
    }

    return true;
  },
});
