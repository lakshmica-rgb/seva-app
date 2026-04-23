'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

import BookingForm from '../components/BookingForm'


const getToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [grouped, setGrouped] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'future' | 'past' | 'all'>('future')
  const [role, setRole] = useState<string>('volunteer')
  const [activeTab, setActiveTab] = useState<'seva' | 'monthly' | 'revenue'>('seva')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const [showBooking, setShowBooking] = useState(false)

 const [editBooking, setEditBooking] = useState<any>(null)

  const router = useRouter()
  const today = getToday()
const [userName, setUserName] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (user) {
        setUserName(user.user_metadata?.name || user.email || 'User')
       }

      

      if (!user) {
        router.push('/login')
        return
      }

      const { data: roles } = await supabase.from('user_roles').select('*')

      const match = roles?.find(
        (r: any) =>
          r.email?.toLowerCase().trim() === user.email?.toLowerCase().trim()
      )

      setRole(match?.role || 'volunteer')
    }

    init()
  }, [router])

  const fetchBookings = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('seva_bookings')
      .select('*')
      .order('date', { ascending: true })

    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    let result: any[] = []

    if (filter === 'future') {
      result = bookings.filter(b => new Date(b.date) >= today)
    } else if (filter === 'past') {
      result = bookings.filter(b => new Date(b.date) < today)
    } else {
      result = bookings
    }

    setFiltered(result)
  }, [bookings, filter])

  useEffect(() => {
    const groupedData: any = {}

    filtered.forEach(b => {
      if (!groupedData[b.date]) {
        groupedData[b.date] = { bookings: [], total: 0 }
      }

      groupedData[b.date].bookings.push(b)
      groupedData[b.date].total += b.amount || 0
    })

    setGrouped(groupedData)
  }, [filtered])

  const monthlyData = useMemo(() => {
    const monthData = bookings.filter(b =>
      b.date?.startsWith(selectedMonth)
    )

    let total = 0
    const byDate: any = {}
    const bySeva: any = {}

    monthData.forEach((b: any) => {
      const amt = Number(b.amount || 0)
      total += amt

      byDate[b.date] = (byDate[b.date] || 0) + amt
      bySeva[b.seva_name] = (bySeva[b.seva_name] || 0) + amt
    })

    return { total, byDate, bySeva }
  }, [bookings, selectedMonth])

  const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4']

const sevaChartData = Object.entries(monthlyData.bySeva).map(([name, value], index) => ({
  name,
  value,
  fill: COLORS[index % COLORS.length]
}))

  const dateChartData = Object.entries(monthlyData.byDate).map(([date, value]) => ({
    date,
    value
  }))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ✅ Mark completed
const markCompleted = async (id: string) => {
  await supabase
    .from('seva_bookings')
    .update({ status: 'Completed' })
    .eq('id', id)

  fetchBookings()
}

const deleteBooking = async (id: string) => {
  const confirmDelete = confirm("Are you sure you want to delete this booking?")
  if (!confirmDelete) return

 const { data, error } = await supabase
    .from('seva_bookings')
    .delete()
    .eq('id', id)
    .select()   // 🔥 IMPORTANT (forces response)

  console.log("DELETE RESULT:", data, error)

  if (error) {
    alert("Delete failed: " + error.message)
    return
  }

  await fetchBookings()
}

// 🧾 Receipt download
const downloadReceipt = async (b: any) => {
  const res = await fetch('/api/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b)
  })

  if (!res.ok) {
    alert("Receipt failed")
    return
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = 'receipt.pdf'
  a.click()

  window.URL.revokeObjectURL(url)
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 text-gray-800">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4 sticky top-2 z-10 text-gray-800">

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-2 rounded-2xl shadow-inner">
            {['seva', 'monthly', 'revenue'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 rounded-xl font-medium ${
                  activeTab === tab
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'seva' && '📋 Seva'}
                {tab === 'monthly' && '📊 Monthly'}
                {tab === 'revenue' && '📈 Revenue'}
              </button>
            ))}
          </div>

          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold">
                🛕 Temple Dashboard
              </div>
              <div className="text-sm text-gray-500">
                Welcome, {userName}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditBooking(null)   // 🔥 THIS FIXES IT
                  setShowBooking(true)
                }} className="bg-indigo-500 text-white px-4 py-2 rounded-xl"
              >
                ➕ Booking
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* MONTHLY */}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-2xl shadow p-4 text-gray-800">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border p-1 mb-3"
            />

            <div className="font-bold text-green-600 mb-2">
              ₹ {monthlyData.total}
            </div>

            {Object.entries(monthlyData.bySeva).map(([s, amt]) => (
              <div key={s} className="flex justify-between text-sm bg-gray-50 p-2 rounded mb-1">
                <span>{s}</span>
                <span>₹ {Number(amt)}</span>
              </div>
            ))}
          </div>
        )}

        {/* SEVA */}
        {activeTab === 'seva' && (
          <div className="space-y-4 text-gray-800">

            <div className="flex gap-2">
              {['future', 'past', 'all'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-3 py-1 rounded ${
                    filter === f ? 'bg-black text-white' : 'bg-gray-200 text-black'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

{loading ? (
  <div>Loading...</div>
) : Object.keys(grouped).length === 0 ? (
  <div className="text-gray-500 text-center py-6">
    🙏 No bookings found
  </div>
) : (
  <div className="space-y-4">
    {Object.keys(grouped)
      .sort()
      .map((date) => (
        <div key={date} className="bg-white rounded-2xl shadow p-3">

          <div className="flex justify-between mb-2">
            <div className="font-semibold text-gray-800">
              {formatDate(date)}
            </div>
            <div className="text-green-600 font-medium">
              ₹ {grouped[date].total}
            </div>
          </div>

          <div className="space-y-2">
            {grouped[date].bookings.map((b: any) => (
              <div key={b.id} className="bg-gray-50 rounded-xl p-3 text-sm">

                <div className="flex justify-between">
                  <div className="font-medium text-gray-800">
                    {b.seva_name}
                  </div>
                  <div className="text-green-600">
                    ₹ {b.amount}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {b.devotee_name}
                </div>

                <div className="flex gap-2 mt-2">

                  {/* ✅ EDIT */}
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => {
                      setEditBooking(b)
                      setShowBooking(true)
                    }}
                  >
                    Edit
                  </button>

                  {/* ✅ DONE */}
                  {b.status !== 'Completed' && (
                    <button
                      className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => markCompleted(b.id)}
                    >
                      Done
                    </button>
                  )}

                  {/* ✅ RECEIPT */}
                  <button
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => downloadReceipt(b)}
                  >
                    Receipt
                  </button>

                  {/* ✅ DELETE */}
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => deleteBooking(b.id)}
                  >
                    Delete
                  </button>

                </div>



              </div>
            ))}
          </div>

        </div>
      ))}
  </div>   
)}
  
 </div>   
)}
        {/* REVENUE */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-500 text-white p-3 rounded">
                Today ₹ {bookings.reduce((s, b) => s + (b.amount || 0), 0)}
              </div>
              <div className="bg-blue-500 text-white p-3 rounded">
                Month ₹ {monthlyData.total}
              </div>
              <div className="bg-purple-500 text-white p-3 rounded">
                Total ₹ {bookings.reduce((s, b) => s + (b.amount || 0), 0)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="bg-white p-4 rounded shadow">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sevaChartData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" isAnimationActive radius={[6,6,0,0]}>
                      {sevaChartData.map((entry, index) => (
                        <rect
                          key={index}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                      
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dateChartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                      <Bar dataKey="value"  fill="#22C55E"  isAnimationActive radius={[6,6,0,0]}>
                      {sevaChartData.map((entry, index) => (
                        <rect
                          key={index}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>

          </div>
        )}

      </div>

{showBooking && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 ">

    <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg p-6 relative max-h-[90vh] overflow-y-auto text-black">

      {/* Close */}
      <button
        onClick={() => setShowBooking(false)}
        className="absolute top-2 right-2 text-gray-500"
      >
        ✕
      </button>

      {/* Title */}
      <div className="text-lg font-semibold mb-3">
        {editBooking ? "✏️ Edit Seva Booking" : "➕ New Seva Booking"}
      </div>

      {/* 🔥 COPY YOUR EXISTING BOOKING FORM HERE */}
      <BookingForm
        initialData={editBooking}
        onSuccess={() => {
          setShowBooking(false)
          setEditBooking(null)
          fetchBookings()
        }}
      />
      
    </div>
  </div>
)}

    </div>
  )
}