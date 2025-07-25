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

    const response: APIResponse<GetCategoryAPI['response']> = {
      error: null,
      value: category,
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
