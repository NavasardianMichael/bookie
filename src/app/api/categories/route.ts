import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetCategoriesListAPI } from '@api/categories/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest) => {
  try {
    const response: APIResponse<GetCategoriesListAPI['response']> = {
      error: null,
      value: DB.categories.map((category) => ({
        id: category.id,
        name: category.name,
        organizations: category.organizations.map((org) => ({
          id: org.id,
          basic: {
            name: org.basic.name,
            categories: org.basic.categories,
            description: org.basic.description,
          },
        })),
        providers: category.providers.map((provider) => ({
          id: provider.id,
          basic: {
            firstName: provider.basic.firstName,
            lastName: provider.basic.lastName,
            categories: provider.basic.categories,
            image: provider.basic.image,
          },
        })),
      })),
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
