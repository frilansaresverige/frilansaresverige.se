// Runs once when the server starts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  if (!process.env.MYSQL_HOST || !process.env.SLACK_TOKEN) {
    console.warn(
      'MYSQL_HOST or SLACK_TOKEN is not set; skipping the Slack sync on startup.',
    )
    return
  }

  const { syncWithSlack } = await import('@/lib/slack')

  // Not awaited, so that a slow Slack doesn't delay the server.
  syncWithSlack().catch((error) => {
    console.error('Failed to sync assignments to Slack on startup:', error)
  })
}
