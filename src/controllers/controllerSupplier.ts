import { Request, Response } from 'express'
import { prisma } from '@/server'
import { validateCPF, validateCNPJ } from '@utils/validate'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { supplierSchema } from '@utils/Schema/supplier'

export const supplierSelect = async (req: Request, res: Response): Promise<void> => {
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

    // SupplierType enum
    const SupplierType = ['Person', 'Enterprise'] as const

    const typeValues = query.type?.toString().split(',')

    const type = typeValues?.reduce((acc: (typeof SupplierType)[number][], value) => {
      if (SupplierType.includes(value as (typeof SupplierType)[number])) {
        acc.push(value as (typeof SupplierType)[number])
      }
      return acc
    }, []) || ['Person', 'Enterprise']

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get supplier(s) in db
    const suppliers = await prisma.supplier.findMany({
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
        address: { contains: query.address?.toString() },
      },
    })

    res.status(200).json(suppliers)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const supplierCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    let schema
    if (req.body.type === 'Person') {
      schema = z.object({
        type: supplierSchema.type,
        cpf: supplierSchema.cpf,
        name: supplierSchema.name,
        email: supplierSchema.email,
        phone: supplierSchema.phone,
        active: supplierSchema.active,
        address: supplierSchema.address,
      })
    } else if (req.body.type === 'Enterprise') {
      schema = z.object({
        type: supplierSchema.type,
        cnpj: supplierSchema.cnpj,
        name: supplierSchema.name,
        fantasy: supplierSchema.fantasy,
        email: supplierSchema.email,
        phone: supplierSchema.phone,
        active: supplierSchema.active,
        address: supplierSchema.address,
      })
    } else {
      res.status(400).json({ message: 'Selecione um tipo válido' })
      return
    }
    const { data, error } = dataSchema(req.body, schema)
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
    if (data.type === 'Person') {
      if (!validateCPF(data.cpf)) {
        res.status(403).json({ message: 'CPF inválido!' })
        return
      }

      // check if cpf has registered
      const supplier = await prisma.supplier.findUnique({ where: { cpf: data.cpf } })
      if (supplier) {
        res.status(403).json({ message: 'Esse CPF já foi registrado!' })
        return
      }
    }

    // check if cnpj is valid
    if (data.type === 'Enterprise') {
      if (!validateCNPJ(data.cnpj)) {
        res.status(403).json({ message: 'CNPJ inválido!' })
        return
      }

      // check if cnpj has registered
      const supplier = await prisma.supplier.findUnique({ where: { cnpj: data.cnpj } })
      if (supplier) {
        res.status(403).json({ message: 'Esse CNPJ já foi registrado!' })
        return
      }
    }

    // check if email has registered
    const email = await prisma.supplier.findUnique({ where: { email: data.email } })
    if (email) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // create resource
    await prisma.supplier.create({
      data: {
        type: data.type,
        cpf: data.cpf,
        cnpj: data.cnpj,
        name: data.name,
        fantasy: data.fantasy,
        email: data.email,
        phone: data.phone,
        active: data.active,
        address: data.address,
      },
    })

    res.status(201).json({ message: 'O fornecedor foi cadastrado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const supplierUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: supplierSchema.uuid,
      name: supplierSchema.name,
      fantasy: supplierSchema.fantasy.nullable(),
      email: supplierSchema.email,
      phone: supplierSchema.phone,
      active: supplierSchema.active,
      address: supplierSchema.address,
    })
    const { data, error } = dataSchema(req.body, schema)
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

    // check if supplier exist
    const supplier = await prisma.supplier.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!supplier) {
      res.status(404).json({ message: 'Fornecedor não econtrado!' })
      return
    }

    // check if email has registered
    const email = await prisma.supplier.findUnique({ where: { email: data.email } })
    if (email && email.id !== supplier.id) {
      res.status(403).json({ message: 'Esse email já foi registrado!' })
      return
    }

    // create resource
    await prisma.supplier.update({
      data: {
        name: data.name,
        fantasy: data.fantasy,
        email: data.email,
        phone: data.phone,
        active: data.active,
        address: data.address,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações do fornecedor foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const supplierDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // check if supplier exist
    const supplier = await prisma.supplier.findUnique({ where: { uuid: uuid } })
    if (!supplier) {
      res.status(404).json({ message: 'Fornecedor não econtrado!' })
      return
    }

    // create resource
    await prisma.supplier.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'O fornecedor foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
