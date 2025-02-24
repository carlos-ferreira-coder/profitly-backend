import { Request, Response } from 'express'
import { prisma } from '@/server'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { statusSchema } from '@utils/Schema/status'

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.admin || false
}

export const statusSelect = async (req: Request, res: Response): Promise<void> => {
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
    const priorityValues = query.priority
      ?.toString()
      .split(',')
      .map((s) => parseInt(s))

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get user(s) in db
    const status = await prisma.status.findMany({
      where: {
        uuid: uuid,
        name: { contains: query.name?.toString() },
        priority: { in: priorityValues },
      },
    })

    res.status(200).json(status)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const statusCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      name: statusSchema.name,
      description: statusSchema.description,
      priority: statusSchema.priority,
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

    // create resource
    await prisma.status.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority,
      },
    })

    res.status(201).json({ message: 'O status foi cadastrado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const statusUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      id: statusSchema.id,
      name: statusSchema.name,
      description: statusSchema.description,
      priority: statusSchema.priority,
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

    // check if status exist
    const status = await prisma.status.findUnique({
      where: {
        id: data.id,
      },
    })
    if (!status) {
      res.status(404).json({ message: 'Status não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // create resource
    await prisma.status.update({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority,
      },
      where: {
        id: data.id,
      },
    })

    res.status(201).json({ message: 'O status foi editado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const statusDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id
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

    // check if status exist
    const status = await prisma.status.findUnique({ where: { uuid: uuid } })
    if (!status) {
      res.status(404).json({ message: 'Fornecedor não econtrado!' })
      return
    }

    // create resource
    await prisma.status.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'O status foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
