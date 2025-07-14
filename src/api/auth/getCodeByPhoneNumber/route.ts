export async function POST(_request: Request) {
  try {
    // const payload: GetWordAPI['payload'] = await request.json()
    return new Response()
  } catch (error) {
    return new Response(JSON.stringify(error), { status: 500 })
  }
}
