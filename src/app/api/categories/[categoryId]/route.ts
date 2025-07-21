import { DB } from '@app/api/_shared/db/db'
import { NextRequest, NextResponse } from 'next/server'
import { GetCategoryAPI } from '@api/categories/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const GET = async (_request: NextRequest, context: { params: Promise<{ categoryId: string }> }) => {
  try {
    const categoryId = (await context.params).categoryId
    const category = DB.categories.find((cat) => cat.id === categoryId)
    await sleep(2000)

    if (!category) {
      return new NextResponse(
        JSON.stringify({
          error: `Category not found`,
          value: null,
        }),
        { status: 404 }
      )
    }

    // Get organizations and providers for this category
    const organizationsInCategory = DB.organizations
      .filter((org) => org.basic.categories.some((cat) => cat.id === categoryId))
      .map((org) => ({ id: org.id, basic: org.basic }))

    const providersInCategory = DB.providers
      .filter((provider) => provider.basic.categories.some((cat) => cat.id === categoryId))
      .map((provider) => ({ id: provider.id, basic: provider.basic }))

    const response: APIResponse<GetCategoryAPI['response']> = {
      error: null,
      value: {
        id: category.id,
        name: category.name,
        organizations: organizationsInCategory,
        providers: providersInCategory,
      },
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
