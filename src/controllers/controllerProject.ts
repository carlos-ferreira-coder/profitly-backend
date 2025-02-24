import { Request, Response } from 'express'
import { prisma } from '@/server'
import { currencyToNumber, numberToCurrency } from '@/utils/currency'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { budgetSchema, projectSchema } from '@utils/Schema/project'
import { taskSchema } from '@utils/Schema/task'

const authorization = async (uuid: string): Promise<boolean> => {
  const auth = await prisma.auth.findUnique({ where: { uuid: uuid } })
  return auth?.project || false
}

export const projectSelect = async (req: Request, res: Response): Promise<void> => {
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

    // get auth
    let auth = await prisma.auth.findUnique({ where: { uuid: token.authUuid } })
    if (!auth) {
      res.status(404).json({ message: 'Autorização não encontrada!' })
      return
    }

    // Get uuid by key
    const uuid = data.key === 'all' ? undefined : data.key

    // get project(s) in db
    const projects = await prisma.project.findMany({
      select: {
        uuid: true,
        name: true,
        description: true,
        active: true,
        clientUuid: true,
        client: {
          select: {
            name: true,
          },
        },
        statusUuid: true,
        status: {
          select: {
            name: true,
            description: true,
          },
        },
        budgetUuid: true,
        budget: {
          select: {
            date: true,
            task: {
              select: {
                type: true,
                beginDate: true,
                endDate: true,
                hourlyRate: auth.financial,
                cost: auth.financial,
                revenue: auth.financial,
                expense: {
                  select: {
                    cost: auth.financial,
                    date: true,
                  },
                },
                activity: {
                  select: {
                    beginDate: true,
                    endDate: true,
                    hourlyRate: auth.financial,
                  },
                },
              },
              where: {
                budgetUuid: { not: null },
              },
            },
          },
        },
        task: {
          select: {
            type: true,
            beginDate: true,
            endDate: true,
            hourlyRate: auth.financial,
            cost: auth.financial,
            revenue: auth.financial,
            expense: {
              select: {
                cost: auth.financial,
                date: true,
              },
            },
            activity: {
              select: {
                beginDate: true,
                endDate: true,
                hourlyRate: auth.financial,
              },
            },
          },
          where: {
            budgetUuid: null,
          },
        },
        transaction: {
          select: {
            type: auth.financial,
            amount: auth.financial,
            date: true,
          },
          where: {
            type: { in: ['Income', 'Expense'] },
          },
        },
      },
      where: {
        uuid: uuid,
        name: { contains: query.name?.toString() },
        description: { contains: query.description?.toString() },
        active:
          query.status === 'true' || query.status === 'false' ? query.status === 'true' : undefined,
        clientUuid: query.clientUuid?.toString(),
        statusUuid: query.statusUuid?.toString(),
      },
    })

    // list project dates
    const getDates = (project: (typeof projects)[number]) =>
      [
        project.budget.date,
        ...project.budget.task.flatMap((task) => [
          task.beginDate,
          task.endDate,
          ...task.expense.map((expense) => expense.date),
          ...task.activity.flatMap((activity) => [activity.beginDate, activity.endDate]),
        ]),
        ...project.task.flatMap((task) => [
          task.beginDate,
          task.endDate,
          ...task.expense.map((expense) => expense.date),
          ...task.activity.flatMap((activity) => [activity.beginDate, activity.endDate]),
        ]),
        ...project.transaction.map((transaction) => transaction.date),
      ].filter(Boolean) // Remove null and undefined

    // format date to 'dd/mm/yy --:--'
    const formatDate = (date: Date | null) => {
      if (!date) return null

      const year = String(date.getFullYear()).slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${day}/${month}/${year} ${hour}:${minute}`
    }

    // format user(s)
    const response = projects.map((project) => {
      const dates = getDates(project)

      // Get begin and end date
      const beginDate =
        dates.length > 0 ? new Date(Math.min(...dates.map((d) => new Date(d).getTime()))) : null
      const endDate =
        dates.length > 0 ? new Date(Math.max(...dates.map((d) => new Date(d).getTime()))) : null

      // Check if user has authorization
      if (!auth.financial) {
        return {
          ...project,
          beginDate: formatDate(beginDate),
          endDate: formatDate(endDate),
          financial: auth.financial,
        }
      }

      // Get prev values
      const prevTotal: number = project.budget.task.reduce((sum, task) => {
        if (task.type === 'Expense')
          return sum + task.revenue.toNumber() + (task.cost?.toNumber() || 0)

        const hours = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
        return sum + task.revenue.toNumber() * hours + (task.hourlyRate?.toNumber() || 0) * hours
      }, 0)

      const prevCost: number = project.budget.task.reduce((sum, task) => {
        if (task.type === 'Expense') return sum + (task.cost?.toNumber() || 0)

        const hours = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
        return sum + (task.hourlyRate?.toNumber() || 0) * hours
      }, 0)

      const prevRevenue: number = project.budget.task.reduce((sum, task) => {
        if (task.type === 'Expense') return sum + task.revenue.toNumber()

        const hours = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
        return sum + task.revenue.toNumber() * hours
      }, 0)

      // Get transaction values
      const currentExpense: number = project.transaction
        .filter((transaction) => transaction.type === 'Expense')
        .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0)

      const currentIncome: number = project.transaction
        .filter((transaction) => transaction.type === 'Income')
        .reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0)

      // Get tasks values
      const total: number = project.task.reduce((sum, task) => {
        if (task.type === 'Expense')
          return sum + task.revenue.toNumber() + (task.cost?.toNumber() || 0)

        const hours = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
        return sum + task.revenue.toNumber() * hours + (task.hourlyRate?.toNumber() || 0) * hours
      }, 0)

      const cost: number = project.task.reduce((sum, task) => {
        if (task.type === 'Expense') {
          return sum + task.expense.reduce((s, expense) => s + expense.cost.toNumber(), 0)
        }

        return (
          sum +
          task.activity.reduce((s, activity) => {
            const hours = (activity.endDate.getTime() - activity.beginDate.getTime()) / 3600000
            return s + activity.hourlyRate.toNumber() * hours
          }, 0)
        )
      }, 0)

      const revenue: number = project.task.reduce((sum, task) => {
        if (task.type === 'Expense') return sum + task.revenue.toNumber()

        const hours = (task.endDate.getTime() - task.beginDate.getTime()) / 3600000
        return sum + task.revenue.toNumber() * hours
      }, 0)

      return {
        ...project,
        prevTotal: numberToCurrency(prevTotal, 'BRL'),
        prevCost: numberToCurrency(prevCost, 'BRL'),
        prevRevenue: numberToCurrency(prevRevenue, 'BRL'),

        total: numberToCurrency(total, 'BRL'),
        cost: numberToCurrency(cost, 'BRL'),
        revenue: numberToCurrency(revenue, 'BRL'),

        currentExpense: numberToCurrency(currentExpense, 'BRL'),
        currentIncome: numberToCurrency(currentIncome, 'BRL'),
        currentRevenue: numberToCurrency(currentIncome - currentExpense, 'BRL'),

        beginDate: formatDate(beginDate),
        endDate: formatDate(endDate),

        financial: auth.financial,
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

export const projectCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      name: projectSchema.name,
      description: projectSchema.description,
      active: projectSchema.active,
      clientUuid: projectSchema.clientUuid,
      statusUuid: projectSchema.statusUuid,
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

    // check if status has registered
    const status = await prisma.status.findUnique({ where: { uuid: data.statusUuid } })
    if (!status) {
      res.status(404).json({ message: 'Status não econtrado!' })
      return
    }

    // create resource
    const budget = await prisma.budget.create({
      data: {
        date: new Date(),
      },
    })
    const response = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        clientUuid: data.clientUuid,
        statusUuid: data.statusUuid,
        budgetUuid: budget.uuid,
      },
    })

    res.status(201).json({ message: 'O projeto foi cadastrado.', project: response })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const projectUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: projectSchema.uuid,
      name: projectSchema.name,
      description: projectSchema.description,
      active: projectSchema.active,
      clientUuid: projectSchema.clientUuid,
      statusUuid: projectSchema.statusUuid,
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

    // check if project exist
    const project = await prisma.project.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!project) {
      res.status(404).json({ message: 'Projeto não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // check if client has registered
    const client = await prisma.client.findUnique({ where: { uuid: data.clientUuid } })
    if (!client) {
      res.status(404).json({ message: 'Cliente não econtrado!' })
      return
    }

    // check if status has registered
    const status = await prisma.status.findUnique({ where: { uuid: data.statusUuid } })
    if (!status) {
      res.status(404).json({ message: 'Status não econtrado!' })
      return
    }

    // create resource
    await prisma.project.update({
      data: {
        name: data.name,
        description: data.description,
        active: data.active,
        clientUuid: data.clientUuid,
        statusUuid: data.statusUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações do projeto foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const projectDelete = async (req: Request, res: Response): Promise<void> => {
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

    // check if project exist
    const project = await prisma.project.findUnique({ where: { uuid: uuid } })
    if (!project) {
      res.status(404).json({ message: 'Projeto não econtrado!' })
      return
    }

    // create resource
    await prisma.project.delete({
      where: {
        uuid: uuid,
      },
    })
    await prisma.budget.delete({
      where: {
        uuid: project.budgetUuid,
      },
    })

    res.status(201).json({ message: 'O projeto foi deletado.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const budgetSelect = async (req: Request, res: Response): Promise<void> => {
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

    // Get uuid by key
    const uuid = data.key

    // get budget(s) in db
    const budgets = await prisma.budget.findMany({
      select: {
        uuid: true,
        date: true,
        task: {
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
            budgetUuid: true,
          },
        },
        project: {
          select: {
            uuid: true,
          },
        },
      },
      where: {
        uuid: uuid,
      },
    })

    const formatDate = (date: Date) => {
      const year = String(date.getFullYear()).slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${day}/${month}/${year} ${hour}:${minute}`
    }

    // format budget(s)
    const response = budgets.map((budget) => {
      return {
        ...budget,
        date: formatDate(budget.date),
        task: budget.task.map((t) => ({
          ...t,
          beginDate: formatDate(t.beginDate),
          endDate: formatDate(t.endDate),
          hourlyRate: numberToCurrency(t.hourlyRate?.toNumber() || 0, 'BRL'),
          cost: numberToCurrency(t.cost?.toNumber() || 0, 'BRL'),
          revenue: numberToCurrency(t.revenue?.toNumber() || 0, 'BRL'),
        })),
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

export const budgetUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      uuid: budgetSchema.uuid,
      date: budgetSchema.date,
      task: z
        .array(
          z
            .object({
              uuid: z.string(),
              type: z.enum(['Activity', 'Expense']),
              description: taskSchema.description,
              beginDate: taskSchema.beginDate,
              endDate: taskSchema.endDate,
              hourlyRate: taskSchema.hourlyRate,
              cost: taskSchema.cost,
              revenue: taskSchema.revenue,
              statusUuid: taskSchema.statusUuid,
              userUuid: taskSchema.userUuid,
              projectUuid: taskSchema.projectUuid,
              budgetUuid: taskSchema.budgetUuid,
            })
            .superRefine(({ beginDate, endDate, type, hourlyRate, cost }, ctx) => {
              if (beginDate > endDate) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'A data final não pode ser antes da data inicial!',
                  path: ['endDate'],
                })
              }

              if (type === 'Activity' && hourlyRate === null) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'O valor da hora é obrigatório!',
                  path: ['hourlyRate'],
                })
              }

              if (type === 'Expense' && cost === null) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'O custo é obrigatório!',
                  path: ['cost'],
                })
              }
            }),
        )
        .min(1, { message: 'Insira as tarefas para prosseguir!' }),
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

    // check if budget exist
    const budget = await prisma.budget.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!budget) {
      res.status(404).json({ message: 'Orçamento não econtrado!' })
      return
    }

    // check if user has authorization
    if (!(await authorization(token.authUuid))) {
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // create resource
    await prisma.budget.update({
      data: {
        date: new Date(data.date),
      },
      where: {
        uuid: data.uuid,
      },
    })

    // format task(s)
    const tasks = data.task.map((task) => ({
      ...task,
      beginDate: new Date(task.beginDate),
      endDate: new Date(task.endDate),
      hourlyRate: currencyToNumber(task.hourlyRate || '0', 'BRL'),
      cost: currencyToNumber(task.cost || '0', 'BRL'),
      revenue: currencyToNumber(task.revenue || '0', 'BRL'),
    }))

    const tasksToCreate = tasks
      .filter((task) => task.uuid === '')
      .map((task) => ({
        ...task,
        uuid: undefined,
      }))

    const tasksToUpdate = tasks.filter((task) => task.uuid !== '')

    const tasksToDelete = await prisma.task.findMany({
      where: {
        uuid: { notIn: tasks.filter((task) => task.uuid !== '').map((task) => task.uuid) },
        budgetUuid: budget.uuid,
      },
    })

    // Create resources
    await prisma.task.createMany({
      data: tasksToCreate,
      skipDuplicates: true,
    })
    await Promise.all(
      tasksToUpdate.map((task) => {
        return prisma.task.update({
          where: { uuid: task.uuid },
          data: task,
        })
      }),
    )
    await prisma.task.deleteMany({
      where: {
        uuid: { in: tasksToDelete.map((task) => task.uuid) },
      },
    })

    res.status(201).json({ message: 'As informações do orçamento foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const tasksSelect = async (req: Request, res: Response): Promise<void> => {
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

    // Get uuid by key
    const projectUuid = data.key

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
      },
      where: {
        projectUuid: projectUuid,
        budgetUuid: null,
      },
    })

    const formatDate = (date: Date) => {
      const year = String(date.getFullYear()).slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${day}/${month}/${year} ${hour}:${minute}`
    }

    // format task(s)
    const response = tasks.map((task) => {
      return {
        ...task,
        beginDate: formatDate(task.beginDate),
        endDate: formatDate(task.endDate),
        hourlyRate: numberToCurrency(task.hourlyRate?.toNumber() || 0, 'BRL'),
        cost: numberToCurrency(task.cost?.toNumber() || 0, 'BRL'),
        revenue: numberToCurrency(task.revenue?.toNumber() || 0, 'BRL'),
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

export const tasksUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z.object({
      task: z
        .array(
          z
            .object({
              uuid: z.string(),
              type: z.enum(['Activity', 'Expense']),
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
            .superRefine(({ beginDate, endDate, type, hourlyRate, cost }, ctx) => {
              if (beginDate > endDate) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'A data final não pode ser antes da data inicial!',
                  path: ['endDate'],
                })
              }

              if (type === 'Activity' && hourlyRate === null) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'O valor da hora é obrigatório!',
                  path: ['hourlyRate'],
                })
              }

              if (type === 'Expense' && cost === null) {
                ctx.addIssue({
                  code: 'custom',
                  message: 'O custo é obrigatório!',
                  path: ['cost'],
                })
              }
            }),
        )
        .min(1, { message: 'Insira as tarefas para prosseguir!' }),
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
      res.status(403).json({ message: 'Usuário sem autorização para editar esses dados!' })
      return
    }

    // format task(s)
    const tasks = data.task.map((task) => ({
      ...task,
      beginDate: new Date(task.beginDate),
      endDate: new Date(task.endDate),
      hourlyRate: currencyToNumber(task.hourlyRate || '0', 'BRL'),
      cost: currencyToNumber(task.cost || '0', 'BRL'),
      revenue: currencyToNumber(task.revenue || '0', 'BRL'),
    }))

    const tasksToCreate = tasks
      .filter((task) => task.uuid === '')
      .map((task) => ({
        ...task,
        uuid: undefined,
      }))

    const tasksToUpdate = tasks.filter((task) => task.uuid !== '')

    const tasksToDelete = await prisma.task.findMany({
      where: {
        uuid: { notIn: tasks.filter((task) => task.uuid !== '').map((task) => task.uuid) },
        budgetUuid: null,
      },
    })

    // Create resources
    await prisma.task.createMany({
      data: tasksToCreate,
      skipDuplicates: true,
    })
    await Promise.all(
      tasksToUpdate.map((task) => {
        return prisma.task.update({
          where: { uuid: task.uuid },
          data: task,
        })
      }),
    )
    await prisma.task.deleteMany({
      where: {
        uuid: { in: tasksToDelete.map((task) => task.uuid) },
      },
    })

    res.status(201).json({ message: 'As informações das tarefas foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}
