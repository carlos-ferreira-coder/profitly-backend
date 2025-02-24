import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''

export const auth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies['token']

    console.log(`token: ${req.cookies}`)

    // check if has token authorization
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // pass token information to req
    const decoded = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!decoded) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    req.user = {
      uuid: decoded.uuid,
      authUuid: decoded.authUuid,
    }

    next()
  } catch (e) {
    console.log(e)
    res.status(401).json({ message: 'Token de autorização inválido!' })
    return
  }
}
