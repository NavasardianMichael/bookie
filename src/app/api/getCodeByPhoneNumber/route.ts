import { NextRequest, NextResponse } from 'next/server'
import { DB } from '@api/_shared/db'
import { GetCodeByPhoneNumberAPI } from '@api/auth/types'
import { APIResponse } from '@interfaces/api'
import { sleep } from '@helpers/commons'

export const POST = async (request: NextRequest) => {
  try {
    const payload: GetCodeByPhoneNumberAPI['payload'] = await request.json()

    console.log('Received payload:', payload)
    const response: APIResponse<GetCodeByPhoneNumberAPI['response']> = {
      error: null,
      value: DB.getCodeByPhoneNumber,
    }
    await sleep(2000)
    return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    console.log('Error processing request:', error)

    return new NextResponse(JSON.stringify(error), { status: 500 })
  }
}
