import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { PrismaClient } from '@prisma/client'
import { auth } from '@middlewares/auth'
import routerAuth from '@routers/routerAuth'
import routerUser from '@routers/routerUser'
import routerStatus from '@routers/routerStatus'
import routerClient from '@routers/routerClient'
import routerSupplier from '@routers/routerSupplier'
import routerProject from '@routers/routerProject'
import routerTask from '@routers/routerTask'
import routerExpense from '@routers/routerExpense'
import routerActivity from '@routers/routerActivity'
import routerTransaction from '@routers/routerTransaction'

const DOMAIN = process.env.DOMAIN || ''
const PORT = process.env.PORT || ''
const JWT_SECRET = process.env.JWT_SECRET || ''
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || '',
  methods: process.env.CORS_METHODS?.split(',') || [],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
}

const app = express()
export const prisma = new PrismaClient()

app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser(JWT_SECRET))

app.use('/user', auth, routerUser)
app.use('/auth', routerAuth)
app.use('/status', auth, routerStatus)
app.use('/project', auth, routerProject)
app.use('/task', auth, routerTask)
app.use('/expense', auth, routerExpense)
app.use('/activity', auth, routerActivity)
app.use('/client', auth, routerClient)
app.use('/supplier', auth, routerSupplier)
app.use('/transaction', auth, routerTransaction)

app.use('/img/user', auth, express.static('src/images/users'))

const start = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is running on ${DOMAIN}:${PORT}`)
    })
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

start()
