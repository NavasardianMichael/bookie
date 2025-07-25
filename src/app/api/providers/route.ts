import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetProvidersListAPI } from '@api/providers/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest) => {
  try {
    const response: APIResponse<GetProvidersListAPI['response']> = {
      error: null,
      value: DB.providers.map((provider) => {
        return {
          id: provider.id,
          basic: {
            firstName: provider.basic.firstName,
            lastName: provider.basic.lastName,
            image: provider.basic.image,
            categories: provider.basic.categories,
          },
        }
      }),
    }
    await sleep(2000)
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
