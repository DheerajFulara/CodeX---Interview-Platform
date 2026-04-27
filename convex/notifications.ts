import { mutation, query } from "./_generated/server";

export const getMyNotifications = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getMyUnreadNotificationCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return notifications.filter((notification) => notification.isRead !== true).length;
  },
});

export const markMyNotificationsRead = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    const unreadNotifications = notifications.filter((notification) => notification.isRead !== true);
    const readAt = Date.now();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, {
          isRead: true,
          readAt,
        })
      )
    );

    return unreadNotifications.length;
  },
});
