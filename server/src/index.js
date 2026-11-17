import { createApp } from './app.js';

/**
 * Cloudflare Workers entry point.
 * Bindings (DATABASE_URL, DEMO_AUTH_SECRET, CORS_ORIGINS) are injected as `env`.
 * For a Workers deployment configure Neon's serverless driver / Hyperdrive — see README.
 */
const app = createApp();

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
};
