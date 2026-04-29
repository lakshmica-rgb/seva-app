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
  "General Seva"
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
  "Hanuman Butter Alankara": 501
}

const EXCLUSIVE_SEVAS = [
  "Ganesha Vastra",
  "Ganesha Butter Alankara",
  "Hanuman Vastra",
  "Hanuman Butter Alankara"
]

const getToday = () => new Date().toISOString().split('T')[0]

export default function BookingForm({ initialData, onSuccess }: any) {

const emptyForm = {
  date: '',
  seva_name: 'General Seva',
  devotee_name: '',
  phone: '',
  house_number: '',
  payment_mode: '',
  notes: '',
  sankalpa_details: '',
  payment_reference: '',
  amount: '',
  // 🆕 NEW FIELDS
  donation_type: 'one_time',
  donation_start_date: '',
  donation_end_date: '',
  monthly_amount: '',
  next_reminder_date: ''
}

const [form, setForm] = useState<any>(emptyForm)


  const [loading, setLoading] = useState(false)
  const [bookedDates, setBookedDates] = useState<string[]>([])

  const today = getToday()

  useEffect(() => {
    if (initialData) {
      setForm(initialData)
    } else {
    setForm(emptyForm)   // 🔥 ensures clean reset
    }
   }, [initialData])

  useEffect(() => {
    const fetchBookedDates = async () => {
      if (!form.seva_name || !EXCLUSIVE_SEVAS.includes(form.seva_name)) {
        setBookedDates([])
        return
      }



        let query = supabase
        .from('seva_bookings')
        .select('date, id')
        .eq('seva_name', form.seva_name)

        // 🔥 Exclude current record in edit mode
        if (initialData?.id) {
        query = query.neq('id', initialData.id)
        }

        const { data: bookingsData, error } = await query

        if (error) {
        console.error(error)
        return
        }

        if (!bookingsData) return

      const futureDates = bookingsData
        .map((d: any) => d.date)
        .filter((date: string) => date >= today)

      setBookedDates(futureDates)
    }

    fetchBookedDates()
  }, [form.seva_name, today,initialData ])

  const isValidPhone = (phone: string) => /^\d{10}$/.test(phone)

  const handleSubmit = async () => {
    if (!form.date || !form.seva_name) {
      alert("Please fill required fields")
      return
    }

    if (form.seva_name === "General Seva" && (!form.amount || form.amount <= 0)) {
    alert("Please enter valid amount")
    return
    }

    // ❌ Allow past date only in EDIT mode
    if (!initialData?.id && form.date < today) {
    alert("Cannot book seva for past dates")
    return
    }

    if (form.phone && !isValidPhone(form.phone)) {
      alert("Enter valid 10-digit phone number")
      return
    }

      if (form.donation_type === 'recurring') {
        if (!form.donation_start_date || !form.donation_end_date) {
          alert("Please select start and end dates")
          return
        }
      }

    setLoading(true)

    if (!initialData?.id && EXCLUSIVE_SEVAS.includes(form.seva_name)) {
      if (bookedDates.includes(form.date)) {
        alert("❌ This seva is already booked for this date")
        setLoading(false)
        return
      }
    }

    const amount =
        form.seva_name === "General Seva"
            ? Number(form.amount || 0)
            : PRICE_MAP[form.seva_name]

    let error

    if (initialData?.id) {
      // ✏️ UPDATE
      const res = await supabase
        .from('seva_bookings')
        .update({
          date: form.date,
          seva_name: form.seva_name,
          devotee_name: form.devotee_name || '',
          phone: form.phone || '',
          house_number: form.house_number || '',
          payment_mode: form.payment_mode || '',
          payment_reference: form.payment_reference || '',
          sankalpa_details: form.sankalpa_details || '',
          notes: form.notes || '',
          amount,
          donation_type: form.donation_type,
          donation_start_date: form.donation_start_date || null,
          donation_end_date: form.donation_end_date || null,
          monthly_amount: form.monthly_amount || null,
          next_reminder_date: form.next_reminder_date || null


        })
        .eq('id', initialData.id)

      error = res.error

    } else {
      // ➕ INSERT
      const res = await supabase
        .from('seva_bookings')
        .insert([
          {
            date: form.date,
            seva_name: form.seva_name,
            devotee_name: form.devotee_name || '',
            phone: form.phone || '',
            house_number: form.house_number || '',
            payment_mode: form.payment_mode || '',
            payment_reference: form.payment_reference || '',
            sankalpa_details: form.sankalpa_details || '',
            notes: form.notes || '',
            amount,
            status: 'Pending',
            donation_type: form.donation_type,
            donation_start_date: form.donation_start_date || null,
            donation_end_date: form.donation_end_date || null,
            monthly_amount: form.monthly_amount || null,
            next_reminder_date: form.next_reminder_date || null
          }
        ])

      error = res.error
    }

    // ✅ COMMON SUCCESS HANDLING (FIXED)
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert(initialData ? "Updated successfully" : "Booked successfully")

    // Receipt only for new booking (optional)
    if (!initialData) {
      try {
        const res = await fetch('/api/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, amount })
        })

        if (res.ok) {
          const blob = await res.blob()
          if (blob.size > 0) {
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'seva-receipt.pdf'
            a.click()
            window.URL.revokeObjectURL(url)
          }
        }
      } catch {
        console.log("Receipt skipped")
      }

      // WhatsApp only for new booking
      if (form.phone && isValidPhone(form.phone)) {
        const clean = form.phone.replace(/\D/g, '')

        const message = `Seva Booking Confirmed

Seva: ${form.seva_name}
Date: ${form.date}
Amount: Rs. ${amount}

Thank you`

        const url = `https://api.whatsapp.com/send?phone=91${clean}&text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
      }
    }

    setForm({
        date: '',
        seva_name: '',
        devotee_name: '',
        phone: '',
        house_number: '',
        payment_mode: '',
        notes: '',
        sankalpa_details: ''
        })

    setBookedDates([])

    if (onSuccess) onSuccess()
  }

// new code for recurring amt calculation
const calculateMonthly = (start: string, end: string, total: number) => {
  if (!start || !end || !total) return ''

  const s = new Date(start)
  const e = new Date(end)

  const months =
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth()) + 1

  if (months <= 0) return ''

  return Math.round(total / months)
}
// new code for recurring amt calculation

const getNextReminderDate = (endDate: string) => {
  if (!endDate) return ''

  const d = new Date(endDate)

  // Move to next month
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)

  return next.toISOString().split('T')[0]
}

  return (
    <div className="space-y-3 text-black">

      <input
        type="date"
        className="w-full p-2 border rounded"
        value={form.date || ''}
        min={initialData?.id ? '' : today}
        onChange={e => setForm({ ...form, date: e.target.value })}
      />

      <select
        className="w-full p-2 border rounded"
        value={form.seva_name || ''}
        onChange={e => setForm({ ...form, seva_name: e.target.value })}
      >
        <option value="">Select Seva</option>
        {SEVAS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {EXCLUSIVE_SEVAS.includes(form.seva_name) && bookedDates.length > 0 && (
        <div className="text-sm text-red-600">
          <strong>Booked Dates:</strong>
          <ul>
            {bookedDates.map((d, i) => (
              <li key={i}>❌ {d}</li>
            ))}
          </ul>
        </div>
      )}

      {form.seva_name === 'General Seva' && (
        <select
          className="w-full p-2 border rounded"
          value={form.donation_type}
          onChange={e =>
            setForm({ ...form, donation_type: e.target.value })
          }
        >
          <option value="one_time">One-time</option>
          <option value="recurring">Recurring</option>
        </select>
      )}

      {form.seva_name === 'General Seva' &&
      form.donation_type === 'recurring' && (
        <div className="space-y-3">

          {/* Start Date */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Recurring Donation Start Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={form.donation_start_date || ''}
              onChange={e => {
                const start = e.target.value
                const monthly = calculateMonthly(
                  start,
                  form.donation_end_date,
                  form.amount
                )

                setForm({
                  ...form,
                  donation_start_date: start,
                  monthly_amount: monthly
                })
              }}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Recurring Donation End Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={form.donation_end_date || ''}
              onChange={e => {
                const end = e.target.value

                // ⚠️ VALIDATION
                if (form.donation_start_date && end < form.donation_start_date) {
                  alert("End date cannot be before start date")
                  return
                }

                const monthly = calculateMonthly(
                  form.donation_start_date,
                  end,
                  form.amount
                )

                // 🆕 AUTO REMINDER
                const reminder = getNextReminderDate(end)

                setForm({
                  ...form,
                  donation_end_date: end,
                  monthly_amount: monthly,
                  next_reminder_date: reminder
                })
              }}

            />
          </div>

          {/* Monthly Amount */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Monthly Contribution (Auto Calculated)
            </label>
            <input
              disabled
              className="w-full p-2 border rounded bg-gray-100"
              value={form.monthly_amount || ''}
              placeholder="Monthly Amount"
            />
          </div>

          {/* Next Reminder */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Next Donation Reminder Date
            </label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={form.next_reminder_date || ''}
              onChange={e =>
                setForm({
                  ...form,
                  next_reminder_date: e.target.value
                })
              }
            />
          </div>

        </div>
      )}

      <input
        placeholder="Devotee Name"
        className="w-full p-2 border rounded"
        value={form.devotee_name || ''}
        onChange={e => setForm({ ...form, devotee_name: e.target.value })}
      />

      <input
        placeholder="Phone Number"
        className="w-full p-2 border rounded"
        value={form.phone || ''}
        onChange={e => setForm({ ...form, phone: e.target.value })}
      />

      <input
        placeholder="House Number"
        className="w-full p-2 border rounded"
        value={form.house_number || ''}
        onChange={e => setForm({ ...form, house_number: e.target.value })}
      />

      <select
        className="w-full p-2 border rounded"
        value={form.payment_mode || ''}
        onChange={e => setForm({ ...form, payment_mode: e.target.value })}
      >
        <option value="">Payment Mode</option>
        <option value="Cash">Cash</option>
        <option value="UPI">UPI</option>
      </select>

        <input
        placeholder="Payment Reference (Txn ID / UPI Ref)"
        className="w-full p-2 border rounded"
        value={form.payment_reference || ''}
        onChange={e => setForm({ ...form, payment_reference: e.target.value })}
        />

        {/* Sankalpa Details */}
        <textarea
        placeholder="Sankalpa Details Gothra
                     Name
                     Star
                     Rasi"
        className="w-full p-2 border rounded"
        value={form.sankalpa_details || ''}
        onChange={e => setForm({ ...form, sankalpa_details: e.target.value })}
        />

      <textarea
        placeholder="Notes (optional)"
        className="w-full p-2 border rounded"
        value={form.notes || ''}
        onChange={e => setForm({ ...form, notes: e.target.value })}
      />

            {form.seva_name === "General Seva" ? (
                <input
                    type="number"
                    placeholder="Enter Amount"
                    className="w-full p-2 border rounded"
                    value={form.amount || ''}
                    onChange={e => {
                      const value = Number(e.target.value)

                      let monthly = form.monthly_amount

                      if (form.donation_type === 'recurring') {
                        monthly = calculateMonthly(
                          form.donation_start_date,
                          form.donation_end_date,
                          value
                        )
                      }

                      setForm({
                        ...form,
                        amount: value,
                        monthly_amount: monthly
                      })
                    }}

//                    onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                />
                ) : form.seva_name ? (
                <div className="text-sm font-medium">
                    Amount: Rs. {PRICE_MAP[form.seva_name]}
                </div>
        ) : null}

      <button
        className="w-full bg-green-600 text-white p-2 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Saving..." : initialData ? "Update Seva" : "Book Seva"}
      </button>

    </div>
  )
}