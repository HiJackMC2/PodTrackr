import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

const CHRISTIAN_EMAIL = 'boynecross@gmail.com';
const REPLY_TO = 'pierscarmichael@gmail.com';
const FROM = 'Events for Christian <onboarding@resend.dev>';

export async function sendEmail(options: {
  subject: string;
  html: string;
  to?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: options.to || CHRISTIAN_EMAIL,
      replyTo: REPLY_TO,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export { CHRISTIAN_EMAIL, REPLY_TO };
