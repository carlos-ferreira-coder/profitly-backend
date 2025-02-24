type Currency = 'USD' | 'BRL'

export const typeOfCurrency = (value: string): string | undefined => {
  if (/^-?\$\s?(\d+|\d{1,3}(,\d{3}))*(\.\d{2})?$/.test(value)) {
    return 'USD'
  }
  if (/^-?R\$?\s?(\d+|\d{1,3}(\.\d{3}))*(,\d{2})?$/.test(value)) {
    return 'BRL'
  }
  return
}

export const numberToCurrency = (value: number, currency: Currency): string => {
  switch (currency) {
    case 'USD':
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    case 'BRL':
      return value.toLocaleString('pt-br', {
        style: 'currency',
        currency: 'BRL',
      })
  }
}

export const currencyToNumber = (value: string, currency: Currency): number => {
  switch (currency) {
    case 'USD':
      return parseFloat(value.replace(/[$\s,]/g, ''))
    case 'BRL':
      return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.'))
  }
}
