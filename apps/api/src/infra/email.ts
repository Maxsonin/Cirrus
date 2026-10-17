type Email = { to: string; subject: string; html: string };

// TODO: implement real email service
export async function sendEmail({ to, subject, html }: Email) {
  console.log(`[email] to=${to} subject="${subject}"\n${html}`);
}
