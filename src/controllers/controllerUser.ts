import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '@/server'
import { validateCPF } from '@utils/validate'
import { currencyToNumber, numberToCurrency } from '@/utils/currency'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { userSchema } from '@utils/Schema/user'
import fs from 'fs'
import path from 'path'

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.personal || false
}

export const userSelect = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      key: z.string().nonempty(),
    })
    const { data, error } = dataSchema(req.params, schema)
    if (!data || error) {
      res.status(400).json({ message: error || 'Chave inválida!' })
      return
    }

    const query = req.query
    const authValues = query.auth?.toString().split(',')

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // get auth
    let auth = await prisma.auth.findUnique({ where: { uuid: token.authUuid } })
    if (!auth) {
      res.status(404).json({ message: 'Autorização não encontrada!' })
      return
    }

    let uuid: string | undefined
    if (data.key === 'all') {
      uuid = undefined
    } else if (data.key === 'this') {
      uuid = token.uuid
      auth = {
        ...auth,
        personal: true,
        financial: true,
      }
    } else {
      uuid = data.key as string
    }

    // get user(s) in db
    const users = await prisma.user.findMany({
      select: {
        uuid: true,
        photo: true,
        cpf: auth.personal,
        name: auth.personal,
        username: true,
        email: true,
        phone: auth.personal,
        active: true,
        hourlyRate: auth.financial,
        authUuid: true,
        auth: {
          select: {
            type: true,
          },
        },
      },
      where: {
        uuid: uuid,
        cpf: { contains: query.cpf?.toString() },
        name: { contains: query.name?.toString() },
        username: { contains: query.username?.toString() },
        email: { contains: query.email?.toString() },
        phone: { contains: query.phone?.toString() },
        active:
          query.status === 'true' || query.status === 'false' ? query.status === 'true' : undefined,
        hourlyRate: {
          gte: query.hourlyRateMin
            ? currencyToNumber(query.hourlyRateMin.toString(), 'BRL')
            : undefined,
          lte: query.hourlyRateMax
            ? currencyToNumber(query.hourlyRateMax.toString(), 'BRL')
            : undefined,
        },
        authUuid: authValues?.length ? { in: authValues } : undefined,
      },
    })

    // format user(s)
    const response = users.map((user) => ({
      ...user,
      hourlyRate: user.hourlyRate ? numberToCurrency(user.hourlyRate.toNumber(), 'BRL') : null,
      type: user.auth.type,
    }))

    res.status(200).json(response)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      cpf: userSchema.cpf,
      name: userSchema.name,
      username: userSchema.username,
      email: userSchema.email,
      passwordNew: userSchema.password,
      passwordCheck: userSchema.password,
      phone: userSchema.phone,
      active: userSchema.active,
      hourlyRate: userSchema.hourlyRate,
      authUuid: userSchema.authUuid,
    })
    type SchemaProps = z.infer<typeof schema>
    const { data, error }: { data: SchemaProps; error: string } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if has user
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para criar esses dados!' })
      return
    }

    // check if cpf is valid
    if (!validateCPF(data.cpf)) {
      res.status(403).json({ message: 'CPF inválido!' })
      return
    }

    // check if cpf has registered
    const cpf = await prisma.user.findUnique({ where: { cpf: data.cpf } })
    if (cpf) {
      res.status(403).json({ message: 'Esse CPF já foi registrado!' })
      return
    }

    // check if email has registered
    const email = await prisma.user.findUnique({ where: { email: data.email } })
    if (email) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // check if both passwords are the same
    if (data.passwordNew !== data.passwordCheck) {
      res.status(403).json({ message: 'A nova senha está diferente da confirmação de senha!' })
      return
    }

    // hash password
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(data.passwordNew, salt)

    // check if hourlyRate is required
    const auth = await prisma.auth.findUnique({ where: { uuid: data.authUuid } })
    if (!auth) {
      res.status(404).json({ message: 'Autorização não encontrada!' })
      return
    }
    if (auth.project && !data.hourlyRate) {
      res.status(403).json({ message: 'Usuário precisa do valor da hora!' })
      return
    }

    // create resource
    await prisma.user.create({
      data: {
        cpf: data.cpf,
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashPassword,
        phone: data.phone,
        active: data.active,
        hourlyRate: data.hourlyRate ? currencyToNumber(data.hourlyRate, 'BRL') : null,
        authUuid: data.authUuid,
      },
    })

    res.status(201).json({ message: 'O usuário foi cadastrado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: userSchema.uuid,
      name: userSchema.name,
      username: userSchema.username,
      email: userSchema.email,
      phone: userSchema.phone,
      active: userSchema.active,
      hourlyRate: userSchema.hourlyRate,
      authUuid: userSchema.authUuid,
    })
    type SchemaProps = z.infer<typeof schema>
    const { data, error }: { data: SchemaProps; error: string } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user exist
    const user = await prisma.user.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // check if email has registered
    const email = await prisma.user.findUnique({ where: { email: data.email } })
    if (email && email.id !== user.id) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      // check if is main user
      if (token.uuid !== data.uuid) {
        res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
        return
      }

      // check if user has authorization over the position
      if (data.authUuid !== user.authUuid) {
        res
          .status(403)
          .json({ message: 'Usuário sem autorização para promover ou rebaixar cargo/função!' })
        return
      }
    }

    // check if user has or not hourlyRate
    const auth = await prisma.auth.findUnique({ where: { uuid: data.authUuid } })
    if (!auth) {
      res.status(404).json({ message: 'Autorização não encontrada!' })
      return
    }
    if (!auth.project && data.hourlyRate) {
      res.status(403).json({ message: 'Usuário não precisa do valor da hora!' })
      return
    }
    if (auth.project && !data.hourlyRate) {
      res.status(403).json({ message: 'Usuário precisa do valor da hora!' })
      return
    }

    // create resource
    const userUpdated = await prisma.user.update({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        phone: data.phone,
        active: data.active,
        hourlyRate: data.hourlyRate ? currencyToNumber(data.hourlyRate, 'BRL') : undefined,
        authUuid: data.authUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    // check if main user still active
    if (token.uuid === userUpdated.uuid && !userUpdated.active) {
      try {
        // clear cookies
        if (req.cookies['token']) {
          res.clearCookie('token')
        }
        res.status(418).json({ message: 'Eitah me inativei kkkkkkkk!' })
        return
      } catch (e) {
        console.log(e)
        res.status(500).json({ message: 'Erro no servidor!' })
        return
      }
    }

    res.status(201).json({ message: 'As informações do usuário foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userUpdatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: userSchema.uuid,
      passwordCurrent: userSchema.password.optional(),
      passwordNew: userSchema.password,
      passwordCheck: userSchema.password,
    })
    type SchemaProps = z.infer<typeof schema>
    const { data, error }: { data: SchemaProps; error: string } = dataSchema(req.body, schema)
    if (error) {
      res.status(400).json({ message: error })
      return
    }

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      // check if is the main user
      if (token.uuid !== data.uuid) {
        res.status(403).json({ message: 'Usuário sem autorização para alterar a senha!' })
        return
      }
      // he needs to check current password
      if (!data.passwordCurrent) {
        res.status(403).json({ message: 'Usuário precisa da senha atual!' })
        return
      }
      // get user information
      const user = await prisma.user.findUnique({
        where: {
          uuid: data.uuid,
        },
      })
      if (!user) {
        res.status(404).json({ message: 'Usuário não encontrado!' })
        return
      }
      // check if was the main user
      const isMatch = await bcrypt.compare(data.passwordCurrent, user.password)
      if (!isMatch) {
        res.status(403).json({ message: 'Senha atual inválida!' })
        return
      }
    }

    // check that the passwords are the same
    if (data.passwordNew !== data.passwordCheck) {
      res.status(403).json({ message: 'Confirme a nova senha!' })
      return
    }

    // hash password
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(data.passwordNew, salt)

    // create resource
    await prisma.user.update({
      data: {
        password: hashPassword,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'A senha do usuáio foi atualizada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userUpdatePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    // get file
    const file = req.file
    if (!file) {
      res.status(403).json({ message: 'Envie uma imagem!' })
      return
    }
    const photo = new File([file.buffer], file.originalname, { type: file.mimetype })

    // check schema
    const schema = z.object({
      uuid: userSchema.uuid,
      photo: userSchema.photo,
    })
    const { data, error } = dataSchema({ uuid: req.body.uuid, photo: photo }, schema)
    if (!data || error) {
      res.status(400).json({ message: error || 'Foto inválida!' })
      return
    }

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user is registered
    const user = await prisma.user.findUnique({ where: { uuid: data.uuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      // check if is the main user
      if (token.uuid !== data.uuid) {
        res.status(403).json({ message: 'Usuário sem autorização para alterar a foto!' })
        return
      }
    }

    // delete old photo
    if (user.photo) {
      const photoPath = path.resolve(`src/images/users/${user.photo}`)
      fs.unlink(photoPath, (err) => {
        if (err) {
          console.error('Erro ao deletar a foto: ', err)
        } else {
          console.log('Foto deletada com sucesso:', photoPath)
        }
      })
    }

    // create resource
    await prisma.user.update({
      data: {
        photo: file.filename,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'Foto atualiza.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userDeletePhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: userSchema.uuid,
    })
    const { data, error } = dataSchema({ uuid: req.body.uuid }, schema)
    if (!data || error) {
      res.status(400).json({ message: error || 'UUID inválido!' })
      return
    }

    // check if has token
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user is registered
    const user = await prisma.user.findUnique({ where: { uuid: data.uuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      // check if is the main user
      if (token.uuid !== data.uuid) {
        res.status(403).json({ message: 'Usuário sem autorização para deletar a foto!' })
        return
      }
    }

    // delete old photo
    if (user.photo) {
      const photoPath = path.resolve(`src/images/users/${user.photo}`)
      fs.unlink(photoPath, (err) => {
        if (err) {
          console.error('Erro ao deletar a foto: ', err)
        } else {
          console.log('Foto deletada com sucesso:', photoPath)
        }
      })
    }

    // create resource
    await prisma.user.update({
      data: {
        photo: null,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'Foto deletada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const userDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para excluir os dados!' })
      return
    }

    // check if user exist
    const user = await prisma.user.findUnique({ where: { uuid: uuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // create resource
    const userDeleted = await prisma.user.delete({
      where: {
        uuid: uuid,
      },
    })

    // check if main user still active
    if (token.uuid === userDeleted.uuid) {
      try {
        // clear cookies
        if (req.cookies['token']) {
          res.clearCookie('token')
        }
        res.status(418).json({ message: 'Eitah me deletei kkkkkkkk!' })
        return
      } catch (e) {
        console.log(e)
        res.status(500).json({ message: 'Erro no servidor!' })
        return
      }
    }

    res.status(201).json({ message: 'O usuário foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
