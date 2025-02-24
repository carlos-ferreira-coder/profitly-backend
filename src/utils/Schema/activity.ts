import { z } from 'zod'

export const activitySchema = {
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

  beginDate: z.string({
    message: 'A data inicial deve ser uma texto',
  }),

  endDate: z.string({
    message: 'A data final deve ser uma texto',
  }),

  hourlyRate: z
    .string({
      message: 'O valor da hora deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um valor de hora válido',
    })
    .nonempty({
      message: 'O valor da hora é obrigatório!',
    }),

  userUuid: z
    .string({
      message: 'O uuid do usuário deve ser um número',
    })
    .uuid({
      message: 'Informe um uuid do usuário válido',
    })
    .nonempty({
      message: 'O uuid do usuário é obrigatório',
    }),

  taskUuid: z
    .string({
      message: 'O uuid da tarefa deve ser um número',
    })
    .uuid({
      message: 'Informe um uuid de tarefa válido',
    })
    .nonempty({
      message: 'O uuid de tarefa é obrigatório',
    }),
}
