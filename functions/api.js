import { Resend } from 'resend';

const turnstileSecret = env.TURNSTILE_SECRETKEY;
const emailKey = env.EMAIL_KEY;

const resend = new Resend(emailKey);

export async function getApi(context) {
  const { request } = context;
  const referer = request.headers.get('referer');
  const allowedDomains = ['china-support.com', 'http://localhost:4321'];

  if (!allowedDomains.some(domain => referer && referer.includes(domain))) {
    return new Response('Unauthorized', { status: 500 });
  }

  try {
    const form = await request.formData();
    const name = form.get('name');
    const email = form.get('email');
    const comment = form.get('comment');
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
        const result = await sendEmail(name, email, comment);
        if (result) {
          return new Response('ok', { status: 200 });
        }
      }
    }
    return new Response('turnstile fail', { status: 500 });
  } catch (error) {
    console.error(`Error in comment form submission: ${error}`);
    return new Response('error', { status: 500 });
  }
}

async function errorHandling(context) {
  try {
    return await context.next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

export const onRequest = [errorHandling, getApi];

/**
 * 邮件发送
 * @param name 
 * @param email 
 * @param comment 
 * @returns 
 */
const sendEmail = async (name, email, comment) => {
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
        from: 'Acme <support@china-support.com>',
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
        return false;
      }
    }
  }
};
