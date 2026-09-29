import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, AlertTriangle, Trash2 } from 'lucide-react'

export default function SpoiledPackages() {
  const [spoiled, setSpoiled] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({
    driver_name: '', car_plate: '', bags_5kg: '', bags_10kg: '', bags_25kg: '',
    spoiled_during: 'transport', notes: '',
  })

  useEffect(() => { fetchSpoiled() }, [])

  async function fetchSpoiled() {
    setLoading(true)
    const { data } = await supabase.from('spoiled_packages').select('*').order('reported_date', { ascending: false })
    setSpoiled(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('spoiled_packages').insert({
        driver_name: form.driver_name, car_plate: form.car_plate,
        bags_5kg: parseInt(form.bags_5kg) || 0, bags_10kg: parseInt(form.bags_10kg) || 0, bags_25kg: parseInt(form.bags_25kg) || 0,
        spoiled_during: form.spoiled_during, notes: form.notes,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ driver_name: '', car_plate: '', bags_5kg: '', bags_10kg: '', bags_25kg: '', spoiled_during: 'transport', notes: '' })
      fetchSpoiled()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('spoiled_packages').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchSpoiled()
  }

  const totalSpoiledKg = spoiled.reduce((s, x) => s + parseFloat(x.total_kg ?? 0), 0)
  const duringProduction = spoiled.filter(x => x.spoiled_during === 'production')
  const duringTransport = spoiled.filter(x => x.spoiled_during === 'transport')

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Spoiled Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Track damaged or spoiled bags during production or transport.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> Report Spoilage
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-red-700 mb-1">Total Spoiled</p>
          <p className="text-2xl font-bold text-red-800">{totalSpoiledKg.toLocaleString()} kg</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-orange-700 mb-1">During Production</p>
          <p className="text-2xl font-bold text-orange-800">{duringProduction.length} reports</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-yellow-700 mb-1">During Transport</p>
          <p className="text-2xl font-bold text-yellow-800">{duringTransport.length} reports</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : spoiled.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No spoilage reported yet.</p>
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {spoiled.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{s.driver_name || 'N/A'}</p>
                    {s.car_plate && <p className="text-xs text-gray-400">🚗 {s.car_plate}</p>}
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.spoiled_during === 'production' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.spoiled_during === 'production' ? 'Production' : 'Transport'}
                    </span>
                  </div>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  {[{ label: '5kg', val: s.bags_5kg }, { label: '10kg', val: s.bags_10kg }, { label: '25kg', val: s.bags_25kg }].map(b => (
                    <div key={b.label} className="bg-red-50 rounded-xl p-2">
                      <p className="text-xs text-red-500">{b.label}</p>
                      <p className="font-bold text-red-700">{b.val}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{new Date(s.reported_date).toLocaleDateString()}</p>
                  <p className="font-bold text-red-600">{s.total_kg} kg total</p>
                </div>
                {s.notes && <p className="text-xs text-gray-500 mt-1">{s.notes}</p>}
              </div>
            ))}
          </div>

          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Driver', 'Car Plate', 'Spoiled During', '5kg', '10kg', '25kg', 'Total kg', 'Date', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {spoiled.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.driver_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.car_plate || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.spoiled_during === 'production' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {s.spoiled_during === 'production' ? 'Production' : 'Transport'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_5kg}</td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_10kg}</td>
                      <td className="px-4 py-3 text-gray-700">{s.bags_25kg}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{s.total_kg} kg</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(s.reported_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
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
              <h2 className="text-lg font-bold text-gray-900">Report Spoilage</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spoiled During</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'transport', label: '🚗 Transport' }, { value: 'production', label: '🏭 Production' }].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({ ...form, spoiled_during: opt.value })}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition ${form.spoiled_during === opt.value ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                  <input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                    placeholder="e.g. Jean Pierre"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Car Plate</label>
                  <input type="text" value={form.car_plate} onChange={e => setForm({ ...form, car_plate: e.target.value })}
                    placeholder="e.g. RAB 123A"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Spoiled Bags</label>
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
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Report Spoilage'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
