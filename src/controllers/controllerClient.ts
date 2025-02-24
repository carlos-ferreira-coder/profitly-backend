import { Request, Response } from 'express'
import { prisma } from '@/server'
import { validateCPF, validateCNPJ } from '@utils/validate'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { clientSchema } from '@utils/Schema/client'

export const clientSelect = async (req: Request, res: Response): Promise<void> => {
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

    // ClientType enum
    const ClientType = ['Person', 'Enterprise'] as const

    const typeValues = query.type?.toString().split(',')

    const type = typeValues?.reduce((acc: (typeof ClientType)[number][], value) => {
      if (ClientType.includes(value as (typeof ClientType)[number])) {
        acc.push(value as (typeof ClientType)[number])
      }
      return acc
    }, []) || ['Person', 'Enterprise']

    // check if has token
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get client(s) in db
    const clients = await prisma.client.findMany({
      where: {
        uuid: uuid,
        type: { in: type },
        cpf: { contains: query.cpf?.toString() },
        cnpj: { contains: query.cnpj?.toString() },
        name: { contains: query.name?.toString() },
        fantasy: { contains: query.fantasy?.toString() },
        email: { contains: query.email?.toString() },
        phone: { contains: query.phone?.toString() },
        active:
          query.status === 'true' || query.status === 'false' ? query.status === 'true' : undefined,
      },
    })

    res.status(200).json(clients)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const clientCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    let schema
    if (req.body.type === 'Person') {
      schema = z.object({
        type: z.literal('Person'),
        cpf: clientSchema.cpf,
        name: clientSchema.name,
        email: clientSchema.email,
        phone: clientSchema.phone,
        active: clientSchema.active,
      })
    } else if (req.body.type === 'Enterprise') {
      schema = z.object({
        type: z.literal('Enterprise'),
        cnpj: clientSchema.cnpj,
        name: clientSchema.name,
        fantasy: clientSchema.fantasy,
        email: clientSchema.email,
        phone: clientSchema.phone,
        active: clientSchema.active,
      })
    } else {
      res.status(400).json({ message: 'Selecione um tipo válido' })
      return
    }

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

    // check if cpf is valid
    if ('cpf' in data) {
      if (!validateCPF(data.cpf)) {
        res.status(403).json({ message: 'CPF inválido!' })
        return
      }

      // check if cpf has registered
      const client = await prisma.client.findUnique({ where: { cpf: data.cpf } })
      if (client) {
        res.status(403).json({ message: 'Esse CPF já foi registrado!' })
        return
      }
    }

    // check if cnpj is valid
    if ('cnpj' in data) {
      if (!validateCNPJ(data.cnpj)) {
        res.status(403).json({ message: 'CNPJ inválido!' })
        return
      }

      // check if cnpj has registered
      const client = await prisma.client.findUnique({ where: { cnpj: data.cnpj } })
      if (client) {
        res.status(403).json({ message: 'Esse CNPJ já foi registrado!' })
        return
      }
    }

    // check if email has registered
    const email = await prisma.client.findUnique({ where: { email: data.email } })
    if (email) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // create resource
    await prisma.client.create({
      data: {
        type: data.type,
        cpf: 'cpf' in data ? data.cpf : undefined,
        cnpj: 'cnpj' in data ? data.cnpj : undefined,
        name: data.name,
        fantasy: 'fantasy' in data ? data.fantasy : undefined,
        email: data.email,
        phone: data.phone,
        active: data.active,
      },
    })

    res.status(201).json({ message: 'O cliente foi cadastrado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const clientUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: clientSchema.uuid,
      name: clientSchema.name,
      fantasy: clientSchema.fantasy.nullable(),
      email: clientSchema.email,
      phone: clientSchema.phone,
      active: clientSchema.active,
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

    // check if client exist
    const client = await prisma.client.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!client) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // check if email has registered
    const email = await prisma.client.findUnique({ where: { email: data.email } })
    if (email && email.id !== client.id) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // create resource
    await prisma.client.update({
      data: {
        name: data.name,
        fantasy: data.fantasy,
        email: data.email,
        phone: data.phone,
        active: data.active,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações do cliente foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const clientDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // check if client exist
    const client = await prisma.client.findUnique({ where: { uuid: uuid } })
    if (!client) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // create resource
    await prisma.client.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'O cliente foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
