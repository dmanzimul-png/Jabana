export const FLOUR_TYPES = ['Shenge', 'Magic Pate Jaune', 'Magic', 'Jabana', 'Ordinaire']
export const ALL_PRODUCT_TYPES = [...FLOUR_TYPES, 'Bran']

export const BAG_SIZES = {
  Shenge: ['5kg', '10kg', '25kg'],
  'Magic Pate Jaune': ['5kg', '10kg', '25kg'],
  Magic: ['5kg', '10kg', '25kg'],
  Jabana: ['5kg', '10kg', '25kg'],
  Ordinaire: ['25kg', '50kg'],
  Bran: ['100kg'],
}

export const BAG_KEYS = {
  '5kg': 'bags_5kg',
  '10kg': 'bags_10kg',
  '25kg': 'bags_25kg',
  '50kg': 'bags_50kg',
  '100kg': 'bags_100kg',
}

export const BAG_WEIGHTS = {
  bags_5kg: 5,
  bags_10kg: 10,
  bags_25kg: 25,
  bags_50kg: 50,
  bags_100kg: 100,
}

export function getBagSizes(flourType) {
  return BAG_SIZES[flourType] ?? ['5kg', '10kg', '25kg']
}

export function calcTotalKg(bags, flourType) {
  return getBagSizes(flourType).reduce((sum, size) => {
    const key = BAG_KEYS[size]
    return sum + (parseInt(bags[key]) || 0) * BAG_WEIGHTS[key]
  }, 0)
}
