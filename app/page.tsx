'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const SEVAS = [
  "Ganesha Archana",
  "Ganesha Abhishekam",
  "Ganesha Vastra",
  "Ganesha Butter Alankara",
  "Sankatahara Chaturthi",
  "Hanuman Archana",
  "Hanuman Abhishekam",
  "Hanuman Vastra",
  "Hanuman Butter Alankara",
  "Vada Mala"
]

const PRICE_MAP: any = {
  "Ganesha Archana": 51,
  "Ganesha Abhishekam": 301,
  "Ganesha Vastra": 501,
  "Ganesha Butter Alankara": 501,
  "Sankatahara Chaturthi": 201,
  "Hanuman Archana": 51,
  "Hanuman Abhishekam": 1000,
  "Hanuman Vastra": 1000,
  "Hanuman Butter Alankara": 501,
  "Vada Mala": 401
}

const EXCLUSIVE_SEVAS = [
  "Ganesha Vastra",
  "Ganesha Butter Alankara",
  "Hanuman Vastra",
  "Hanuman Butter Alankara"
]

const getToday = () => {
  return new Date().toISOString().split('T')[0]
}

export default function Home() {
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [bookedDates, setBookedDates] = useState<string[]>([]

  )

  const today = getToday()

  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!form.seva_name || !EXCLUSIVE_SEVAS.includes(form.seva_name)) {
        setBookedDates([])
        return
      }

      const { data, error } = await supabase
        .from('seva_bookings')
        .select('date')
        .eq('seva_name', form.seva_name)

      if (error) {
        console.error(error)
        return
      }

      const futureDates = data
        .map((d: any) => d.date)
        .filter((date: string) => date >= today)

      setBookedDates(futureDates)
    }

    fetchBookedDates()
  }, [form.seva_name, today])

  const handleSubmit = async () => {
    if (!form.date || !form.seva_name) {
      alert("Please fill required fields")
      return
    }

    if (form.date < today) {
      alert("Cannot book seva for past dates")
      return
    }

    setLoading(true)

    if (EXCLUSIVE_SEVAS.includes(form.seva_name)) {
      if (bookedDates.includes(form.date)) {
        alert("This seva is already booked for this date")
        setLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from('seva_bookings')
      .insert([
        {
          date: form.date,
          seva_name: form.seva_name,
          devotee_name: form.devotee_name || '',
          phone: form.phone || '',
          payment_mode: form.payment_mode || '',
          amount: PRICE_MAP[form.seva_name],
          status: 'Pending'
        }
      ])

    setLoading(false)

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }

    alert("Seva booked successfully")

    // 🧾 Generate receipt
    const res = await fetch('/api/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: PRICE_MAP[form.seva_name]
      })
    })

    if (res.ok) {
      const blob = await res.blob()
      if (blob.size > 0) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'seva-receipt.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }
    }

    // 📲 WhatsApp (FIXED VERSION)
    if (form.phone && form.phone.length >= 10) {
      const cleanPhone = form.phone.replace(/\D/g, '')

      const message = `Seva Booking Confirmed

Seva: ${form.seva_name}
Date: ${form.date}
Amount: Rs. ${PRICE_MAP[form.seva_name]}

Thank you`

      const whatsappUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    } else {
      alert("Enter valid phone number to open WhatsApp")
    }

    setForm({})
    setBookedDates([])
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Seva Booking</h1>

      <input
        type="date"
        className="w-full mb-2 p-2 border"
        value={form.date || ''}
        min={today}
        onChange={e => setForm({ ...form, date: e.target.value })}
      />

      <select
        className="w-full mb-2 p-2 border"
        value={form.seva_name || ''}
        onChange={e => setForm({ ...form, seva_name: e.target.value })}
      >
        <option value="">Select Seva</option>
        {SEVAS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {EXCLUSIVE_SEVAS.includes(form.seva_name) && bookedDates.length > 0 && (
        <div className="mb-3 text-sm text-red-600">
          <strong>Booked Dates (Upcoming):</strong>
          <ul>
            {bookedDates.map((date, i) => (
              <li key={i}>❌ {date}</li>
            ))}
          </ul>
        </div>
      )}

      <input
        placeholder="Devotee Name"
        className="w-full mb-2 p-2 border"
        value={form.devotee_name || ''}
        onChange={e => setForm({ ...form, devotee_name: e.target.value })}
      />

      <input
        placeholder="Phone Number"
        className="w-full mb-2 p-2 border"
        value={form.phone || ''}
        onChange={e => setForm({ ...form, phone: e.target.value })}
      />

      <select
        className="w-full mb-2 p-2 border"
        value={form.payment_mode || ''}
        onChange={e => setForm({ ...form, payment_mode: e.target.value })}
      >
        <option value="">Payment Mode</option>
        <option value="Cash">Cash</option>
        <option value="UPI">UPI</option>
      </select>

      {form.seva_name && (
        <div className="mb-2 text-sm">
          Amount: Rs. {PRICE_MAP[form.seva_name]}
        </div>
      )}

      <button
        className="w-full bg-black text-white p-2"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Booking..." : "Book Seva"}
      </button>
    </div>
  )
}