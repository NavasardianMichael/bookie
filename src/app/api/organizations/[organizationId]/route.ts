import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetOrganizationAPI } from '@api/organizations/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest, context: { params: Promise<{ organizationId: string }> }) => {
  try {
    const organizationId = (await context.params).organizationId
    const organization = DB.organizations.find((org) => org.id === organizationId)
    await sleep(2000)

    if (!organization) {
      return new NextResponse(
        JSON.stringify({
          error: `Organization not found`,
          value: null,
        }),
        { status: 404 }
      )
    }

    const response: APIResponse<GetOrganizationAPI['response']> = {
      error: null,
      value: organization,
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
