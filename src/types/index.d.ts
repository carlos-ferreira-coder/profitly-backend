import 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        uuid: string
        authUuid: string
      }
    }
  }
}
