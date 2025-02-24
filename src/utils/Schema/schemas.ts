import { ZodSchema } from 'zod'

export const dataSchema = <T>(dataCheck: T, schema: ZodSchema<T>) => {
  let message: string = ''

  const { success, data, error } = schema.safeParse(dataCheck)
  if (!success) {
    message = `Parameters passed in the schema are invalid: ${error?.issues.map((issue) => issue.path.join('.') + ' - ' + issue.message).join(', ')}`
  }

  return { data: data, error: message }
}
