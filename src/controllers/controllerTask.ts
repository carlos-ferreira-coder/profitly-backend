import { Request, Response } from 'express'
import { prisma } from '@/server'
import { currencyToNumber, numberToCurrency } from '@/utils/currency'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { taskSchema } from '@utils/Schema/task'

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.project || false
}

export const taskSelect = async (req: Request, res: Response): Promise<void> => {
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
    const TaskType = ['Activity', 'Expense'] as const

    const typeValues = query.type?.toString().split(',')

    const type = typeValues?.reduce((acc: (typeof TaskType)[number][], value) => {
      if (TaskType.includes(value as (typeof TaskType)[number])) {
        acc.push(value as (typeof TaskType)[number])
      }
      return acc
    }, []) || ['Activity', 'Expense']

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
    } // TODO fazer auth financial

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get task(s) in db
    const tasks = await prisma.task.findMany({
      select: {
        uuid: true,
        type: true,
        description: true,
        beginDate: true,
        endDate: true,
        hourlyRate: true,
        cost: true,
        revenue: true,
        statusUuid: true,
        userUuid: true,
        projectUuid: true,
        expense: {
          select: {
            cost: true,
          },
        },
        activity: {
          select: {
            beginDate: true,
            endDate: true,
            hourlyRate: true,
          },
        },
      },
      where: {
        uuid: uuid,
        type: { in: type },
        description: { contains: query.description?.toString() },
        beginDate: query.beginDate ? { gte: new Date(query.beginDate.toString()) } : undefined,
        endDate: query.endDate ? { lte: new Date(query.endDate.toString()) } : undefined,
        hourlyRate: {
          gte: query.hourlyRateMin
            ? currencyToNumber(query.hourlyRateMin.toString(), 'BRL')
            : undefined,
          lte: query.hourlyRateMax
            ? currencyToNumber(query.hourlyRateMax.toString(), 'BRL')
            : undefined,
        },
        cost: {
          gte: query.costMin ? currencyToNumber(query.costMin.toString(), 'BRL') : undefined,
          lte: query.costMax ? currencyToNumber(query.costMax.toString(), 'BRL') : undefined,
        },
        revenue: {
          gte: query.revenueMin ? currencyToNumber(query.revenueMin.toString(), 'BRL') : undefined,
          lte: query.revenueMax ? currencyToNumber(query.revenueMax.toString(), 'BRL') : undefined,
        },
        statusUuid: query.statusUuid ? query.statusUuid.toString() : undefined,
        userUuid: query.userUuid ? query.userUuid.toString() : undefined,
        projectUuid: query.projectUuid ? query.projectUuid.toString() : undefined,
        budgetUuid: query.budgetUuid
          ? query.budgetUuid.toString() === 'null'
            ? null
            : query.budgetUuid.toString()
          : undefined,
      },
    })

    // format task(s)
    const response = tasks.map((task) => {
      if (task.type === 'Expense') {
        const prevCost: number = task.cost?.toNumber() || 0
        const cost: number = task.expense.reduce((sum, expense) => sum + expense.cost.toNumber(), 0)

        return {
          ...task,
          prevCost: numberToCurrency(prevCost, 'BRL'),
          cost: numberToCurrency(cost, 'BRL'),
        }
      }

      const prevHours: number = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
      const prevHourlyRate: number = task.hourlyRate?.toNumber() || 0

      const cost: number = task.activity.reduce((sum, activity) => {
        const hours = (activity.endDate.getTime() - activity.beginDate.getTime()) / 3600000
        return sum + hours * activity.hourlyRate.toNumber()
      }, 0)

      const hourlyRate: number =
        task.activity.length > 0
          ? task.activity.reduce((sum, activity) => sum + activity.hourlyRate.toNumber(), 0) /
            task.activity.length
          : 0

      return {
        ...task,
        prevCost: numberToCurrency(prevHours * prevHourlyRate, 'BRL'),
        prevHourlyRate: numberToCurrency(task.hourlyRate?.toNumber() || 0, 'BRL'),
        cost: numberToCurrency(cost, 'BRL'),
        hourlyRate: numberToCurrency(hourlyRate, 'BRL'),
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

export const taskCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    let schema
    if (req.body.type === 'Activity') {
      schema = z
        .object({
          type: z.literal('Activity'),
          description: taskSchema.description,
          beginDate: taskSchema.beginDate,
          endDate: taskSchema.endDate,
          hourlyRate: taskSchema.hourlyRate,
          revenue: taskSchema.revenue,
          statusUuid: taskSchema.statusUuid,
          userUuid: taskSchema.userUuid,
          projectUuid: taskSchema.projectUuid,
        })
        .superRefine(({ beginDate, endDate, hourlyRate }, ctx) => {
          if (beginDate > endDate) {
            ctx.addIssue({
              code: 'custom',
              message: 'A data final não pode ser antes da data inicial!',
              path: ['endDate'],
            })
          }

          if (hourlyRate === null) {
            ctx.addIssue({
              code: 'custom',
              message: 'O valor da hora é obrigatório!',
              path: ['hourlyRate'],
            })
          }
        })
    } else if (req.body.type === 'Expense') {
      schema = z
        .object({
          type: z.literal('Expense'),
          description: taskSchema.description,
          beginDate: taskSchema.beginDate,
          endDate: taskSchema.endDate,
          cost: taskSchema.cost,
          revenue: taskSchema.revenue,
          statusUuid: taskSchema.statusUuid,
          userUuid: taskSchema.userUuid,
          projectUuid: taskSchema.projectUuid,
        })
        .superRefine(({ beginDate, endDate, cost }, ctx) => {
          if (beginDate > endDate) {
            ctx.addIssue({
              code: 'custom',
              message: 'A data final não pode ser antes da data inicial!',
              path: ['endDate'],
            })
          }

          if (cost === null) {
            ctx.addIssue({
              code: 'custom',
              message: 'O custo é obrigatório!',
              path: ['cost'],
            })
          }
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

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para criar esses dados!' })
      return
    }

    // check if status has registered
    const status = await prisma.status.findUnique({ where: { uuid: data.statusUuid } })
    if (!status) {
      res.status(404).json({ message: 'Status não econtrado!' })
      return
    }

    // check if project has registered
    const project = await prisma.project.findUnique({ where: { uuid: data.projectUuid } })
    if (!project) {
      res.status(404).json({ message: 'Projeto não econtrado!' })
      return
    }

    // check if user has registered
    if (data.userUuid) {
      const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
      if (!user) {
        res.status(404).json({ message: 'Usuário não econtrado!' })
        return
      }
    }

    // create resource
    await prisma.task.create({
      data: {
        type: data.type,
        description: data.description,
        beginDate: new Date(data.beginDate),
        endDate: new Date(data.endDate),
        hourlyRate: 'hourlyRate' in data ? data.hourlyRate : undefined,
        cost: 'cost' in data ? currencyToNumber(data.cost || '0', 'BRL') : undefined,
        revenue: data.revenue,
        statusUuid: data.statusUuid,
        userUuid: data.userUuid,
        projectUuid: data.projectUuid,
      },
    })

    res.status(201).json({ message: 'A tarefa foi cadastrada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const taskUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z
      .object({
        uuid: taskSchema.uuid,
        description: taskSchema.description,
        beginDate: taskSchema.beginDate,
        endDate: taskSchema.endDate,
        hourlyRate: taskSchema.hourlyRate,
        cost: taskSchema.cost,
        revenue: taskSchema.revenue,
        statusUuid: taskSchema.statusUuid,
        userUuid: taskSchema.userUuid,
        projectUuid: taskSchema.projectUuid,
      })
      .superRefine(({ beginDate, endDate }, ctx) => {
        if (beginDate > endDate) {
          ctx.addIssue({
            code: 'custom',
            message: 'A data final não pode ser antes da data inicial!',
            path: ['endDate'],
          })
        }
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

    // check if task exist
    const task = await prisma.task.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!task) {
      res.status(404).json({ message: 'Projeto não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // check if status has registered
    const status = await prisma.status.findUnique({ where: { uuid: data.statusUuid } })
    if (status) {
      res.status(404).json({ message: 'Status não econtrado!' })
      return
    }

    // check if project has registered
    const project = await prisma.project.findUnique({ where: { uuid: data.projectUuid } })
    if (project) {
      res.status(404).json({ message: 'Projeto não econtrado!' })
      return
    }

    // check if user has registered
    if (data.userUuid) {
      const user = await prisma.user.findUnique({ where: { uuid: data.userUuid } })
      if (user) {
        res.status(404).json({ message: 'Usuário não econtrado!' })
        return
      }
    }

    // create resource
    await prisma.task.update({
      data: {
        description: data.description,
        beginDate: new Date(data.beginDate),
        endDate: new Date(data.endDate),
        hourlyRate: data.hourlyRate,
        cost: currencyToNumber(data.cost || '0', 'BRL'),
        revenue: currencyToNumber(data.revenue || '0', 'BRL'),
        statusUuid: data.statusUuid,
        userUuid: data.userUuid,
        projectUuid: data.projectUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações da tarefa foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const taskDelete = async (req: Request, res: Response): Promise<void> => {
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
      res.status(403).json({ message: 'Usuário sem autorização para excluir os dados!' })
      return
    }

    // check if task exist
    const task = await prisma.task.findUnique({ where: { uuid: uuid } })
    if (!task) {
      res.status(404).json({ message: 'Tarefa não econtrada!' })
      return
    }

    // create resource
    await prisma.task.delete({
      where: {
        uuid: uuid,
      },
    })

    res.status(201).json({ message: 'A tarefa foi deletada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
