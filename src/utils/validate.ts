export const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]+/g, '')

  if (cpf.length !== 11) return false

  if (/^(\d)\1+$/.test(cpf)) return false

  const calcDigit = (cpf: string, length: number): number => {
    let sum = 0
    let weight = length + 1

    for (let i = 0; i < length; i++) {
      sum += parseInt(cpf[i]) * weight--
    }

    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigit = calcDigit(cpf, 9)
  if (firstDigit !== parseInt(cpf[9])) return false

  const secondDigit = calcDigit(cpf, 10)
  if (secondDigit !== parseInt(cpf[10])) return false

  return true
}

export const validateCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]+/g, '')

  if (cnpj.length !== 14) return false

  if (/^(\d)\1+$/.test(cnpj)) return false

  const calculateDigit = (cnpj: string, length: number, weights: number[]): number => {
    let sum = 0

    for (let i = 0; i < length; i++) {
      sum += parseInt(cnpj[i]) * weights[i]
    }

    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const firstDigitWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const firstDigit = calculateDigit(cnpj, 12, firstDigitWeights)
  if (firstDigit !== parseInt(cnpj[12])) return false

  const secondDigitWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const secondDigit = calculateDigit(cnpj, 13, secondDigitWeights)
  if (secondDigit !== parseInt(cnpj[13])) return false

  return true
}
