import { Request, Response } from 'express'
import { prisma } from '@/server'
import { currencyToNumber, numberToCurrency } from '@/utils/currency'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { expenseSchema } from '@utils/Schema/expense'

export const expenseSelect = async (req: Request, res: Response): Promise<void> => {
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

    // check if has token
    const token = req.user
    if (!token) {
      res.status(401).json({ message: 'Token não encontrado!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get expense(s) in db
    const expenses = await prisma.expense.findMany({
      where: {
        uuid: uuid,
        description: { contains: query.description?.toString() },
        type: { contains: query.type?.toString() },
        cost: {
          gte: query.costMin ? currencyToNumber(query.costMin.toString(), 'BRL') : undefined,
          lte: query.costMax ? currencyToNumber(query.costMax.toString(), 'BRL') : undefined,
        },
        date: {
          gte: query.dateMin ? new Date(query.dateMin.toString()) : undefined,
          lte: query.dateMax ? new Date(query.dateMax.toString()) : undefined,
        },
        userUuid: query.userUuid ? query.userUuid.toString() : undefined,
        taskUuid: query.taskUuid ? query.taskUuid.toString() : undefined,
        supplierUuid: query.supplierUuid ? query.supplierUuid.toString() : undefined,
      },
    })

    // format expense(s)
    const response = expenses.map((expense) => ({
      ...expense,
      cost: expense.cost ? numberToCurrency(expense.cost.toNumber(), 'BRL') : null,
    }))

    res.status(200).json(response)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const expenseCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      description: expenseSchema.description,
      type: expenseSchema.type,
      cost: expenseSchema.cost,
      date: expenseSchema.date,
      userUuid: expenseSchema.userUuid,
      taskUuid: expenseSchema.taskUuid,
      supplierUuid: expenseSchema.supplierUuid,
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

    // check if user has registered
    const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // check if task has registered
    const task = await prisma.task.findUnique({ where: { uuid: data.taskUuid } })
    if (!task) {
      res.status(404).json({ message: 'Tarefa não econtrada!' })
      return
    }

    // check if supplier has registered
    if (data.supplierUuid) {
      const supplier = await prisma.supplier.findUnique({ where: { uuid: data.supplierUuid } })
      if (!supplier) {
        res.status(404).json({ message: 'Forncedor não econtrado!' })
        return
      }
    }

    // create resource
    await prisma.expense.create({
      data: {
        description: data.description,
        type: data.type,
        cost: currencyToNumber(data.cost, 'BRL'),
        date: new Date(data.date),
        userUuid: data.userUuid,
        taskUuid: data.taskUuid,
        supplierUuid: data.supplierUuid,
      },
    })

    res.status(201).json({ message: 'A despesa foi cadastrada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const expenseUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: expenseSchema.uuid,
      description: expenseSchema.description,
      type: expenseSchema.type,
      cost: expenseSchema.cost,
      date: expenseSchema.date,
      userUuid: expenseSchema.userUuid,
      taskUuid: expenseSchema.taskUuid,
      supplierUuid: expenseSchema.supplierUuid,
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

    // check if expense exist
    const expense = await prisma.expense.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!expense) {
      res.status(404).json({ message: 'Despesa não econtrada!' })
      return
    }

    // check if user has registered
    const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // check if task has registered
    const task = await prisma.task.findUnique({ where: { uuid: data.taskUuid } })
    if (!task) {
      res.status(404).json({ message: 'Tarefa não econtrado!' })
      return
    }

    // check if supplier has registered
    if (data.supplierUuid) {
      const supplier = await prisma.supplier.findUnique({ where: { uuid: data.supplierUuid } })
      if (!supplier) {
        res.status(404).json({ message: 'Fornecedor não econtrado!' })
        return
      }
    }

    // create resource
    await prisma.expense.update({
      data: {
        description: data.description,
        type: data.type,
        cost: currencyToNumber(data.cost || '0', 'BRL'),
        date: new Date(data.date),
        userUuid: data.userUuid,
        taskUuid: data.taskUuid,
        supplierUuid: data.supplierUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações da despesa foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const expenseDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // check if expense exist
    const expense = await prisma.expense.findUnique({ where: { uuid: uuid } })
    if (!expense) {
      res.status(404).json({ message: 'Despesa não econtrada!' })
      return
    }

    // create resource
    await prisma.expense.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'A despesa foi deletada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
