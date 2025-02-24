import { z } from 'zod'

export const expenseSchema = {
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

  description: z
    .string({
      message: 'A descrição deve ser um texto',
    })
    .nullable(),

  type: z
    .string({
      message: 'O tipo deve ser um texto',
    })
    .nonempty({
      message: 'O tipo é obrigatório',
    }),

  cost: z
    .string({
      message: 'O custo deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um custo válido',
    }),

  date: z.string({
    message: 'A data inicial deve ser um texto',
  }),

  userUuid: z
    .string({
      message: 'O uuid do usuário deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid do usuário válido',
    })
    .nonempty({
      message: 'O uuid do usuário é obrigatório',
    }),

  taskUuid: z
    .string({
      message: 'O uuid da tarefa deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid de tarefa válido',
    })
    .nonempty({
      message: 'O uuid de tarefa é obrigatório',
    }),

  supplierUuid: z
    .string({
      message: 'O uuid do fornecedor deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid do forecedor válido',
    })
    .transform((s) => (s === '' ? null : s))
    .optional(),
}
