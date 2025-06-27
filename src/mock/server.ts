import cors from 'cors'
import jsonServer from 'json-server'

const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults({ noCors: false })

server.use(cors()) // Enables full CORS support
server.use(middlewares)
server.use(router)

server.listen(3001, () => {
  console.log('🚀 JSON Server is running at http://localhost:3001')
})
