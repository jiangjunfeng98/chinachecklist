import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const turnstileSecret = import.meta.env.TURNSTILE_SECRETKEY;
const emailKey = import.meta.env.EMAIL_KEY;

const resend = new Resend(emailKey);

/**
 * 数据提交接口
 * @param param0 
 * @returns 
 */
export const POST: APIRoute = async function POST({ request }) {
  try {
    const form = await request.formData();
    const name = form.get('name') as string;
    const email = form.get('email') as string;
    const comment = form.get('message') as string;
    if (!name || !email || !comment) {
      return new Response('fail', { status: 500 });
    }
    const turnstileResponse = form.get('cf-turnstile-response');

    const ip = request.headers.get('CF-Connecting-IP');

    if (typeof turnstileResponse === 'string') {
      const bodyFormData = new FormData();
      bodyFormData.append('secret', turnstileSecret);
      bodyFormData.append('response', turnstileResponse);
      ip && bodyFormData.append('remoteip', ip);
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: bodyFormData,
      });
      const { success } = await response.json();
      if (success) {
        // 发送信息到邮箱，
        // 给用户发送邮件提示
        console.log({ name, email, comment, success });
        const result = await sendEmail(name, email, comment)
        if (result) {
          return new Response('ok', { status: 200 });
        }
      }
    }
    return new Response('turnstile fail', { status: 520 });
  } catch (error: unknown) {
    console.error(`Error in comment form submission: ${error as string}`);
    return new Response('error', { status: 520 });
  }
};

/**
 * 邮件发送
 * @param name 
 * @param email 
 * @param comment 
 * @returns 
 */
const sendEmail = async (name: string, email: string, comment: string) => {
  const htmlContent = `
    <p>Dear ${name},</p>
    <p>Thank you for reaching out to China-Support with your inquiry. We are delighted that you have chosen us as your trade partner and have received your message.</p>
    <p>Submitted information is as follows:</p>
    <ul>
      <li><strong>Name: </strong>${name}</li>
      <li><strong>Message: </strong>${comment}</li>
    </ul>
    <p>Please rest assured that we are committed to arranging a dedicated staff member to contact you within 1-2 business days to further discuss your needs and provide the corresponding services.</p>
    <p>Should you have any questions or require additional information, please feel free to reply to this email to get in touch with us.</p>
    <p>Thank you for your patient wait, and we look forward to further communication with you.</p>
    <P></P>
    <p>China-Support</p>
    <p><a href="mailto:support@china-support.com">support@china-support.com</a></p>
  `;

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'ChinaSupport <support@china-support.com>',
        to: [email],
        subject: 'Thank you for reaching out - ChinaSupport',
        html: htmlContent,
      });

      if (error) {
        throw new Error(error.message);
      }
      return true;
    } catch (error) {
      attempts++;
      console.error(`Attempt ${attempts} failed: ${error}`);
      if (attempts >= maxAttempts) {
        console.error('Failed to send email after 3 attempts');
        return false
      }
    }
  }
};
