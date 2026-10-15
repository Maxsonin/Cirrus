type Email = { to: string; subject: string; html: string };

// Dummy sender: logs instead of sending. Replace with Resend/SMTP later.
export async function sendEmail({ to, subject, html }: Email) {
  console.log(`[email] to=${to} subject="${subject}"\n${html}`);
}
