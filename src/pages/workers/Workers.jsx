import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import DeleteConfirm from '../../components/DeleteConfirm'
import { Plus, X, Users, Trash2, CreditCard, Wallet, ChevronDown, ChevronUp } from 'lucide-react'

function formatRWF(n) { return 'RWF ' + Number(n).toLocaleString() }

export default function Workers() {
  const [workers, setWorkers] = useState([])
  const [advances, setAdvances] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [expanded, setExpanded] = useState({})

  // Modals
  const [showWorkerForm, setShowWorkerForm] = useState(false)
  const [showAdvanceForm, setShowAdvanceForm] = useState(null) // worker object
  const [showPayForm, setShowPayForm] = useState(null) // worker object

  const [workerForm, setWorkerForm] = useState({ full_name: '', role: 'worker', daily_wage: '', phone: '' })
  const [advanceForm, setAdvanceForm] = useState({ amount: '', reason: '', type: 'advance', advance_date: new Date().toISOString().split('T')[0] })
  const [payForm, setPayForm] = useState({ days_worked: '', notes: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: w }, { data: a }, { data: p }] = await Promise.all([
      supabase.from('workers').select('*').eq('active', true).order('full_name'),
      supabase.from('worker_advances').select('*').order('advance_date', { ascending: false }),
      supabase.from('worker_payments').select('*').order('payment_date', { ascending: false }),
    ])
    setWorkers(w ?? [])
    setAdvances(a ?? [])
    setPayments(p ?? [])
    setLoading(false)
  }

  function workerAdvances(wid) { return advances.filter(a => a.worker_id === wid) }
  function workerPayments(wid) { return payments.filter(p => p.worker_id === wid) }

  function pendingDebt(wid) {
    // Sum of all advances not yet deducted via payments
    const totalAdvanced = workerAdvances(wid).reduce((s, a) => s + parseInt(a.amount), 0)
    const totalDeducted = workerPayments(wid).reduce((s, p) => s + parseInt(p.total_advances), 0)
    return totalAdvanced - totalDeducted
  }

  async function handleAddWorker(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('workers').insert({
        full_name: workerForm.full_name, role: workerForm.role,
        daily_wage: parseInt(workerForm.daily_wage) || 0, phone: workerForm.phone,
      })
      if (err) throw err
      setShowWorkerForm(false)
      setWorkerForm({ full_name: '', role: 'worker', daily_wage: '', phone: '' })
      fetchAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleAddAdvance(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { error: err } = await supabase.from('worker_advances').insert({
        worker_id: showAdvanceForm.id,
        amount: parseInt(advanceForm.amount),
        reason: advanceForm.reason,
        type: advanceForm.type,
        advance_date: advanceForm.advance_date,
      })
      if (err) throw err
      setShowAdvanceForm(null)
      setAdvanceForm({ amount: '', reason: '', type: 'advance', advance_date: new Date().toISOString().split('T')[0] })
      fetchAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function handlePay(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const w = showPayForm
      const days = parseInt(payForm.days_worked) || 0
      const gross = days * parseInt(w.daily_wage)
      const debt = pendingDebt(w.id)
      const net = Math.max(0, gross - debt)
      const { error: err } = await supabase.from('worker_payments').insert({
        worker_id: w.id, days_worked: days,
        gross_amount: gross, total_advances: debt,
        net_amount: net, payment_date: new Date().toISOString().split('T')[0],
        notes: payForm.notes,
      })
      if (err) throw err
      setShowPayForm(null)
      setPayForm({ days_worked: '', notes: '' })
      fetchAll()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  async function handleDeleteWorker() {
    await supabase.from('workers').update({ active: false }).eq('id', deleteId)
    setDeleteId(null)
    fetchAll()
  }

  const totalWeeklyWages = workers.reduce((s, w) => s + parseInt(w.daily_wage) * 6, 0)
  const totalDebt = workers.reduce((s, w) => s + pendingDebt(w.id), 0)

  return (
    <div>
      {deleteId && <DeleteConfirm onConfirm={handleDeleteWorker} onCancel={() => setDeleteId(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers & Payroll</h1>
          <p className="text-gray-500 text-sm mt-1">Manage workers, track debts and process pay.</p>
        </div>
        <button onClick={() => setShowWorkerForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Plus size={18} /> Add Worker
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-1">Active Workers</p>
          <p className="text-2xl font-bold text-blue-800">{workers.length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Est. Weekly Wages</p>
          <p className="text-xl font-bold text-green-800">{formatRWF(totalWeeklyWages)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-red-700 mb-1">Total Pending Debt</p>
          <p className="text-xl font-bold text-red-800">{formatRWF(totalDebt)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workers yet. Click <strong>Add Worker</strong> to start.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workers.map(w => {
            const debt = pendingDebt(w.id)
            const wAdvances = workerAdvances(w.id)
            const wPayments = workerPayments(w.id)
            const isExpanded = expanded[w.id]
            return (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">{w.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{w.role} · {formatRWF(w.daily_wage)}/day</p>
                    {w.phone && <p className="text-xs text-gray-400">📞 {w.phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {debt > 0 && (
                      <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">
                        Debt: {formatRWF(debt)}
                      </span>
                    )}
                    <button onClick={() => setDeleteId(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mb-3">
                  <button onClick={() => { setShowAdvanceForm(w); setError('') }}
                    className="flex items-center gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 rounded-xl text-xs font-semibold transition">
                    <CreditCard size={13} /> Record Debt
                  </button>
                  <button onClick={() => { setShowPayForm(w); setError('') }}
                    className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-2 rounded-xl text-xs font-semibold transition">
                    <Wallet size={13} /> Pay Worker
                  </button>
                  <button onClick={() => setExpanded(ex => ({ ...ex, [w.id]: !ex[w.id] }))}
                    className="flex items-center gap-1 ml-auto text-gray-400 hover:text-gray-600 text-xs">
                    History {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* History */}
                {isExpanded && (
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    {wAdvances.length === 0 && wPayments.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">No history yet.</p>
                    )}
                    {wAdvances.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-red-50 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold text-red-700">Debt / Advance</p>
                          <p className="text-xs text-gray-500">{a.reason || '—'} · {new Date(a.advance_date).toLocaleDateString()}</p>
                        </div>
                        <p className="text-sm font-bold text-red-700">— {formatRWF(a.amount)}</p>
                      </div>
                    ))}
                    {wPayments.map(p => (
                      <div key={p.id} className="bg-green-50 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-green-700">Payment — {p.days_worked} days</p>
                            <p className="text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString()}</p>
                          </div>
                          <p className="text-sm font-bold text-green-700">{formatRWF(p.net_amount)}</p>
                        </div>
                        {p.total_advances > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Gross {formatRWF(p.gross_amount)} — Debt {formatRWF(p.total_advances)} = Net {formatRWF(p.net_amount)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Worker Form */}
      {showWorkerForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Add Worker</h2>
              <button onClick={() => setShowWorkerForm(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddWorker} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={workerForm.full_name} onChange={e => setWorkerForm({ ...workerForm, full_name: e.target.value })}
                  required placeholder="e.g. Jean Pierre"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={workerForm.role} onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="worker">Worker</option>
                    <option value="driver">Driver</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="guard">Guard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Wage (RWF)</label>
                  <input type="number" min="0" value={workerForm.daily_wage} onChange={e => setWorkerForm({ ...workerForm, daily_wage: e.target.value })}
                    required placeholder="e.g. 5000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="text" value={workerForm.phone} onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })}
                  placeholder="e.g. 078 000 0000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Add Worker'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Debt/Advance Form */}
      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Debt / Advance</h2>
                <p className="text-xs text-gray-400">{showAdvanceForm.full_name}</p>
              </div>
              <button onClick={() => setShowAdvanceForm(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAdvance} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'advance', label: '💸 Cash Advance' }, { value: 'deduction', label: '🛒 Goods / Other' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setAdvanceForm({ ...advanceForm, type: opt.value })}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition ${advanceForm.type === opt.value ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF)</label>
                  <input type="number" min="0" value={advanceForm.amount} onChange={e => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    required placeholder="e.g. 10000"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={advanceForm.advance_date} onChange={e => setAdvanceForm({ ...advanceForm, advance_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input type="text" value={advanceForm.reason} onChange={e => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  placeholder="e.g. Took cash for transport"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Saving...' : 'Record Debt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pay Worker Form */}
      {showPayForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pay Worker</h2>
                <p className="text-xs text-gray-400">{showPayForm.full_name} · {formatRWF(showPayForm.daily_wage)}/day</p>
              </div>
              <button onClick={() => setShowPayForm(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handlePay} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Worked</label>
                <input type="number" min="1" value={payForm.days_worked} onChange={e => setPayForm({ ...payForm, days_worked: e.target.value })}
                  required placeholder="e.g. 26"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>

              {payForm.days_worked > 0 && (() => {
                const gross = parseInt(payForm.days_worked) * parseInt(showPayForm.daily_wage)
                const debt = pendingDebt(showPayForm.id)
                const net = Math.max(0, gross - debt)
                return (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gross ({payForm.days_worked} days × {formatRWF(showPayForm.daily_wage)})</span>
                      <span className="font-semibold text-gray-800">{formatRWF(gross)}</span>
                    </div>
                    {debt > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-600">Pending Debt Deduction</span>
                        <span className="font-semibold text-red-600">— {formatRWF(debt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                      <span className="font-bold text-gray-800">Net to Pay</span>
                      <span className="font-bold text-green-700 text-base">{formatRWF(net)}</span>
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 text-base">
                {saving ? 'Processing...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
