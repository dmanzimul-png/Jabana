import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FLOUR_TYPES, getBagSizes, BAG_KEYS, BAG_WEIGHTS } from '../../lib/flourTypes'
import { Package, Plus, X } from 'lucide-react'

const flourColors = {
  'Shenge': 'bg-yellow-500',
  'Magic Pate Jaune': 'bg-orange-500',
  'Magic': 'bg-blue-500',
  'Jabana': 'bg-green-500',
  'Ordinaire Shenge': 'bg-gray-500',
  'Ordinaire Jabana': 'bg-stone-500',
}

export default function Stock() {
  const [selectedType, setSelectedType] = useState('Shenge')
  const [allStats, setAllStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdj, setShowAdj] = useState(false)
  const [adjForm, setAdjForm] = useState({ flour_type: 'Shenge', bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [adjSaving, setAdjSaving] = useState(false)
  const [adjError, setAdjError] = useState('')

  async function handleAdjSubmit(e) {
    e.preventDefault()
    setAdjError('')
    setAdjSaving(true)
    try {
      const type = adjForm.flour_type
      const totalKg = getBagSizes(type).reduce((sum, size) => {
        const key = BAG_KEYS[size]
        return sum + (parseInt(adjForm[key]) || 0) * BAG_WEIGHTS[key]
      }, 0)
      const { count } = await supabase.from('batches').select('*', { count: 'exact', head: true })
      const batchNumber = `ADJ-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`
      const { error: err } = await supabase.from('batches').insert({
        batch_number: batchNumber,
        flour_type: type,
        maize_input_kg: 0,
        flour_produced_kg: totalKg,
        byproduct_kg: 0,
        other_loss_kg: 0,
        bags_5kg: parseInt(adjForm.bags_5kg) || 0,
        bags_10kg: parseInt(adjForm.bags_10kg) || 0,
        bags_25kg: parseInt(adjForm.bags_25kg) || 0,
        bags_50kg: parseInt(adjForm.bags_50kg) || 0,
        bran_bags_100kg: 0,
        is_opening_stock: true,
        notes: adjForm.notes || 'Manual stock adjustment',
        produced_at: adjForm.date,
      })
      if (err) throw err
      setShowAdj(false)
      setAdjForm({ flour_type: 'Shenge', bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', notes: '', date: new Date().toISOString().split('T')[0] })
      fetchStock()
    } catch (err) {
      setAdjError(err.message)
    } finally {
      setAdjSaving(false)
    }
  }

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
  const isOrdinaire = selectedType === 'Ordinaire Shenge' || selectedType === 'Ordinaire Jabana'
  const bagRows = isOrdinaire
    ? [{ label: '25 kg Bags', pk: 'b25' }, { label: '50 kg Bags', pk: 'b50' }]
    : [{ label: '5 kg Bags', pk: 'b5' }, { label: '10 kg Bags', pk: 'b10' }, { label: '25 kg Bags', pk: 'b25' }]

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const adjBagSizes = getBagSizes(adjForm.flour_type)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          <p className="text-gray-500 text-sm mt-1">Current flour stock by type and bag size.</p>
        </div>
        <button onClick={() => setShowAdj(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> Add Stock
        </button>
      </div>

      {/* Flour type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {FLOUR_TYPES.map(type => (
          <button key={type} onClick={() => setSelectedType(type)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition border-2 ${selectedType === type ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
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
      {showAdj && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Add Stock Manually</h2>
              <button onClick={() => setShowAdj(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdjSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flour Type</label>
                <select value={adjForm.flour_type}
                  onChange={e => setAdjForm({ flour_type: e.target.value, bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', notes: adjForm.notes })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {FLOUR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={`grid gap-3 grid-cols-${adjBagSizes.length}`}>
                {adjBagSizes.map(size => (
                  <div key={size}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{size} bags</label>
                    <input type="number" min="0"
                      value={adjForm[BAG_KEYS[size]]}
                      onChange={e => setAdjForm({ ...adjForm, [BAG_KEYS[size]]: e.target.value })}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={adjForm.date}
                  onChange={e => setAdjForm({ ...adjForm, date: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input type="text" value={adjForm.notes}
                  onChange={e => setAdjForm({ ...adjForm, notes: e.target.value })}
                  placeholder="e.g. Remaining stock before takeover"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {adjError && <p className="text-red-500 text-sm">{adjError}</p>}
              <button type="submit" disabled={adjSaving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50">
                {adjSaving ? 'Saving...' : 'Add to Stock'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
