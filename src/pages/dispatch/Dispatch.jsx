import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { FLOUR_TYPES, getBagSizes, BAG_KEYS } from '../../lib/flourTypes'
import { Plus, X, Truck, Trash2, RotateCcw, CheckCircle } from 'lucide-react'

const flourColors = {
  'Shenge': 'bg-yellow-100 text-yellow-700',
  'Magic Pate Jaune': 'bg-orange-100 text-orange-700',
  'Magic': 'bg-blue-100 text-blue-700',
  'Jabana': 'bg-green-100 text-green-700',
  'Ordinaire': 'bg-gray-100 text-gray-700',
}

const statusColors = {
  out: 'bg-blue-100 text-blue-700',
  returned: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
}

const statusLabels = { out: 'Out', returned: 'Returned', partial: 'Partial Return' }

export default function Dispatch() {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReturnForm, setShowReturnForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({
    car_plate: '', driver_name: '', flour_type: 'Shenge',
    bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', notes: '',
  })

  const [returnForm, setReturnForm] = useState({
    returned_5kg: '', returned_10kg: '', returned_25kg: '', returned_50kg: '', status: 'returned',
  })

  useEffect(() => { fetchDispatches() }, [])

  async function fetchDispatches() {
    setLoading(true)
    const { data } = await supabase.from('dispatches').select('*').order('dispatched_at', { ascending: false })
    setDispatches(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('dispatches').insert({
        car_plate: form.car_plate, driver_name: form.driver_name, flour_type: form.flour_type,
        bags_5kg: parseInt(form.bags_5kg) || 0, bags_10kg: parseInt(form.bags_10kg) || 0,
        bags_25kg: parseInt(form.bags_25kg) || 0, bags_50kg: parseInt(form.bags_50kg) || 0,
        notes: form.notes, status: 'out',
      })
      if (err) throw err
      setShowForm(false)
      setForm({ car_plate: '', driver_name: '', flour_type: 'Shenge', bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '', notes: '' })
      fetchDispatches()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReturn(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error: err } = await supabase.from('dispatches').update({
        returned_5kg: parseInt(returnForm.returned_5kg) || 0,
        returned_10kg: parseInt(returnForm.returned_10kg) || 0,
        returned_25kg: parseInt(returnForm.returned_25kg) || 0,
        returned_50kg: parseInt(returnForm.returned_50kg) || 0,
        status: returnForm.status,
        returned_at: new Date().toISOString(),
      }).eq('id', showReturnForm.id)
      if (err) throw err
      setShowReturnForm(null)
      setReturnForm({ returned_5kg: '', returned_10kg: '', returned_25kg: '', returned_50kg: '', status: 'returned' })
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
  const totalKgOut = dispatches.reduce((s, d) => s + parseFloat(d.total_kg ?? 0), 0)
  const bagSizes = getBagSizes(form.flour_type)

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-500 text-sm mt-1">Track cars going out to sell and returning with stock.</p>
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
          <p className="text-2xl font-bold text-purple-800">{totalKgOut.toLocaleString()} kg</p>
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
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900">{d.driver_name}</p>
                    <span className="text-xs text-gray-400">🚗 {d.car_plate}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${flourColors[d.flour_type]}`}>{d.flour_type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.status === 'out' && (
                    <button onClick={() => { setShowReturnForm(d); setReturnForm({ returned_5kg: '', returned_10kg: '', returned_25kg: '', returned_50kg: '', status: 'returned' }) }}
                      className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-500 hover:text-yellow-700 transition" title="Record Return">
                      <RotateCcw size={15} />
                    </button>
                  )}
                  <button onClick={() => setDeleteId(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                </div>
              </div>

              {/* Dispatched bags */}
              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-1">Dispatched</p>
                <div className="flex gap-2 flex-wrap">
                  {d.bags_5kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1 text-xs font-medium">{d.bags_5kg}×5kg</span>}
                  {d.bags_10kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1 text-xs font-medium">{d.bags_10kg}×10kg</span>}
                  {d.bags_25kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1 text-xs font-medium">{d.bags_25kg}×25kg</span>}
                  {d.bags_50kg > 0 && <span className="bg-gray-100 rounded-lg px-2 py-1 text-xs font-medium">{d.bags_50kg}×50kg</span>}
                  <span className="bg-purple-100 text-purple-700 rounded-lg px-2 py-1 text-xs font-medium">{d.total_kg} kg total</span>
                </div>
              </div>

              {/* Returned bags */}
              {d.status !== 'out' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Returned</p>
                  <div className="flex gap-2 flex-wrap">
                    {d.returned_5kg > 0 && <span className="bg-green-100 text-green-700 rounded-lg px-2 py-1 text-xs font-medium">{d.returned_5kg}×5kg</span>}
                    {d.returned_10kg > 0 && <span className="bg-green-100 text-green-700 rounded-lg px-2 py-1 text-xs font-medium">{d.returned_10kg}×10kg</span>}
                    {d.returned_25kg > 0 && <span className="bg-green-100 text-green-700 rounded-lg px-2 py-1 text-xs font-medium">{d.returned_25kg}×25kg</span>}
                    {d.returned_50kg > 0 && <span className="bg-green-100 text-green-700 rounded-lg px-2 py-1 text-xs font-medium">{d.returned_50kg}×50kg</span>}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">{new Date(d.dispatched_at).toLocaleDateString()}</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flour Type</label>
                <select value={form.flour_type} onChange={e => setForm({ ...form, flour_type: e.target.value, bags_5kg: '', bags_10kg: '', bags_25kg: '', bags_50kg: '' })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {FLOUR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bags Dispatched</label>
                <div className={`grid gap-3 grid-cols-${bagSizes.length}`}>
                  {bagSizes.map(size => (
                    <div key={size}>
                      <label className="block text-xs text-gray-500 mb-1">{size} bags</label>
                      <input type="number" min="0" value={form[BAG_KEYS[size]]}
                        onChange={e => setForm({ ...form, [BAG_KEYS[size]]: e.target.value })}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  ))}
                </div>
              </div>
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
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-2">Originally dispatched:</p>
                <div className="flex gap-2 flex-wrap">
                  {showReturnForm.bags_5kg > 0 && <span className="bg-white border rounded-lg px-2 py-1 text-xs">{showReturnForm.bags_5kg}×5kg</span>}
                  {showReturnForm.bags_10kg > 0 && <span className="bg-white border rounded-lg px-2 py-1 text-xs">{showReturnForm.bags_10kg}×10kg</span>}
                  {showReturnForm.bags_25kg > 0 && <span className="bg-white border rounded-lg px-2 py-1 text-xs">{showReturnForm.bags_25kg}×25kg</span>}
                  {showReturnForm.bags_50kg > 0 && <span className="bg-white border rounded-lg px-2 py-1 text-xs">{showReturnForm.bags_50kg}×50kg</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bags Returned</label>
                <div className="grid grid-cols-2 gap-3">
                  {getBagSizes(showReturnForm.flour_type).map(size => {
                    const retKey = `returned_${size.replace('kg', 'kg')}`
                    const retKeyFixed = `returned_${size === '5kg' ? '5kg' : size === '10kg' ? '10kg' : size === '25kg' ? '25kg' : '50kg'}`
                    return (
                      <div key={size}>
                        <label className="block text-xs text-gray-500 mb-1">{size} bags returned</label>
                        <input type="number" min="0" value={returnForm[retKeyFixed]}
                          onChange={e => setReturnForm({ ...returnForm, [retKeyFixed]: e.target.value })}
                          placeholder="0"
                          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'returned', label: '✅ Full Return' }, { value: 'partial', label: '⚠️ Partial Return' }].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setReturnForm({ ...returnForm, status: opt.value })}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition ${returnForm.status === opt.value ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
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
