'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BookingPage() {

  const [form, setForm] = useState({
    name: '',
    phone: '',
    seva: '',
    date: '',
    amount: ''
  })


  const router = useRouter()

  const submit = async () => {
    await supabase.from('seva_bookings').insert({
      devotee_name: form.name,
      phone: form.phone,
      seva_name: form.seva,
      date: form.date,
      amount: Number(form.amount)
    })

    alert("Booking saved")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 p-4">

      <div className="max-w-md mx-auto bg-white p-4 rounded-2xl shadow text-black">

        <div className="text-lg font-bold mb-3">
          🛕 Seva Booking
        </div>

        <input placeholder="Name" className="w-full border p-2 mb-2 rounded"
          onChange={(e) => setForm({...form, name: e.target.value})} />

        <input placeholder="Phone" className="w-full border p-2 mb-2 rounded"
          onChange={(e) => setForm({...form, phone: e.target.value})} />

        <input placeholder="Seva" className="w-full border p-2 mb-2 rounded"
          onChange={(e) => setForm({...form, seva: e.target.value})} />

        <input type="date" className="w-full border p-2 mb-2 rounded"
          onChange={(e) => setForm({...form, date: e.target.value})} />

        <input placeholder="Amount" className="w-full border p-2 mb-3 rounded"
          onChange={(e) => setForm({...form, amount: e.target.value})} />

        <button
          onClick={submit}
          className="bg-green-500 text-white px-4 py-2 rounded-xl"
        >
          Seva Booking
        </button>

        <button
        onClick={() => router.push('/admin')}
        className="mb-3 bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 rounded-xl items-center gap-2">   
        ⬅ Back to Dashboard
        </button>

      </div>
    </div>
  )
}