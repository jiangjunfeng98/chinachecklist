// Outputs: /builtwith.json
export async function GET({ params, request }) {
  const time = new Date().toISOString();
  return new Response(
    JSON.stringify({
      name: 'Astro',
      url: 'https://astro.build/',
      time: time
    })
  )
}
