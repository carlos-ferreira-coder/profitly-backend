import { z } from 'zod'

export const taskSchema = {
  id: z
    .number({
      message: 'O id deve ser um número',
    })
    .min(1, {
      message: 'Informe um id válido',
    }),

  uuid: z
    .string({
      message: 'O uuid deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid válido',
    })
    .nonempty({
      message: 'O uuid é obrigatório',
    }),

  type: z
    .string({
      message: 'O tipo deve ser um texto',
    })
    .nonempty({
      message: 'O tipo é obrigatório',
    })
    .refine((s) => {
      const types = ['Activity', 'Expense']
      return types.includes(s)
    }),

  description: z
    .string({
      message: 'A descrição deve ser um texto',
    })
    .nonempty({
      message: 'A descrição é obrigatória.',
    }),

  beginDate: z.string({
    message: 'A data inicial deve ser um texto',
  }),

  endDate: z.string({
    message: 'A data final deve ser um texto',
  }),

  hourlyRate: z
    .string({
      message: 'O valor da hora deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um valor de hora válido',
    })
    .nullable(),

  cost: z
    .string({
      message: 'O custo deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um custo válido',
    })
    .nullable(),

  revenue: z
    .string({
      message: 'O lucro deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um lucro válido',
    })
    .nonempty(),

  statusUuid: z
    .string({
      message: 'O uuid do status deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid do status válido',
    })
    .nonempty({
      message: 'O uuid do status é obrigatório',
    }),

  userUuid: z
    .string({
      message: 'O uuid do usuário deve ser um texto',
    })
    .regex(
      /^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      {
        message: 'Informe um uuid do usuário válido',
      },
    )
    .transform((s) => (s === '' ? null : s))
    .nullable(),

  projectUuid: z
    .string({
      message: 'O uuid do projeto deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid do projeto válido',
    })
    .nonempty({
      message: 'O uuid do projeto é obrigatório',
    }),

  budgetUuid: z
    .string({
      message: 'O uuid do orçamento deve ser um texto',
    })
    .regex(
      /^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      {
        message: 'Informe um uuid do orçamento válido',
      },
    )
    .transform((s) => (s === '' ? null : s))
    .nullable(),
}
