import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, Factory, Trash2 } from 'lucide-react'

export default function Production() {
  const [batches, setBatches] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({
    delivery_id: '', maize_input_kg: '', flour_produced_kg: '',
    byproduct_kg: '', other_loss_kg: '',
    bags_5kg: '', bags_10kg: '', bags_25kg: '', notes: '',
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: b }, { data: d }] = await Promise.all([
      supabase.from('batches').select('*, maize_deliveries(batch_number, tonnes, suppliers(name))').order('produced_at', { ascending: false }),
      supabase.from('maize_deliveries').select('id, batch_number, tonnes, suppliers(name)').order('received_at', { ascending: false }),
    ])
    setBatches(b ?? [])
    setDeliveries(d ?? [])
    setLoading(false)
  }

  async function generateBatchNumber() {
    const year = new Date().getFullYear()
    const { count } = await supabase.from('batches').select('*', { count: 'exact', head: true })
    return `BATCH-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const batchNumber = await generateBatchNumber()
      const { error: err } = await supabase.from('batches').insert({
        batch_number: batchNumber, delivery_id: form.delivery_id || null,
        maize_input_kg: parseFloat(form.maize_input_kg), flour_produced_kg: parseFloat(form.flour_produced_kg),
        byproduct_kg: parseFloat(form.byproduct_kg) || 0, other_loss_kg: parseFloat(form.other_loss_kg) || 0,
        bags_5kg: parseInt(form.bags_5kg) || 0, bags_10kg: parseInt(form.bags_10kg) || 0, bags_25kg: parseInt(form.bags_25kg) || 0,
        notes: form.notes,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ delivery_id: '', maize_input_kg: '', flour_produced_kg: '', byproduct_kg: '', other_loss_kg: '', bags_5kg: '', bags_10kg: '', bags_25kg: '', notes: '' })
      fetchAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('batches').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchAll()
  }

  const yieldPercent = form.maize_input_kg && form.flour_produced_kg
    ? ((parseFloat(form.flour_produced_kg) / parseFloat(form.maize_input_kg)) * 100).toFixed(1) : null

  const totalFlour = batches.reduce((s, b) => s + parseFloat(b.flour_produced_kg), 0)
  const totalMaize = batches.reduce((s, b) => s + parseFloat(b.maize_input_kg), 0)
  const avgYield = totalMaize > 0 ? ((totalFlour / totalMaize) * 100).toFixed(1) : 0
  const yieldColor = (y) => y >= 65 ? 'bg-green-100 text-green-700' : y >= 55 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          <p className="text-gray-500 text-sm mt-1">Track batches, flour yield and processing output.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> New Batch
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Batches', value: batches.length, color: 'bg-yellow-50 text-yellow-800' },
          { label: 'Maize Processed', value: `${totalMaize.toLocaleString()} kg`, color: 'bg-orange-50 text-orange-800' },
          { label: 'Flour Produced', value: `${totalFlour.toLocaleString()} kg`, color: 'bg-green-50 text-green-800' },
          { label: 'Avg Yield', value: `${avgYield}%`, color: 'bg-blue-50 text-blue-800' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color.split(' ')[0]}`}>
            <p className={`text-xs font-medium mb-1 ${s.color.split(' ')[1]} opacity-70`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color.split(' ')[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Factory size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No batches yet. Click <strong>New Batch</strong> to start.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {batches.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-xs text-green-700 font-semibold">{b.batch_number}</p>
                    <p className="font-bold text-gray-900 mt-0.5">{b.maize_deliveries?.suppliers?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{b.maize_deliveries?.batch_number ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${yieldColor(b.yield_percent)}`}>{b.yield_percent}% yield</span>
                    <button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Maize In</p>
                    <p className="font-bold text-gray-800 text-sm">{Number(b.maize_input_kg).toLocaleString()} kg</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Flour Out</p>
                    <p className="font-bold text-green-700 text-sm">{Number(b.flour_produced_kg).toLocaleString()} kg</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">By-product</p>
                    <p className="font-bold text-gray-600 text-sm">{Number(b.byproduct_kg).toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-xs text-green-600">5kg bags</p>
                    <p className="font-bold text-green-800 text-sm">{b.bags_5kg ?? 0}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-xs text-green-600">10kg bags</p>
                    <p className="font-bold text-green-800 text-sm">{b.bags_10kg ?? 0}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2">
                    <p className="text-xs text-green-600">25kg bags</p>
                    <p className="font-bold text-green-800 text-sm">{b.bags_25kg ?? 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{new Date(b.produced_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Batch #', 'Supplier', 'Maize In', 'Flour Out', 'Yield', '5kg Bags', '10kg Bags', '25kg Bags', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-green-700">{b.batch_number}</td>
                      <td className="px-4 py-3 text-gray-700">{b.maize_deliveries?.suppliers?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{Number(b.maize_input_kg).toLocaleString()} kg</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{Number(b.flour_produced_kg).toLocaleString()} kg</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${yieldColor(b.yield_percent)}`}>{b.yield_percent}%</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.bags_5kg ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700">{b.bags_10kg ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700">{b.bags_25kg ?? 0}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(b.produced_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><button onClick={() => setDeleteId(b.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Record New Batch</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Maize Delivery (optional)</label>
                <select value={form.delivery_id} onChange={e => {
                  const d = deliveries.find(d => d.id === e.target.value)
                  setForm({ ...form, delivery_id: e.target.value, maize_input_kg: d ? String(d.tonnes * 1000) : form.maize_input_kg })
                }} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">— Select delivery —</option>
                  {deliveries.map(d => <option key={d.id} value={d.id}>{d.batch_number} — {d.suppliers?.name} ({d.tonnes}t)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Maize Input (kg)', key: 'maize_input_kg', placeholder: 'e.g. 10000', required: true },
                  { label: 'Flour Produced (kg)', key: 'flour_produced_kg', placeholder: 'e.g. 6000', required: true },
                  { label: 'By-product (kg)', key: 'byproduct_kg', placeholder: '0', required: false },
                  { label: 'Other Loss (kg)', key: 'other_loss_kg', placeholder: '0', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type="number" step="0.01" min="0" value={form[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      required={f.required} placeholder={f.placeholder}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                ))}
              </div>

              {yieldPercent && (
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${yieldPercent >= 65 ? 'bg-green-50' : yieldPercent >= 55 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                  <span className="text-sm font-medium text-gray-700">Flour Yield</span>
                  <span className={`text-xl font-bold ${yieldPercent >= 65 ? 'text-green-700' : yieldPercent >= 55 ? 'text-yellow-700' : 'text-red-700'}`}>{yieldPercent}%</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bags Produced</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: '5 kg', key: 'bags_5kg' }, { label: '10 kg', key: 'bags_10kg' }, { label: '25 kg', key: 'bags_25kg' }].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label} bags</label>
                      <input type="number" min="0" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  placeholder="Any additional notes..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Record Batch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
