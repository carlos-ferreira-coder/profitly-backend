import { z } from 'zod'

export const clientSchema = {
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
      const types = ['Person', 'Enterprise']
      return types.includes(s)
    }),

  cpf: z
    .string({
      message: 'O cpf deve ser um texto',
    })
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
      message: 'Informe um cpf válido',
    })
    .nonempty({
      message: 'O cpf é obrigatório',
    }),

  cnpj: z
    .string({
      message: 'O cpnj deve ser um texto',
    })
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
      message: 'Informe um cpnj válido',
    })
    .nonempty({
      message: 'O cnpj é obrigatório',
    }),

  name: z
    .string({
      message: 'O nome deve ser um texto',
    })
    .nonempty({
      message: 'O nome é obrigatório',
    }),

  fantasy: z
    .string({
      message: 'O nome fantasia deve ser um texto',
    })
    .nonempty({
      message: 'O nome fantasia é obrigatório',
    }),

  email: z
    .string({
      message: 'O email deve ser um texto',
    })
    .email({
      message: 'Informe um email válido',
    })
    .nonempty({
      message: 'O email é obrigatório',
    }),

  phone: z
    .string({
      message: 'O contato deve ser um texto',
    })
    .regex(/^\(\d{2}\)\s\d{1}\s\d{4}-\d{4}$/, {
      message: 'Informe um contato válido',
    })
    .nullable(),

  active: z
    .boolean({
      message: 'O campo \"ativo\" deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'O campo \"ativo\" é obrigatório',
    }),
}
