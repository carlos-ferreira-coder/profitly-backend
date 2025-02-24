import { z } from 'zod'

export const transactionSchema = {
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
      const types = ['Income', 'Expense', 'Transfer', 'Loan', 'Adjustment', 'Refund']
      return types.includes(s)
    }),

  amount: z
    .string({
      message: 'A quantia deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe uma quantia válida',
    }),

  date: z.string({
    message: 'A data deve ser uma texto',
  }),

  description: z
    .string({
      message: 'A descrição deve ser um texto',
    })
    .nonempty({
      message: 'Informe uma descrição válida',
    }),

  clientUuid: z
    .string({
      message: 'O uuid do cliente deve ser um texto',
    })
    .uuid({
      message: 'Informe um uuid do cliente válido',
    })
    .nonempty({
      message: 'O uuid do cliente é obrigatório',
    }),

  projectUuid: z
    .string({
      message: 'O uuid do projeto deve ser um texto',
    })
    .regex(
      /^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      {
        message: 'Informe um uuid do projeto válido',
      },
    )
    .transform((s) => (s === '' ? null : s))
    .nullable(),

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
}
