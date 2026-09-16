import { serwist } from "@serwist/next/config";

/**
 * Service worker build config.
 *
 * Serwist runs as its own CLI step after `next build` (see the `build`
 * script) rather than as a next.config plugin. Next 16 defaults to Turbopack
 * and the plugin form still injects a webpack config; the CLI form is the
 * supported path and keeps next.config.ts free of bundler-specific wiring.
 *
 * Plain .mjs rather than .ts because the Serwist CLI loads this file directly
 * with Node's ESM loader, which has no TypeScript support.
 */
export default serwist.withNextConfig((nextConfig) => ({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  globDirectory: nextConfig.distDir,

  // Precache the static shell only. Prerendered HTML is deliberately
  // excluded — see the comment in src/app/sw.ts about shared till devices.
  precachePrerendered: false,
}));
