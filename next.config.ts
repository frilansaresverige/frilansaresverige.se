import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Inlined at build time, so that statically and dynamically rendered pages
  // agree. The Docker image therefore takes it as a build argument.
  env: {
    GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID ?? '',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.githubassets.com',
      },
    ],
  },
  async redirects() {
    return [
      // Edit links in e-mails sent before the move. Requests to the old
      // uppdrag.frilansaresverige.se are redirected by Nginx.
      {
        source: '/assignments/:assignmentId',
        destination: '/uppdrag/:assignmentId',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
