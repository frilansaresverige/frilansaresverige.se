import { checkDatabaseHealth } from '@/lib/assignments'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await checkDatabaseHealth()
    return new Response(null, { status: 200 })
  } catch (error) {
    console.error('Health check failed:', error)
    return new Response(null, { status: 500 })
  }
}
