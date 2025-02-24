import { z } from 'zod'

export const userSchema = {
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

  photo: z
    .instanceof(File, {
      message: 'Selecione um arquivo de imagem.',
    })
    .refine((f) => f.size <= 5 * 1024 * 1024, {
      message: 'O arquivo deve ser menor que 5MB.',
    })
    .refine((f) => ['image/svg+xml', 'image/png', 'image/jpg', 'image/jpeg'].includes(f.type), {
      message: 'O arquivo deve ser uma imagem (SVG, JPG ou PNG).',
    }),

  active: z
    .boolean({
      message: 'O campo \"ativo\" deve ser um boleano',
    })
    .refine((b) => b !== undefined, {
      message: 'O campo \"ativo\" é obrigatório',
    }),

  username: z
    .string({
      message: 'O nome de usuário deve ser um texto',
    })
    .nonempty({
      message: 'O nome de usuário é obrigatório',
    }),

  name: z
    .string({
      message: 'O nome completo deve ser um texto',
    })
    .nonempty({
      message: 'O nome completo é obrigatório',
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

  password: z
    .string({
      message: 'A senha deve ser um texto',
    })
    .min(6, {
      message: 'A senha deve conter pelo menos 6 catecteres',
    })
    .nonempty({
      message: 'A senha é obrigatória!',
    }),

  phone: z
    .string({
      message: 'O contato deve ser um texto',
    })
    .regex(/^\(\d{2}\)\s\d{1}\s\d{4}-\d{4}$/, {
      message: 'Informe um contato válido',
    })
    .nullable(),

  authUuid: z
    .string({
      message: 'O cargo/função deve ser um texto',
    })
    .uuid({
      message: 'Informe um cargo/função válido',
    })
    .nonempty({
      message: 'O uuid do cargo/função é obrigatório',
    }),

  hourlyRate: z
    .string({
      message: 'O valor da hora deve ser um texto',
    })
    .regex(/^$|R?\$?\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/, {
      message: 'Informe um valor de hora válido',
    })
    .nullable(),
}
