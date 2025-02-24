import { Request, Response } from 'express'
import { prisma } from '@/server'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { transactionSchema } from '@utils/Schema/transaction'
import { currencyToNumber, numberToCurrency } from '@utils/currency'

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.financial || false
}

export const transactionSelect = async (req: Request, res: Response): Promise<void> => {
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

    // TransactionType enum
    const TransactionType = [
      'Income',
      'Expense',
      'Transfer',
      'Loan',
      'Adjustment',
      'Refund',
    ] as const

    const typeValues = query.type?.toString().split(',')

    const type = typeValues?.reduce((acc: (typeof TransactionType)[number][], value) => {
      if (TransactionType.includes(value as (typeof TransactionType)[number])) {
        acc.push(value as (typeof TransactionType)[number])
      }
      return acc
    }, []) || ['Income', 'Expense', 'Transfer', 'Loan', 'Adjustment', 'Refund']

    // check if has token
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get transaction(s) in db
    const transactions = await prisma.transaction.findMany({
      select: {
        uuid: true,
        type: true,
        amount: true,
        date: true,
        description: true,
        clientUuid: true,
        projectUuid: true,
        userUuid: true,
        client: {
          select: {
            type: true,
            cpf: true,
            cnpj: true,
            name: true,
            fantasy: true,
          },
        },
        project: {
          select: {
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            username: true,
            email: true,
          },
        },
      },
      where: {
        uuid: uuid,
        type: { in: type },
        amount: {
          gte: query.amountMin ? currencyToNumber(query.amountMin.toString(), 'BRL') : undefined,
          lte: query.amountMax ? currencyToNumber(query.amountMax.toString(), 'BRL') : undefined,
        },
        date: {
          gte: query.dateMin ? new Date(query.dateMin.toString()) : undefined,
          lte: query.dateMax ? new Date(query.dateMax.toString()) : undefined,
        },
        description: { contains: query.description?.toString() },
        clientUuid: query.clientUuid ? query.clientUuid.toString() : undefined,
        userUuid: query.userUuid ? query.userUuid.toString() : undefined,
        projectUuid: query.projectUuid ? query.projectUuid.toString() : undefined,
      },
    })

    // format user(s)
    const response = transactions.map((transaction) => {
      const date = transaction.date

      const year = String(date.getFullYear()).slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return {
        ...transaction,
        amount: numberToCurrency(transaction.amount.toNumber(), 'BRL'),
        date: `${day}/${month}/${year} ${hour}:${minute}`,
      }
    })

    res.status(200).json(response)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const transactionCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    const TransactionType = [
      'Income',
      'Expense',
      'Transfer',
      'Loan',
      'Adjustment',
      'Refund',
    ] as const

    // check schema
    const schema = z.object({
      type: z.enum(TransactionType, {
        message:
          'O tipo deve ser um dos valores permitidos: Income, Expense, Transfer, Loan, Adjustment, Refund',
      }),
      amount: transactionSchema.amount,
      date: transactionSchema.date,
      description: transactionSchema.description,
      clientUuid: transactionSchema.clientUuid,
      projectUuid: transactionSchema.projectUuid,
      userUuid: transactionSchema.userUuid,
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

    // check if client has registered
    const client = await prisma.client.findUnique({ where: { uuid: data.clientUuid } })
    if (!client) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // check if project has registered
    if (data.projectUuid) {
      const project = await prisma.project.findUnique({ where: { uuid: data.projectUuid } })
      if (!project) {
        res.status(404).json({ message: 'Projeto não econtrado!' })
        return
      }
    }

    // check if user has registered
    const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // create resource
    await prisma.transaction.create({
      data: {
        type: data.type,
        amount: currencyToNumber(data.amount, 'BRL'),
        date: new Date(data.date),
        description: data.description,
        clientUuid: data.clientUuid,
        projectUuid: data.projectUuid,
        userUuid: data.userUuid,
      },
    })

    res.status(201).json({ message: 'A transação foi cadastrada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const transactionUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: transactionSchema.uuid,
      amount: transactionSchema.amount,
      date: transactionSchema.date,
      description: transactionSchema.description,
      clientUuid: transactionSchema.clientUuid,
      projectUuid: transactionSchema.projectUuid,
      userUuid: transactionSchema.userUuid,
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
      res.status(403).json({ message: 'Usuário sem autorização para criar esses dados!' })
      return
    }

    // check if transaction exist
    const transaction = await prisma.transaction.findUnique({ where: { uuid: data.uuid } })
    if (!transaction) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // check if client has registered
    const client = await prisma.client.findUnique({ where: { uuid: data.clientUuid } })
    if (!client) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // check if project has registered
    if (data.projectUuid) {
      const project = await prisma.project.findUnique({ where: { uuid: data.projectUuid } })
      if (!project) {
        res.status(404).json({ message: 'Projeto não econtrado!' })
        return
      }
    }

    // check if user has registered
    const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
    if (!user) {
      res.status(404).json({ message: 'Usuário não econtrado!' })
      return
    }

    // create resource
    await prisma.transaction.update({
      data: {
        amount: currencyToNumber(data.amount, 'BRL'),
        date: new Date(data.date),
        description: data.description,
        clientUuid: data.clientUuid,
        projectUuid: data.projectUuid,
        userUuid: data.userUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações da transação foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const transactionDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para criar esses dados!' })
      return
    }

    // check if transaction exist
    const transaction = await prisma.transaction.findUnique({ where: { uuid: uuid } })
    if (!transaction) {
      res.status(404).json({ message: 'Transação não econtrada!' })
      return
    }

    // create resource
    await prisma.transaction.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'A transação foi deletada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
