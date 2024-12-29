import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export async function GET({ params, request }) {
  const resend = new Resend('emailKey');
  const time = new Date().toISOString();
  return new Response(
    JSON.stringify({
      name: 'Astro',
      url: 'https://astro.build/',
      time: time,
      key: resend.key
    })
  )
}
