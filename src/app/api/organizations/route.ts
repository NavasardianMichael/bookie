import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetOrganizationsListAPI } from '@api/organizations/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest) => {
  try {
    console.log({
      org: DB.organizations,
    })

    const response: APIResponse<GetOrganizationsListAPI['response']> = {
      error: null,
      value: DB.organizations,
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
