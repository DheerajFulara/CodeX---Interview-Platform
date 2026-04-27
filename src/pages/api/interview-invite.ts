import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { clerkClient, getAuth } from "@clerk/nextjs/server";

type InviteRequestBody = {
  candidateEmail?: string;
  title?: string;
  startTime?: string;
  joinLink?: string;
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { candidateEmail, title, startTime, joinLink } = (req.body as InviteRequestBody) || {};

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let safeInterviewerName = "Interviewer";
  let interviewerEmail = "";

  try {
    const client = await clerkClient();
    const currentUser = await client.users.getUser(userId);
    safeInterviewerName =
      `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() ||
      currentUser.username ||
      "Interviewer";
    interviewerEmail = currentUser.primaryEmailAddress?.emailAddress || "";
  } catch (error) {
    console.error("Failed to load interviewer from Clerk:", error);
  }

  if (!candidateEmail || !title || !startTime || !joinLink) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INTERVIEW_INVITE_FROM_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM_EMAIL;

  const formattedDateTime = formatDateTime(startTime);
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Interview Invitation</h2>
      <p>You have been invited to an interview on CodeX.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Date & Time:</strong> ${formattedDateTime}</p>
      <p><strong>Interviewer:</strong> ${safeInterviewerName}</p>
      <p style="margin-top: 20px;">
        <a
          href="${joinLink}"
          style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 8px;"
        >
          Login or Sign up to Join Interview
        </a>
      </p>
      <p style="margin-top: 16px; color: #475569; font-size: 14px;">
        If the button does not work, copy and paste this URL:<br />
        <a href="${joinLink}">${joinLink}</a>
      </p>
    </div>
  `;

  if (resendApiKey && fromEmail) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [candidateEmail],
        reply_to: interviewerEmail || undefined,
        subject: `Interview Scheduled: ${title}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend invite error:", errorText);
      return res.status(502).json({
        error: "Failed to send invitation via Resend",
      });
    }

    return res.status(200).json({ sent: true, provider: "resend" });
  }

  if (smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom) {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: candidateEmail,
        replyTo: interviewerEmail || smtpFrom,
        subject: `Interview Scheduled: ${title}`,
        html,
      });

      return res.status(200).json({ sent: true, provider: "smtp" });
    } catch (error) {
      console.error("SMTP invite error:", error);
      return res.status(502).json({
        error: "Failed to send invitation via SMTP",
      });
    }
  }

  return res.status(500).json({
    error:
      "Email provider not configured. Set either RESEND_API_KEY + INTERVIEW_INVITE_FROM_EMAIL or SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS + SMTP_FROM_EMAIL.",
  });
}
