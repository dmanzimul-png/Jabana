import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, Receipt, Trash2 } from 'lucide-react'

const categories = [
  { value: 'wages', label: 'Worker Wages' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'processing', label: 'Processing Costs' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'truck', label: 'Truck Expenses' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
]

const categoryColors = {
  wages: 'bg-blue-100 text-blue-700', fuel: 'bg-orange-100 text-orange-700',
  electricity: 'bg-yellow-100 text-yellow-700', processing: 'bg-purple-100 text-purple-700',
  packaging: 'bg-pink-100 text-pink-700', truck: 'bg-red-100 text-red-700',
  maintenance: 'bg-gray-100 text-gray-700', transport: 'bg-indigo-100 text-indigo-700',
  other: 'bg-teal-100 text-teal-700',
}

function formatRWF(amount) {
  return 'RWF ' + Number(amount).toLocaleString()
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const [form, setForm] = useState({
    category: 'wages', amount: '', description: '',
    expense_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => { fetchExpenses() }, [])

  async function fetchExpenses() {
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('expenses').insert({
        category: form.category, amount: parseFloat(form.amount),
        description: form.description, expense_date: form.expense_date,
      })
      if (err) throw err
      setShowForm(false)
      setForm({ category: 'wages', amount: '', description: '', expense_date: new Date().toISOString().split('T')[0] })
      fetchExpenses()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    await supabase.from('expenses').delete().eq('id', deleteId)
    setDeleteId(null)
    fetchExpenses()
  }

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const thisMonthTotal = expenses.filter(e => {
    const d = new Date(e.expense_date), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, e) => s + parseFloat(e.amount), 0)

  const byCategory = categories.map(c => ({
    ...c, total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + parseFloat(e.amount), 0)
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track all factory and operational expenses.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-red-700 mb-1">This Month</p>
          <p className="text-2xl font-bold text-red-800">{formatRWF(thisMonthTotal)}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">All Time</p>
          <p className="text-2xl font-bold text-gray-800">{formatRWF(totalExpenses)}</p>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {byCategory.map(c => (
              <div key={c.value} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[c.value]}`}>{c.label}</span>
                <span className="text-sm font-semibold text-gray-800">{formatRWF(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No expenses yet. Click <strong>Add Expense</strong> to start.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {expenses.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColors[e.category]}`}>
                    {categories.find(c => c.value === e.category)?.label}
                  </span>
                  {e.description && <p className="text-sm text-gray-700 mt-1">{e.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(e.expense_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-red-600 text-lg">{formatRWF(e.amount)}</p>
                  <button onClick={() => setDeleteId(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date', 'Category', 'Description', 'Amount', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-500">{new Date(e.expense_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColors[e.category]}`}>
                          {categories.find(c => c.value === e.category)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{e.description || '—'}</td>
                      <td className="px-4 py-3 font-semibold text-red-700">{formatRWF(e.amount)}</td>
                      <td className="px-4 py-3"><button onClick={() => setDeleteId(e.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button></td>
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
              <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF)</label>
                  <input type="number" step="1" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    required placeholder="e.g. 50000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  placeholder="e.g. Diesel for delivery truck"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
