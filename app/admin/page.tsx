'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

import BookingForm from '../components/BookingForm'
import ChatBot from '../components/ChatBot'

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

const isSameMonth = (dateStr: string, target: Date) => {
  const d = new Date(dateStr)
  return (
    d.getMonth() === target.getMonth() &&
    d.getFullYear() === target.getFullYear()
  )
}

const isWithinRange = (date: Date, start: string, end: string) => {
  const s = new Date(start)
  const e = new Date(end)
  return date >= s && date <= e
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

const [showChat, setShowChat] = useState(false)


// adding new function for calculation
const getRevenue = (bookings: any[], type: 'total' | 'today') => {
  const now = new Date()

  return bookings.reduce((sum, b) => {

     const d = new Date(b.date)

    // 🟢 ONE-TIME
    if (b.donation_type !== 'recurring') {

      if (type === 'today') {
        if (d.toDateString() === now.toDateString()) {
          return sum + (b.amount || 0)
        }
        return sum
      }

      if (type === 'total') {
        return sum + (b.amount || 0)
      }
    }

    // 🔵 RECURRING
    if (b.donation_type === 'recurring') {

      // TODAY → ignore recurring
      if (type === 'today') {
        return sum
      }

      // TOTAL → full donation amount
      if (type === 'total') {
        return sum + (b.amount || 0)
      }
    }

    return sum
  }, 0)
}
   

const downloadCSV = () => {
  if (!bookings.length) {
    alert("No data to download")
    return
  }

  const headers = [
    "Date",
    "Seva",
    "Devotee Name",
    "Phone",
    "House Number",
    "Payment Mode",
    "Payment Reference",
    "Amount",
    "Status",
    "Notes",
    "Sankalpa Details"
  ]

  const rows = bookings.map(b => [
    b.date,
    b.seva_name,
    b.devotee_name || '',
    b.phone || '',
    b.house_number || '',
    b.payment_mode || '',
    b.payment_reference || '',
    b.amount || 0,
    b.status || '',
    b.notes || '',
    b.sankalpa_details || ''
  ])

  const csvContent =
    [headers, ...rows]
      .map(row => row.map(val => `"${val}"`).join(','))
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `seva_bookings_${new Date().toISOString().slice(0, 10)}.csv`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


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

  const getMonthlyRevenue = (bookings: any[], monthIndex: number, year: number) => {
//  const targetDate = new Date(year, monthIndex, 1)
  const targetMonth = new Date(year, monthIndex, 1)

  return bookings.reduce((sum, b) => {

    // 🟢 ONE-TIME
    if (b.donation_type !== 'recurring') {
      const d = new Date(b.date)

      if (
        d.getMonth() === monthIndex &&
        d.getFullYear() === year
      ) {
        return sum + (b.amount || 0)
      }

      return sum
    }

    // 🔵 RECURRING
    if (
      b.donation_start_date &&
      b.donation_end_date &&
      b.monthly_amount
    ) {
      const start = new Date(b.donation_start_date)
      const end = new Date(b.donation_end_date)
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

//      if (targetDate >= start && targetDate <= end) {
        if (targetMonth >= startMonth && targetMonth <= endMonth) {
        return sum + (Number(b.monthly_amount) || 0)
      }
    }

    return sum
  }, 0)
}

const buildMonthlyData = (bookings: any[], selectedMonth: string) => {
  const bySeva: any = {}
  const byDate: any = {}
  let total = 0

//  const [year, month] = selectedMonth.split('-').map(Number)

const parts = selectedMonth.split('-')
const year = Number(parts[0])
const month = Number(parts[1])

if (!year || !month) {
  return { bySeva: {}, byDate: {}, total: 0 }
}

  bookings.forEach((b) => {

    // 🟢 ONE-TIME
    if (b.donation_type !== 'recurring') {
      const d = new Date(b.date)

      if (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month
      ) {
        const seva = b.seva_name || 'Unknown'
        const amount = b.amount || 0

        bySeva[seva] = (bySeva[seva] || 0) + amount
        byDate[b.date] = (byDate[b.date] || 0) + amount
        total += amount
      }

      return
    }

    // 🔵 RECURRING
    if (
      b.donation_start_date &&
      b.donation_end_date &&
      b.monthly_amount
    ) {
      const start = new Date(b.donation_start_date)
      const end = new Date(b.donation_end_date)

//      const current = new Date(year, month - 1, 1)
//      if (current >= start && current <= end) 

// Normalize to month level
        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
        const currentMonth = new Date(year, month - 1, 1)

        if (currentMonth >= startMonth && currentMonth <= endMonth)
        {
        const seva = b.seva_name || 'General Seva'
        const amount = Number(b.monthly_amount) || 0

        bySeva[seva] = (bySeva[seva] || 0) + amount

//       const key = currentMonth.toISOString().split('T')[0]
         const key = `${year}-${String(month).padStart(2, '0')}-01`
        byDate[key] = (byDate[key] || 0) + amount

        total += amount
      }
    }
  })

  return { bySeva, byDate, total }
}

// Project revenue block
const getProjectedRevenue = (bookings: any[], monthsAhead: number) => {
  const now = new Date()

  const projections = []

  for (let i = 1; i <= monthsAhead; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() + i, 1)

    const value = bookings.reduce((sum, b) => {

      // 🔵 ONLY RECURRING matters for projection
      if (
        b.donation_type === 'recurring' &&
        b.donation_start_date &&
        b.donation_end_date &&
        b.monthly_amount
      ) {
        const start = new Date(b.donation_start_date)
        const end = new Date(b.donation_end_date)

        const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

        if (target >= startMonth && target <= endMonth) {
          return sum + (Number(b.monthly_amount) || 0)
        }
      }

      return sum
    }, 0)

    projections.push({
      month: target.toLocaleString('default', { month: 'short' }),
      value
    })
  }

  return projections
}



  const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4']

const monthlyData = useMemo(() => {
  return buildMonthlyData(bookings, selectedMonth)
}, [bookings, selectedMonth])

const projectionData = useMemo(() => {
  return getProjectedRevenue(bookings, 6)
}, [bookings])

const nextMonthRevenue = projectionData[0]?.value || 0

const next3MonthsRevenue = projectionData
  .slice(0, 3)
  .reduce((s, m) => s + m.value, 0)

const activeRecurring = bookings
  .filter(b => b.donation_type === 'recurring')
  .reduce((s, b) => s + (Number(b.monthly_amount) || 0), 0)


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

              <button onClick={() => setShowChat(true)} className="bg-purple-500 text-white px-4 py-2 rounded-xl">
                💬 Ask Ganesha
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

            <button
              onClick={downloadCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-xl"
            >
              ⬇️ CSV
            </button>


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
                Today ₹ {getRevenue(bookings, 'today')}
              </div>
              <div className="bg-blue-500 text-white p-3 rounded">
                Month ₹ {monthlyData.total}
              </div>
              <div className="bg-purple-500 text-white p-3 rounded">
                Total ₹ {getRevenue(bookings, 'total')}
              </div>
            </div>

            {/* 🔮 PROJECTION KPIs */}
            <div className="grid grid-cols-3 gap-3"> 
              <div className="bg-indigo-500 text-white p-3 rounded">
                Projection<br></br> Next Month ₹ {nextMonthRevenue}
              </div>
              <div className="bg-orange-500 text-white p-3 rounded">
                Projection<br></br>Next 3 Months ₹ {next3MonthsRevenue}
              </div>
              <div className="bg-teal-500 text-white p-3 rounded">
                Projection<br></br>Recurring Base ₹ {activeRecurring}
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

              <div className="bg-white p-4 rounded shadow">
                <div className="font-semibold mb-2">📈 Future Revenue Projection</div>

                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={projectionData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366F1" radius={[6,6,0,0]} />
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


{showChat && (
  <ChatBot onClose={() => setShowChat(false)} />
)}

    </div>
  )
}