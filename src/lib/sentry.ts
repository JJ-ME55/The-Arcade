// @ts-nocheck — Sentry SDK has dynamic shape across versions.
import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.MODE; // 'development' | 'production'
const RELEASE = import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || 'dev';

/**
 * Initialize Sentry for client-side error tracking.
 *
 * Behaviour:
 *   - VITE_SENTRY_DSN unset → no-op (logs once to console in dev).
 *     Lets the app boot before JJ provides the DSN on Vercel env.
 *   - VITE_SENTRY_DSN set → standard error + performance instrumentation.
 *
 * Privacy:
 *   - replays are NOT enabled by default (PII risk on a game where
 *     users type emails). Can be enabled per-page if needed.
 *   - sessionStorage / localStorage values get scrubbed by default
 *     via the included integration list (we don't add localStorage
 *     to context).
 *   - URL query params are masked (the `session` param could carry
 *     a TG JWT — we already strip it via history.replaceState but
 *     defence in depth).
 */
export function initSentry() {
  if (!DSN) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(
        '[sentry] VITE_SENTRY_DSN not set — Sentry disabled. Set on Vercel env to enable observability.'
      );
    }
    return;
  }

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    // Performance — capture 10% of transactions for sampling without
    // burning the free-tier quota. Bump up if data is sparse.
    tracesSampleRate: 0.1,
    // Mask all input + URL params by default. Defence in depth on top
    // of the JWT URL-strip in BasketballScreen / KU / FK.
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip any ?session=... query param from breadcrumbs and URLs
      // before sending — historical JWTs shouldn't leak via crash
      // reports even though we strip them client-side post-capture.
      try {
        if (event?.request?.url) {
          event.request.url = event.request.url.replace(/[?&]session=[^&]+/g, '');
        }
        if (event?.breadcrumbs) {
          event.breadcrumbs.forEach((b) => {
            if (b?.data?.url) {
              b.data.url = b.data.url.replace(/[?&]session=[^&]+/g, '');
            }
          });
        }
      } catch {
        /* defensive — never let beforeSend throw */
      }
      return event;
    },
    // Ignore noisy / known-benign errors that pollute the dashboard.
    ignoreErrors: [
      // Browser extension noise
      'top.GLOBALS',
      // React error boundaries swallow these for HMR
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      // Network blips on score-submit are already shown to the user
      // via the in-game claim banner — no need to also page Sentry.
      'NetworkError when attempting to fetch resource.',
      'Failed to fetch',
    ],
    // Custom tags so we can filter by surface in the dashboard
    initialScope: {
      tags: {
        surface: 'arcade-web',
      },
    },
  });
}

export { Sentry };
