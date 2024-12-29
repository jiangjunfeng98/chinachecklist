import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

import cloudflare from "@astrojs/cloudflare";

import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [tailwind()],
  // adapter: vercel()
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  })
});
