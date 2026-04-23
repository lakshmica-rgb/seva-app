'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

import { useMemo } from 'react'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

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

  const router = useRouter()
  const today = getToday()

const [activeTab, setActiveTab] = useState<'seva' | 'monthly' | 'revenue'>('seva')

const [selectedMonth, setSelectedMonth] = useState(
  new Date().toISOString().slice(0, 7)
)

/*
const [monthlyTotal, setMonthlyTotal] = useState(0)
const [monthlyByDate, setMonthlyByDate] = useState<any>({})
const [monthlyBySeva, setMonthlyBySeva] = useState<any>({})
*/


//console.log("BOOKING DATES:", bookings.map(b => b.date))
//console.log("SELECTED MONTH:", selectedMonth)


  // 🔐 Auth + Role
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) {
        router.push('/login')
        return
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('*')

      const match = roles?.find(
        (r: any) =>
          r.email?.toLowerCase().trim() === user.email?.toLowerCase().trim()
      )

      setRole(match?.role || 'volunteer')
    }

    init()
  }, [router])

  // 📥 Fetch bookings
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

  // 🔍 Filter
  useEffect(() => {
    let result: any[] = []

    if (filter === 'future') {
      result = bookings.filter(b => {
        const d = new Date(b.date)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })
    } else if (filter === 'past') {
      result = bookings.filter(b => {
        const d = new Date(b.date)
        d.setHours(0, 0, 0, 0)
        return d < today
      })
    } else {
      result = bookings
    }

    setFiltered(result)
  }, [bookings, filter])




  /*
  const monthData = bookings.filter((b: any) => {
    if (!b.date) return false
    return b.date.substring(0, 7) === selectedMonth
  })

  let total = 0
  const byDate: Record<string, number> = {}
  const bySeva: Record<string, number> = {}

  monthData.forEach((b: any) => {
    total += Number(b.amount || 0)

    byDate[b.date] = (byDate[b.date] || 0) + Number(b.amount || 0)
    bySeva[b.seva_name] = (bySeva[b.seva_name] || 0) + Number(b.amount || 0)
  })

  // 🔥 FORCE NEW OBJECT REFERENCES
  setMonthlyTotal(total)
  setMonthlyByDate({ ...byDate })
  setMonthlyBySeva({ ...bySeva })

}, [bookings, selectedMonth])

*/

  /*
useEffect(() => {
  const monthData = bookings.filter((b: any) =>
    b.date?.startsWith(selectedMonth)
  )

  let total = 0
  const byDate: any = {}
  const bySeva: any = {}

  monthData.forEach((b: any) => {
    total += b.amount || 0

    // by date
    if (!byDate[b.date]) byDate[b.date] = 0
    byDate[b.date] += b.amount || 0

    // by seva
    if (!bySeva[b.seva_name]) bySeva[b.seva_name] = 0
    bySeva[b.seva_name] += b.amount || 0
  })

  setMonthlyTotal(total)
  setMonthlyByDate(byDate)
  setMonthlyBySeva(bySeva)
}, [bookings, selectedMonth])

*/


  // 📅 Group + totals
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

  // 🔴 Logout
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

  // 🧾 Receipt
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

  // 📲 WhatsApp Summary
  const sendWhatsAppSummary = () => {
    const todayStr = new Date().toISOString().split('T')[0]

    const todaysBookings = bookings.filter(b => b.date === todayStr)

    if (!todaysBookings.length) {
      alert("No bookings today")
      return
    }

    let message = `Temple Seva Summary\n\nDate: ${todayStr}\n\n`
    let total = 0

    todaysBookings.forEach((b, i) => {
      message += `${i + 1}. ${b.seva_name} - Rs. ${b.amount}\n`
      total += b.amount || 0
    })

    message += `\nTotal: Rs. ${total}`

    const phone = prompt("Enter WhatsApp number")
    if (!phone) return

    const clean = phone.replace(/\D/g, '')

    const url = `https://api.whatsapp.com/send?phone=91${clean}&text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  // 🔔 Reminder
  const sendReminders = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const tomorrowBookings = bookings.filter(b => b.date === tomorrowStr)

    if (!tomorrowBookings.length) {
      alert("No bookings for tomorrow")
      return
    }

    tomorrowBookings.forEach(b => {
      if (!b.phone) return

      const clean = b.phone.replace(/\D/g, '')

      const message = `Reminder: Your seva is scheduled tomorrow

Seva: ${b.seva_name}
Date: ${b.date}

Thank you`

      const url = `https://api.whatsapp.com/send?phone=91${clean}&text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
    })
  }

  // 📤 CSV EXPORT
  const exportToCSV = () => {
    if (!filtered.length) {
      alert("No data to export")
      return
    }

    const headers = [
      "Date",
      "Seva",
      "Devotee",
      "Phone",
      "Amount",
      "Payment",
      "Status"
    ]

    const rows = filtered.map(b => [
      b.date,
      b.seva_name,
      b.devotee_name,
      b.phone,
      b.amount,
      b.payment_mode,
      b.status
    ])

    const csvContent =
      [headers, ...rows]
        .map(e => e.join(","))
        .join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `seva-bookings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    window.URL.revokeObjectURL(url)
  }

const monthlyData = useMemo(() => {
  const monthData = bookings.filter((b: any) => {
    if (!b.date) return false
    return b.date.substring(0, 7) === selectedMonth
  })

  let total = 0
  const byDate: Record<string, number> = {}
  const bySeva: Record<string, number> = {}

  monthData.forEach((b: any) => {
    const amt = Number(b.amount || 0)
    total += amt

    byDate[b.date] = (byDate[b.date] || 0) + amt
    bySeva[b.seva_name] = (bySeva[b.seva_name] || 0) + amt
  })

  console.log("FINAL MONTH DATA:", monthData)

  return { total, byDate, bySeva }
}, [bookings, selectedMonth])
console.log("SELECTED MONTH:", selectedMonth)
console.log("ALL BOOKINGS:", bookings.map(b => b.date))


const sevaChartData = Object.entries(monthlyData.bySeva).map(([name, value]) => ({
  name,
  value
}))

const dateChartData = Object.entries(monthlyData.byDate).map(([date, value]) => ({
  date,
  value
}))


  return (

<div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
  <div className="max-w-4xl mx-auto space-y-4">

      {/* HEADER */}

<div className="bg-white rounded-2xl shadow p-4 space-y-3">
  
{/* tab block */}
<div className="flex gap-2 bg-gray-100 p-2 rounded-2xl shadow-inner">

  <button
    onClick={() => setActiveTab('seva')}
    className={`flex-1 py-2 rounded-xl font-medium transition ${
      activeTab === 'seva'
        ? 'bg-indigo-500 text-white shadow'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    📋 Seva List
  </button>

  <button
    onClick={() => setActiveTab('monthly')}
    className={`flex-1 py-2 rounded-xl  font-medium ${
      activeTab === 'monthly'
        ? 'bg-indigo-500 text-white shadow'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    📊 Monthly
  </button>

  <button
    onClick={() => setActiveTab('revenue')}
    className={`flex-1 py-2 rounded-xl font-medium ${
      activeTab === 'revenue'
        ? 'bg-indigo-500 text-white shadow'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
  >
    📈 Revenue
  </button>

</div>

{/* tabs block */}

  <div>
    <div className="text-xl font-bold text-gray-800">
      🛕 Temple Dashboard
    </div>
    <div className="text-sm text-gray-500">
      Role: {role}
    </div>
  </div>





<button
  onClick={() => router.push('/booking')}
  className="bg-indigo-500 text-white px-4 py-2 rounded-xl"
>
  ➕ Seva Booking
</button>

  <button
    onClick={handleLogout}
    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm"
  >
    Logout
  </button>
</div>
      
{activeTab === 'monthly' && (
<div className="bg-white rounded-2xl shadow p-4">
  <div className="flex justify-between items-center mb-3">
    <div className="text-lg font-semibold text-gray-800">
      📊 Monthly Overview
    </div>

    <input
      type="month"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="border px-2 py-1 rounded text-black"
    />
  </div>

  <div className="text-2xl font-bold text-green-600 mb-3">
    ₹ {monthlyData.total}
  </div>

  <div className="grid grid-cols-2 gap-3">

    {/* By Date */}
    <div className="bg-gray-50 p-3 rounded-xl text-black">
      <div className="text-sm font-semibold mb-2">By Date</div>

      {Object.keys(monthlyData.byDate).length === 0 ? (
        <div className="text-xs text-gray-500">No data</div>
      ) : (
        Object.entries(monthlyData.byDate).map(([d, amt]) => (
          <div key={d} className="flex justify-between text-sm">
            <span>{d}</span>
            <span>₹ {amt}</span>
          </div>
        ))
      )}
    </div>

    {/* By Seva */}
    <div className="bg-gray-50 p-3 rounded-xl text-black">
      <div className="text-sm font-semibold mb-2">By Seva</div>

      {Object.keys(monthlyData.bySeva).length === 0 ? (
        <div className="text-xs text-gray-500">No data</div>
      ) : (
        Object.entries(monthlyData.bySeva).map(([s, amt]) => (
          <div key={s} className="flex justify-between text-sm">
            <span>{s}</span>
            <span>₹ {amt}</span>
          </div>
        ))
      )}
    </div>

  </div>
</div>
)}

{activeTab === 'seva' && (
  <div className="space-y-3">

    {/* ADMIN ACTIONS */}
    {role === 'admin' && (
      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={sendWhatsAppSummary}
          className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl"
        >
          📲 Send Today Summary
        </button>

        <button
          onClick={sendReminders}
          className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl"
        >
          🔔 Send Reminders
        </button>

        <button
          onClick={exportToCSV}
          className="bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-xl"
        >
          📤 Export CSV
        </button>
      </div>
    )}

    {/* FILTERS */}
    <div className="flex gap-2 mb-3 overflow-x-auto text-black">
      {['future', 'past', 'all'].map(f => (
        <button
          key={f}
          onClick={() => setFilter(f as any)}
          className={`px-3 py-1 border rounded ${
            filter === f ? 'bg-black text-white' : ''
          }`}
        >
          {f === 'future' ? 'Today + Future' : f === 'past' ? 'Past' : 'All'}
        </button>
      ))}
    </div>

    {/* CONTENT */}
    {loading ? (
      <div>Loading...</div>
    ) : Object.keys(grouped).length === 0 ? (
      <div className="text-black">No bookings</div>
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
                      {b.status !== 'Completed' && (
                        <button
                          className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                          onClick={() => markCompleted(b.id)}
                        >
                          Done
                        </button>
                      )}

                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                        onClick={() => downloadReceipt(b)}
                      >
                        Receipt
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

 
  

  {activeTab === 'revenue' && (
  <div className="space-y-4">

    {/* KPI Tiles */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      
      <div className="bg-white p-3 rounded-xl shadow text-center">
        <div className="text-xs text-gray-500">Today</div>
        <div className="text-lg font-bold text-green-600">
          ₹ {
            bookings
              .filter(b => b.date === new Date().toISOString().split('T')[0])
              .reduce((sum, b) => sum + (b.amount || 0), 0)
          }
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow text-center">
        <div className="text-xs text-gray-500">This Month</div>
        <div className="text-lg font-bold text-blue-600">
          ₹ {monthlyData.total}
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl shadow text-center">
        <div className="text-xs text-gray-500">Total</div>
        <div className="text-lg font-bold text-purple-600">
          ₹ {bookings.reduce((s, b) => s + (b.amount || 0), 0)}
        </div>
      </div>

    </div>

    {/* Charts BELOW */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <div className="bg-white p-4 rounded-xl shadow">
        <div className="font-semibold mb-2">Seva-wise Revenue</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={sevaChartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <div className="font-semibold mb-2">Daily Revenue</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dateChartData}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    </div>

)}
    </div>   {/* max-w-4xl container */}
  </div>     {/* page container */}
)
}
