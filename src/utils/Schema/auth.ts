import { z } from 'zod'

export const authSchema = {
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
      message: 'O cargo/função deve ser um texto',
    })
    .nonempty({
      message: 'O cargo/função é obrigatório',
    }),

  admin: z
    .boolean({
      message: 'A autorização de administrador deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'A autorização de administrador é obrigatória',
    }),

  project: z
    .boolean({
      message: 'A autorização de editar projetos deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'A autorização de editar projetos é obrigatória',
    }),

  personal: z
    .boolean({
      message: 'A autorização de informações pessoais deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'A autorização de informações pessoais é obrigatória',
    }),

  financial: z
    .boolean({
      message: 'A autorização de informações financeiras deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'A autorização de informações financeiras é obrigatória',
    }),
}
