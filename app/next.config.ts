import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    clientSegmentCache: true
  }
};

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  disableMiddlewareInstrumentation: true,
});
