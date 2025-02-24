import { Request, Response } from 'express'
import { prisma } from '@/server'
import z from 'zod'
import { dataSchema } from '@utils/Schema/schemas'
import { activitySchema } from '@utils/Schema/activity'
import { currencyToNumber, numberToCurrency } from '@utils/currency'

export const activitySelect = async (req: Request, res: Response): Promise<void> => {
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

    // get activity(s) in db
    const activitys = await prisma.activity.findMany({
      where: {
        uuid: uuid,
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
        userUuid: query.userUuid ? query.userUuid.toString() : undefined,
        taskUuid: query.taskUuid ? query.taskUuid.toString() : undefined,
      },
    })

    // format user(s)
    const response = activitys.map((activity) => ({
      ...activity,
      hourlyRate: numberToCurrency(activity.hourlyRate.toNumber(), 'BRL'),
    }))

    res.status(200).json(response)
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const activityCreate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z
      .object({
        description: activitySchema.description,
        beginDate: activitySchema.beginDate,
        endDate: activitySchema.endDate,
        hourlyRate: activitySchema.hourlyRate,
        userUuid: activitySchema.userUuid,
        taskUuid: activitySchema.taskUuid,
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

    // create resource
    await prisma.activity.create({
      data: {
        description: data.description,
        beginDate: new Date(data.beginDate),
        endDate: new Date(data.endDate),
        hourlyRate: currencyToNumber(data.hourlyRate, 'BRL'),
        userUuid: data.userUuid,
        taskUuid: data.taskUuid,
      },
    })

    res.status(201).json({ message: 'A atividade foi cadastrada.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const activityUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    // check schema
    const schema = z
      .object({
        uuid: activitySchema.uuid,
        description: activitySchema.description,
        beginDate: activitySchema.beginDate,
        endDate: activitySchema.endDate,
        hourlyRate: activitySchema.hourlyRate,
        userUuid: activitySchema.userUuid,
        taskUuid: activitySchema.taskUuid,
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

    // check if activity exist
    const activity = await prisma.activity.findUnique({
      where: {
        uuid: data.uuid,
      },
    })
    if (!activity) {
      res.status(404).json({ message: 'Atividade não econtrado!' })
      return
    }

    // check if cliusereusernt has registered
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

    // create resource
    await prisma.activity.update({
      data: {
        uuid: data.uuid,
        description: data.description,
        beginDate: new Date(data.beginDate),
        endDate: new Date(data.endDate),
        hourlyRate: currencyToNumber(data.hourlyRate, 'BRL'),
        userUuid: data.userUuid,
        taskUuid: data.taskUuid,
      },
      where: {
        uuid: data.uuid,
      },
    })

    res.status(201).json({ message: 'As informações da atividade foram atualizadas.' })
    return
  } catch (e) {
    console.log(e)
    res.status(500).json({ message: 'Erro no servidor!' })
    return
  }
}

export const activityDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    // get uuid
    const { uuid } = req.params

    // check if has user
    const token = req.user
    if (!token) {
      res.status(404).json({ message: 'Token não encontrado!' })
      return
    }

    // check if activity exist
    const activity = await prisma.activity.findUnique({ where: { uuid: uuid } })
    if (!activity) {
      res.status(404).json({ message: 'Atividade não econtrada!' })
      return
    }

    // create resource
    await prisma.activity.delete({
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
