import 'server-only'

import nodemailer from 'nodemailer'

import { getAssignment } from '@/lib/assignments'
import { emailEnv, siteUrl } from '@/lib/env'
import { fillTemplate, templates } from '@/lib/templates'

export const sendEmail = async (to: string, subject: string, text: string) => {
  const env = emailEnv()

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
  })

  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to: env.EMAIL_TO_OVERRIDE ?? to,
    bcc: env.EMAIL_BCC,
    subject,
    text,
  })
}

export const sendConfirmationEmail = async (assignmentId: string) => {
  const assignment = await getAssignment(assignmentId)

  if (assignment === null) {
    return
  }

  try {
    await sendEmail(
      assignment.emailAddress,
      'Bekräftelse på publicerat konsultuppdrag',
      fillTemplate(templates.confirmation, assignment, siteUrl()),
    )
  } catch (error) {
    console.error(
      `Failed to send confirmation email for assignment ${assignmentId}:`,
      error,
    )
  }
}
