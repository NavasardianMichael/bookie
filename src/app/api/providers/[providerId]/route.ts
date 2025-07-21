import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetProviderAPI } from '@api/providers/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest, context: { params: Promise<{ providerId: string }> }) => {
  try {
    const providerId = (await context.params).providerId
    const provider = DB.providers.find((provider) => provider.id === providerId)
    await sleep(2000)

    if (!provider) {
      return new NextResponse(
        JSON.stringify({
          error: `Provider not found`,
          value: null,
        }),
        { status: 404 }
      )
    }

    const response: APIResponse<GetProviderAPI['response']> = {
      error: null,
      value: provider,
    }

    return new NextResponse(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown error occurred')
    console.log('Error processing request:', error)
    return new NextResponse(
      JSON.stringify({
        error: error.message,
        value: null,
      }),
      { status: 500 }
    )
  }
}
