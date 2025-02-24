import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '@/server'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { userSchema } from '@utils/Schema/user'
import { authSchema } from '@utils/Schema/auth'

const JWT_SECRET = process.env.JWT_SECRET || ''
const NODE_ENV = process.env.NODE_ENV || ''

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.admin || false
}

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      email: userSchema.email,
      password: userSchema.password,
    })
    const { data, error } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if the user is registered
    const user = await prisma.user.findUnique({ where: { email: data.email } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não cadastrado!' })
      return
    }

    // check if the user is active
    if (!user.active) {
      res.status(403).json({ message: 'Usuário inativo!' })
      return
    }

    // check if password is right
    const isMatch = await bcrypt.compare(data.password, user.password)
    if (!isMatch) {
      res.status(403).json({ message: 'Senha incorreta!' })
      return
    }

    // create jwt token
    const token = jwt.sign(
      {
        uuid: user.uuid,
        authUuid: user.authUuid,
      },
      JWT_SECRET,
    )

    // Set the token in an HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      priority: 'high',
      path: '/',
    })

    res.status(200).json({ message: 'Logado com sucesso.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // clear cookies
    if (req.cookies['token']) {
      res.clearCookie('token')
    }

    res.status(200).json({ message: 'Deslogado com sucesso.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const authCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.query
    const token = req.cookies['token']

    // check if has token authorization
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // get token information
    const userToken = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!userToken) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    // get authorizations
    const auth = await prisma.auth.findUnique({ where: { uuid: userToken.authUuid } })
    if (!auth) {
      res.status(403).json({ message: 'Autorização não encontrada!' })
      return
    }

    // typing permissons
    type permissionKey = 'admin' | 'project' | 'personal' | 'financial'
    const permissions: { key: permissionKey; label: string }[] = [
      { key: 'admin', label: 'configurações do sistema' },
      { key: 'project', label: 'dados de projetos' },
      { key: 'personal', label: 'dados pessoais' },
      { key: 'financial', label: 'dados financeiros' },
    ]

    // Scroll through the permissions to check all
    for (const permission of permissions) {
      if (data[permission.key] === 'true' && !auth[permission.key]) {
        res.status(403).json({ message: `Usuário sem autorização sobre ${permission.label}` })
        return
      }
    }

    res.status(200).json({ message: 'Usuário autorizado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const authSelect = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.params

    const query = req.query
    const typeValues = query.type?.toString().split(',')
    const authValues = query.auth?.toString().split(',')

    // check if has token authorization
    const token = req.cookies['token']
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // get token information
    const userToken = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!userToken) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    // get authorizations
    let key: string | undefined
    if (params.key === 'all') {
      key = undefined
    } else if (params.key === 'this') {
      key = userToken.authUuid
    } else {
      key = params.key
    }

    const auth = await prisma.auth.findMany({
      where: {
        uuid: key,
        type: typeValues?.length ? { in: typeValues } : undefined,
        admin: authValues?.includes('admin') ? true : undefined,
        project: authValues?.includes('project') ? true : undefined,
        personal: authValues?.includes('personal') ? true : undefined,
        financial: authValues?.includes('financial') ? true : undefined,
      },
    })
    if (!auth) {
      res.status(404).json({ message: 'Autorização não encontrada!' })
      return
    }

    res.status(200).json(auth)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const authCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      type: authSchema.type,
      admin: authSchema.admin,
      project: authSchema.project,
      personal: authSchema.personal,
      financial: authSchema.financial,
    })
    type SchemaProps = z.infer<typeof schema>
    const { data, error }: { data: SchemaProps; error: string } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if has token authorization
    const token = req.cookies['token']
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // get token information
    const userToken = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!userToken) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(userToken.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para criar esses dados!' })
      return
    }

    // create resource
    await prisma.auth.create({
      data: {
        type: data.type,
        admin: data.admin,
        project: data.project,
        personal: data.personal,
        financial: data.financial,
      },
    })

    res.status(201).json({ message: 'O cargo/função foi cadastrado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const authUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: authSchema.uuid,
      type: authSchema.type,
      admin: authSchema.admin,
      project: authSchema.project,
      personal: authSchema.personal,
      financial: authSchema.financial,
    })
    type SchemaProps = z.infer<typeof schema>
    const { data, error }: { data: SchemaProps; error: string } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if has token authorization
    const token = req.cookies['token']
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // get token information
    const userToken = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!userToken) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    // check if auth exist
    const auth = await prisma.auth.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!auth) {
      res.status(404).json({ message: 'Cargo/Função não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(userToken.authUuid)) || auth.id === 0) {
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // create resource
    await prisma.auth.update({
      data: {
        type: data.type,
        admin: data.admin,
        project: data.project,
        personal: data.personal,
        financial: data.financial,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações do cargo/função foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const authDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id
    const { uuid } = req.params

    // check if has token authorization
    const token = req.cookies['token']
    if (!token) {
      res.status(401).json({ message: 'Necessário token de autorização!' })
      return
    }

    // get token information
    const userToken = jwt.verify(token, JWT_SECRET) as Express.Request['user']
    if (!userToken) {
      res.status(401).json({ message: 'Erro na validação do token de autorização!' })
      return
    }

    // check if auth exist
    const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
    if (!auth) {
      res.status(404).json({ message: 'Cargo/Função não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(userToken.authUuid)) || auth.id === 0) {
      res.status(403).json({ message: 'Usuário sem autorização para excluir os dados!' })
      return
    }

    // create resource
    await prisma.auth.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'O cargo/função foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
