import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FLOUR_TYPES } from '../../lib/flourTypes'
import { Package } from 'lucide-react'

const flourColors = {
  'Shenge': 'bg-yellow-500',
  'Magic Pate Jaune': 'bg-orange-500',
  'Magic': 'bg-blue-500',
  'Jabana': 'bg-green-500',
  'Ordinaire': 'bg-gray-500',
}

export default function Stock() {
  const [selectedType, setSelectedType] = useState('Shenge')
  const [allStats, setAllStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStock() }, [])

  async function fetchStock() {
    setLoading(true)
    const [{ data: batches }, { data: sales }, { data: returns_ }, { data: spoiled }, { data: dispatches }] = await Promise.all([
      supabase.from('batches').select('flour_type, flour_produced_kg, bags_5kg, bags_10kg, bags_25kg, bags_50kg'),
      supabase.from('sales').select('flour_type, bags_5kg, bags_10kg, bags_25kg, bags_50kg, total_kg'),
      supabase.from('returns').select('flour_type, bags_5kg, bags_10kg, bags_25kg, bags_50kg'),
      supabase.from('spoiled_packages').select('flour_type, bags_5kg, bags_10kg, bags_25kg, bags_50kg'),
      supabase.from('dispatches').select('flour_type, bags_5kg, bags_10kg, bags_25kg, bags_50kg, returned_5kg, returned_10kg, returned_25kg, returned_50kg'),
    ])

    const sum = (arr, key) => (arr ?? []).reduce((s, x) => s + (parseInt(x[key]) || 0), 0)

    const stats = {}
    for (const type of FLOUR_TYPES) {
      const b = (batches ?? []).filter(x => x.flour_type === type)
      const s = (sales ?? []).filter(x => x.flour_type === type)
      const r = (returns_ ?? []).filter(x => x.flour_type === type)
      const sp = (spoiled ?? []).filter(x => x.flour_type === type)
      const d = (dispatches ?? []).filter(x => x.flour_type === type)

      const produced = { b5: sum(b, 'bags_5kg'), b10: sum(b, 'bags_10kg'), b25: sum(b, 'bags_25kg'), b50: sum(b, 'bags_50kg') }
      const sold = { b5: sum(s, 'bags_5kg'), b10: sum(s, 'bags_10kg'), b25: sum(s, 'bags_25kg'), b50: sum(s, 'bags_50kg') }
      const returned = { b5: sum(r, 'bags_5kg'), b10: sum(r, 'bags_10kg'), b25: sum(r, 'bags_25kg'), b50: sum(r, 'bags_50kg') }
      const spoiledBags = { b5: sum(sp, 'bags_5kg'), b10: sum(sp, 'bags_10kg'), b25: sum(sp, 'bags_25kg'), b50: sum(sp, 'bags_50kg') }
      const dispatched = { b5: sum(d, 'bags_5kg'), b10: sum(d, 'bags_10kg'), b25: sum(d, 'bags_25kg'), b50: sum(d, 'bags_50kg') }
      const dispatchReturned = { b5: sum(d, 'returned_5kg'), b10: sum(d, 'returned_10kg'), b25: sum(d, 'returned_25kg'), b50: sum(d, 'returned_50kg') }

      const remaining = {
        b5: produced.b5 - sold.b5 + returned.b5 - spoiledBags.b5 - dispatched.b5 + dispatchReturned.b5,
        b10: produced.b10 - sold.b10 + returned.b10 - spoiledBags.b10 - dispatched.b10 + dispatchReturned.b10,
        b25: produced.b25 - sold.b25 + returned.b25 - spoiledBags.b25 - dispatched.b25 + dispatchReturned.b25,
        b50: produced.b50 - sold.b50 + returned.b50 - spoiledBags.b50 - dispatched.b50 + dispatchReturned.b50,
      }

      const totalProducedKg = (b).reduce((s, x) => s + parseFloat(x.flour_produced_kg ?? 0), 0)
      const remainingKg = remaining.b5 * 5 + remaining.b10 * 10 + remaining.b25 * 25 + remaining.b50 * 50

      stats[type] = { produced, sold, returned, spoiledBags, dispatched, dispatchReturned, remaining, totalProducedKg, remainingKg }
    }

    setAllStats(stats)
    setLoading(false)
  }

  const s = allStats[selectedType]
  const isOrdinaire = selectedType === 'Ordinaire'
  const bagRows = isOrdinaire
    ? [{ label: '25 kg Bags', pk: 'b25' }, { label: '50 kg Bags', pk: 'b50' }]
    : [{ label: '5 kg Bags', pk: 'b5' }, { label: '10 kg Bags', pk: 'b10' }, { label: '25 kg Bags', pk: 'b25' }]

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <p className="text-gray-500 text-sm mt-1">Current flour stock by type and bag size.</p>
      </div>

      {/* Flour type selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FLOUR_TYPES.map(type => (
          <button key={type} onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${selectedType === type ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
            {type}
          </button>
        ))}
      </div>

      {/* Main stock card */}
      <div className={`${flourColors[selectedType]} rounded-2xl p-6 text-white mb-6`}>
        <div className="flex items-center gap-3 mb-2">
          <Package size={24} />
          <p className="font-semibold opacity-90">{selectedType} — Flour in Stock</p>
        </div>
        <p className="text-5xl font-bold mb-1">{s?.remainingKg.toLocaleString() ?? 0} kg</p>
        <p className="opacity-75 text-sm">{s?.totalProducedKg.toLocaleString() ?? 0} kg produced total</p>
      </div>

      {/* Per bag size breakdown */}
      <div className="space-y-4">
        {bagRows.map(({ label, pk }) => (
          <div key={pk} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-bold text-gray-900">{label}</p>
              <span className="text-lg font-bold text-green-700">{s?.remaining[pk] ?? 0} remaining</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-gray-100">
              {[
                { label: 'Produced', value: s?.produced[pk] ?? 0, color: 'text-green-700' },
                { label: 'Dispatched', value: s?.dispatched[pk] ?? 0, color: 'text-purple-700' },
                { label: 'Sold', value: s?.sold[pk] ?? 0, color: 'text-blue-700' },
                { label: 'Returned', value: s?.returned[pk] ?? 0, color: 'text-yellow-700' },
                { label: 'Spoiled', value: s?.spoiledBags[pk] ?? 0, color: 'text-red-600' },
              ].map(stat => (
                <div key={stat.label} className="px-5 py-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
