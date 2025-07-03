// server/api.ts
import cors from 'cors'
import express, { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { ENDPOINTS as AUTH_ENDPOINTS } from '@api/auth/endpoints'
import { ENDPOINTS as CONSUMERS_ENDPOINTS } from '@api/consumers/endpoints'
import { ENDPOINTS as PROVIDERS_ENDPOINTS } from '@api/providers/endpoints'
import { GetProvidersListAPI } from '@api/providers/types'
import { Consumer } from '@store/consumers/profile/types'
import { Provider } from '@store/providers/profile/types'
import { apiResponseWrapper } from './middlewares/apiResponseWrapper'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())
app.use(apiResponseWrapper)

type Database = {
  consumers: Consumer[]
  providers: Provider[]
  getCodeByPhoneNumber: boolean
  validatePhoneNumberCode: boolean
}

// Database functions
const DB_PATH = path.join(process.cwd(), 'src/mock/db.json')
console.log({ DB_PATH })

function readDatabase(): Database {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error reading database:', error)
    return {
      consumers: [],
      providers: [],
      getCodeByPhoneNumber: false,
      validatePhoneNumberCode: false,
    }
  }
}

// function writeDatabase(data: Database): boolean {
//   try {
//     fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
//     return true
//   } catch (error) {
//     console.error('Error writing database:', error)
//     return false
//   }
// }

// Initialize database
let db = readDatabase()

// Routes
app.get(PROVIDERS_ENDPOINTS.getProvidersList, (_req: Request, res: Response) => {
  const basicProviders: GetProvidersListAPI['response'] = db.providers.map((provider) => {
    return {
      id: provider.id,
      basic: {
        firstName: provider.basic.firstName,
        lastName: provider.basic.lastName,
        image: provider.basic.image,
        category: provider.basic.category,
      },
    }
  })
  res.customSuccessResponse(basicProviders)
})

app.get(`${PROVIDERS_ENDPOINTS.getBasicProvider}/:id`, (req: Request, res: Response) => {
  const { id } = req.params
  const provider = db.providers.find((u) => u.id === id)

  if (!provider) res.customErrorResponse('Provider not found', 404)

  res.customSuccessResponse(provider)
})

app.get(CONSUMERS_ENDPOINTS.getConsumersList, (_req: Request, res: Response) => {
  res.customSuccessResponse(db.consumers)
})

app.get(`${CONSUMERS_ENDPOINTS.getConsumersList}/:id`, (req: Request, res: Response) => {
  const { id } = req.params
  const consumer = db.consumers.find((u) => u.id === id)

  if (!consumer) res.customErrorResponse('Consumer not found', 404)

  res.customSuccessResponse(consumer)
})

app.post(AUTH_ENDPOINTS.getCodeByPhoneNumber, (_req: Request, res: Response) => {
  res.customSuccessResponse(db.getCodeByPhoneNumber)
})

app.post(AUTH_ENDPOINTS.validatePhoneNumberCode, (_req: Request, res: Response) => {
  res.customSuccessResponse(db.validatePhoneNumberCode)
})

// app.post('/api/users', (req: Request, res: Response) => {
//   const { name, email } = req.body

//   if (!name || !email) {
//     return res.status(400).json({
//       success: false,
//       error: 'Name and email are required',
//     })
//   }

//   const newUser: User = {
//     id: Date.now().toString(),
//     name,
//     email,
//   }

//   mockUsers.push(newUser)
//   res.status(201).json({ success: true, data: newUser })
// })

// app.put('/api/users/:id', (req: Request, res: Response) => {
//   const { id } = req.params
//   const userIndex = mockUsers.findIndex((u) => u.id === id)

//   if (userIndex === -1) {
//     return res.status(404).json({ success: false, error: 'User not found' })
//   }

//   mockUsers[userIndex] = { ...mockUsers[userIndex], ...req.body }
//   res.json({ success: true, data: mockUsers[userIndex] })
// })

// app.delete('/api/users/:id', (req: Request, res: Response) => {
//   const { id } = req.params
//   const userIndex = mockUsers.findIndex((u) => u.id === id)

//   if (userIndex === -1) {
//     return res.status(404).json({ success: false, error: 'User not found' })
//   }

//   mockUsers.splice(userIndex, 1)
//   res.json({ success: true })
// })

// Error handling middleware
// app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
//   console.error(err.stack)
//   res.status(500).json({ success: false, error: 'Internal server error' })
// })

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})

export default app
