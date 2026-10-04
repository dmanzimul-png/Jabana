import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { ALL_PRODUCT_TYPES, getBagSizes, BAG_KEYS, BAG_WEIGHTS } from '../../lib/flourTypes'
import { Plus, X, Truck, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'

const statusColors = {
  out: 'bg-blue-100 text-blue-700',
  returned: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
}
const statusLabels = { out: 'Out', returned: 'Returned', partial: 'Partial Return' }

const flourColors = {
  'Shenge': 'bg-yellow-100 text-yellow-700',
  'Magic Pate Jaune': 'bg-orange-100 text-orange-700',
  'Magic': 'bg-blue-100 text-blue-700',
  'Jabana': 'bg-green-100 text-green-700',
  'Ordinaire': 'bg-gray-100 text-gray-700',
  'Bran': 'bg-amber-100 text-amber-700',
}

function emptyItem() {
  return { flour_type: 'Shenge', bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', bags_100kg: '' }
}

function itemKg(item) {
  return getBagSizes(item.flour_type).reduce((s, sz) => {
    const key = BAG_KEYS[sz]
    return s + (parseInt(item[key]) || 0) * BAG_WEIGHTS[key]
  }, 0)
}

export default function Dispatch() {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReturnForm, setShowReturnForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [expanded, setExpanded] = useState({})

  const [form, setForm] = useState({ car_plate: '', driver_name: '', notes: '', items: [emptyItem()] })
  const [returnItems, setReturnItems] = useState([])
  const [returnStatus, setReturnStatus] = useState('returned')

  useEffect(() => { fetchDispatches() }, [])

  async function fetchDispatches() {
    setLoading(true)
    const { data: disps } = await supabase.from('dispatches').select('*').order('dispatched_at', { ascending: false })
    const { data: items } = await supabase.from('dispatch_items').select('*')
    const list = (disps ?? []).map(d => ({
      ...d,
      items: (items ?? []).filter(i => i.dispatch_id === d.id),
    }))
    setDispatches(list)
    setLoading(false)
  }

  function updateItem(idx, field, value) {
    setForm(f => {
      const items = [...f.items]
      if (field === 'flour_type') {
        items[idx] = { ...emptyItem(), flour_type: value }
      } else {
        items[idx] = { ...items[idx], [field]: value }
      }
      return { ...f, items }
    })
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const totalKg = form.items.reduce((s, item) => s + itemKg(item), 0)
      const { data: disp, error: err } = await supabase.from('dispatches').insert({
        car_plate: form.car_plate, driver_name: form.driver_name,
        notes: form.notes, status: 'out',
        flour_type: form.items[0]?.flour_type ?? '',
        bags_5kg: 0, bags_10kg: 0, bags_25kg: 0, bags_50kg: 0,
      }).select().single()
      if (err) throw err

      const itemRows = form.items.map(item => ({
        dispatch_id: disp.id,
        flour_type: item.flour_type,
        bags_5kg: parseInt(item.bags_5kg) || 0,
        bags_10kg: parseInt(item.bags_10kg) || 0,
        bags_25kg: parseInt(item.bags_25kg) || 0,
        bags_50kg: parseInt(item.bags_50kg) || 0,
        bags_100kg: parseInt(item.bags_100kg) || 0,
      }))
      const { error: iErr } = await supabase.from('dispatch_items').insert(itemRows)
      if (iErr) throw iErr

      // update total_kg after items are inserted
      await supabase.from('dispatches').update({ total_kg: totalKg }).eq('id', disp.id)

      setShowForm(false)
      setForm({ car_plate: '', driver_name: '', notes: '', items: [emptyItem()] })
      fetchDispatches()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openReturnForm(d) {
    setShowReturnForm(d)
    setReturnStatus('returned')
    setReturnItems(d.items.map(item => ({
      id: item.id,
      flour_type: item.flour_type,
      returned_5kg: '', returned_10kg: '', returned_25kg: '', returned_50kg: '', returned_100kg: '',
    })))
  }

  function updateReturn(idx, field, value) {
    setReturnItems(r => r.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleReturn(e) {
    e.preventDefault()
    setSaving(true)
    try {
      for (const ri of returnItems) {
        await supabase.from('dispatch_items').update({
          returned_5kg: parseInt(ri.returned_5kg) || 0,
          returned_10kg: parseInt(ri.returned_10kg) || 0,
          returned_25kg: parseInt(ri.returned_25kg) || 0,
          returned_50kg: parseInt(ri.returned_50kg) || 0,
          returned_100kg: parseInt(ri.returned_100kg) || 0,
        }).eq('id', ri.id)
      }
      await supabase.from('dispatches').update({
        status: returnStatus, returned_at: new Date().toISOString(),
      }).eq('id', showReturnForm.id)
      setShowReturnForm(null)
      fetchDispatches()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('dispatches').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchDispatches()
  }

  const outCount = dispatches.filter(d => d.status === 'out').length

  function bagChips(item, prefix = '', colorClass = 'bg-gray-100 text-gray-700') {
    return getBagSizes(item.flour_type).map(sz => {
      const key = prefix ? `${prefix}_${sz.replace('kg', 'kg')}` : BAG_KEYS[sz]
      const val = parseInt(item[key]) || 0
      return val > 0 ? (
        <span key={sz} className={`rounded-lg px-2 py-0.5 text-xs font-medium ${colorClass}`}>{val}×{sz}</span>
      ) : null
    })
  }

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-500 text-sm mt-1">Track cars going out with multiple flour types.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> Dispatch Car
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Cars Currently Out</p>
          <p className="text-2xl font-bold text-blue-800">{outCount}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Total Dispatches</p>
          <p className="text-2xl font-bold text-green-800">{dispatches.length}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-purple-700 mb-1">Total kg Dispatched</p>
          <p className="text-2xl font-bold text-purple-800">{dispatches.reduce((s, d) => s + parseFloat(d.total_kg ?? 0), 0).toLocaleString()} kg</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dispatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Truck size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No dispatches yet. Click <strong>Dispatch Car</strong> to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900">{d.driver_name}</p>
                  <p className="text-xs text-gray-400">🚗 {d.car_plate} · {new Date(d.dispatched_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
                  {d.status === 'out' && (
                    <button onClick={() => openReturnForm(d)} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500 hover:text-yellow-700 transition"><RotateCcw size={15} /></button>
                  )}
                  <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Items summary */}
              <div className="space-y-2">
                {(d.items ?? []).map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${flourColors[item.flour_type] ?? 'bg-gray-100 text-gray-700'}`}>{item.flour_type}</span>
                      <button onClick={() => setExpanded(ex => ({ ...ex, [`${d.id}-${i}`]: !ex[`${d.id}-${i}`] }))} className="text-gray-400">
                        {expanded[`${d.id}-${i}`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bagChips(item, '', 'bg-white text-gray-700 border border-gray-200')}
                    </div>
                    {expanded[`${d.id}-${i}`] && d.status !== 'out' && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-400 mb-1">Returned:</p>
                        <div className="flex flex-wrap gap-1">
                          {getBagSizes(item.flour_type).map(sz => {
                            const key = `returned_${sz}`
                            const val = parseInt(item[key]) || 0
                            return val > 0 ? <span key={sz} className="bg-green-100 text-green-700 rounded-lg px-2 py-0.5 text-xs font-medium">{val}×{sz}</span> : null
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-purple-600 font-medium mt-2">{parseFloat(d.total_kg ?? 0).toLocaleString()} kg total</p>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Dispatch Car</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                    required placeholder="e.g. Jean Pierre"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Car Plate</label>
                  <input type="text" value={form.car_plate} onChange={e => setForm({ ...form, car_plate: e.target.value })}
                    required placeholder="e.g. RAB 123A"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>

              {/* Flour items list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Flour Types & Bags</label>
                  <button type="button" onClick={addItem} className="text-xs text-green-600 font-semibold flex items-center gap-1 hover:text-green-700">
                    <Plus size={13} /> Add Type
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, idx) => {
                    const sizes = getBagSizes(item.flour_type)
                    return (
                      <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <select value={item.flour_type} onChange={e => updateItem(idx, 'flour_type', e.target.value)}
                            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                            {ALL_PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <X size={15} />
                            </button>
                          )}
                        </div>
                        <div className={`grid gap-2 grid-cols-${sizes.length}`}>
                          {sizes.map(sz => {
                            const key = BAG_KEYS[sz]
                            return (
                              <div key={sz}>
                                <label className="block text-xs text-gray-500 mb-1">{sz}</label>
                                <input type="number" min="0" value={item[key] ?? ''}
                                  onChange={e => updateItem(idx, key, e.target.value)}
                                  placeholder="0"
                                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                              </div>
                            )
                          })}
                        </div>
                        {itemKg(item) > 0 && (
                          <p className="text-xs text-green-600 font-medium">{itemKg(item)} kg</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {form.items.reduce((s, item) => s + itemKg(item), 0) > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between">
                  <span className="text-sm text-green-700 font-medium">Total</span>
                  <span className="text-sm font-bold text-green-800">{form.items.reduce((s, item) => s + itemKg(item), 0)} kg</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Dispatch Car'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Return Form */}
      {showReturnForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Return</h2>
                <p className="text-xs text-gray-400">{showReturnForm.driver_name} — {showReturnForm.car_plate}</p>
              </div>
              <button onClick={() => setShowReturnForm(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleReturn} className="p-5 space-y-4">
              {returnItems.map((ri, idx) => {
                const sizes = getBagSizes(ri.flour_type)
                const orig = showReturnForm.items[idx]
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${flourColors[ri.flour_type] ?? 'bg-gray-100 text-gray-700'}`}>{ri.flour_type}</span>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {orig && bagChips(orig, '', 'bg-gray-100 text-gray-600')}
                    </div>
                    <p className="text-xs text-gray-500">Bags returned:</p>
                    <div className={`grid gap-2 grid-cols-${sizes.length}`}>
                      {sizes.map(sz => {
                        const key = `returned_${sz}`
                        return (
                          <div key={sz}>
                            <label className="block text-xs text-gray-500 mb-1">{sz}</label>
                            <input type="number" min="0" value={ri[key] ?? ''}
                              onChange={e => updateReturn(idx, key, e.target.value)}
                              placeholder="0"
                              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'returned', label: '✅ Full Return' }, { value: 'partial', label: '⚠️ Partial Return' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setReturnStatus(opt.value)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition ${returnStatus === opt.value ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Confirm Return'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
