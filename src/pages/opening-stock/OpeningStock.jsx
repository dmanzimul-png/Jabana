import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FLOUR_TYPES, getBagSizes, BAG_KEYS, BAG_WEIGHTS } from '../../lib/flourTypes'
import { Archive, Check } from 'lucide-react'

const flourColors = {
  'Shenge': 'border-yellow-400 bg-yellow-50',
  'Magic Pate Jaune': 'border-orange-400 bg-orange-50',
  'Magic': 'border-blue-400 bg-blue-50',
  'Jabana': 'border-green-400 bg-green-50',
  'Ordinaire Shenge': 'border-gray-400 bg-gray-50',
  'Ordinaire Jabana': 'border-stone-400 bg-stone-50',
}

const emptyBags = () => ({ bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '' })

export default function OpeningStock() {
  const [entries, setEntries] = useState(
    Object.fromEntries(FLOUR_TYPES.map(t => [t, emptyBags()]))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function updateBag(type, key, value) {
    setEntries(prev => ({ ...prev, [type]: { ...prev[type], [key]: value } }))
  }

  function calcKg(type) {
    return getBagSizes(type).reduce((sum, size) => {
      const key = BAG_KEYS[size]
      return sum + (parseInt(entries[type][key]) || 0) * BAG_WEIGHTS[key]
    }, 0)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const rows = FLOUR_TYPES.map(type => ({
        batch_number: `OPENING-${type.replace(/\s+/g, '-').toUpperCase()}`,
        flour_type: type,
        maize_input_kg: 0,
        flour_produced_kg: calcKg(type),
        byproduct_kg: 0,
        other_loss_kg: 0,
        bags_5kg: parseInt(entries[type].bags_5kg) || 0,
        bags_10kg: parseInt(entries[type].bags_10kg) || 0,
        bags_25kg: parseInt(entries[type].bags_25kg) || 0,
        bags_50kg: parseInt(entries[type].bags_50kg) || 0,
        bran_bags_100kg: 0,
        is_opening_stock: true,
        notes: 'Opening stock entry — stock present before system takeover',
      }))

      const { error: err } = await supabase.from('batches').insert(rows)
      if (err) throw err
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (saved) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check size={32} className="text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Opening Stock Saved!</h2>
      <p className="text-gray-500 text-sm max-w-sm">All pre-existing stock has been recorded. Your inventory now reflects the correct starting balances.</p>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Opening Stock</h1>
        <p className="text-gray-500 text-sm mt-1">Enter the stock that existed before you started using this system.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {FLOUR_TYPES.map(type => {
          const sizes = getBagSizes(type)
          const totalKg = calcKg(type)
          return (
            <div key={type} className={`rounded-2xl border-2 ${flourColors[type]} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-900 text-base">{type}</p>
                {totalKg > 0 && (
                  <span className="text-sm font-semibold text-gray-600">{totalKg.toLocaleString()} kg total</span>
                )}
              </div>
              <div className={`grid gap-3 grid-cols-${sizes.length}`}>
                {sizes.map(size => (
                  <div key={size}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{size} bags</label>
                    <input
                      type="number" min="0"
                      value={entries[type][BAG_KEYS[size]]}
                      onChange={e => updateBag(type, BAG_KEYS[size], e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl transition disabled:opacity-50 text-base flex items-center justify-center gap-2">
          <Archive size={18} />
          {saving ? 'Saving...' : 'Save Opening Stock'}
        </button>
      </form>
    </div>
  )
}
