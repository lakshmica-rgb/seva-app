'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const months = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
]

const buildMatrix = (bookings: any[], year: number) => {
  const map: any = {}

  bookings.forEach(b => {
    const name = `${b.devotee_name || 'Unknown'}-${b.house_number || ''}`

    if (!map[name]) {
      map[name] = {
        name,
        months: Array.from({ length: 12 }, () => ({
          value: 0,
          type: ''
        }))
      }
    }

    // 🟢 ONE-TIME
    if (b.donation_type !== 'recurring') {
      const d = new Date(b.date)

      if (d.getFullYear() === year) {
        const m = d.getMonth()

        map[name].months[m].value += Number(b.amount) || 0
        map[name].months[m].type = 'realized'
      }

      return
    }

    // 🔵 RECURRING
    if (
      b.donation_type === 'recurring' &&
      b.donation_start_date &&
      b.monthly_amount
    ) {
      const start = new Date(b.donation_start_date)
      const end = b.donation_end_date
        ? new Date(b.donation_end_date)
        : null

      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1)
      const endMonth = end
        ? new Date(end.getFullYear(), end.getMonth(), 1)
        : null

      const totalPaid = Number(b.amount) || 0
      const monthly = Number(b.monthly_amount) || 0

      const monthsCovered = monthly ? Math.floor(totalPaid / monthly) : 0

      for (let m = 0; m < 12; m++) {
        const currentMonth = new Date(year, m, 1)

        // 👉 CASE 1: FULLY PAID (spread realized across months)
        if (totalPaid > 0 && monthsCovered > 0) {
          const monthIndexFromStart =
            (year - start.getFullYear()) * 12 + (m - start.getMonth())

          if (monthIndexFromStart >= 0 && monthIndexFromStart < monthsCovered) {
            map[name].months[m].value += monthly
            map[name].months[m].type = 'realized'
            continue
          }
        }

        // 👉 CASE 2: NORMAL RECURRING WITH END
        if (endMonth) {
          if (currentMonth >= startMonth && currentMonth <= endMonth) {
            if (map[name].months[m].type !== 'realized') {
              map[name].months[m].value += monthly
              map[name].months[m].type = 'projected'
            }
          }

          // 👉 EXTEND BEYOND END → PROJECTED
          if (currentMonth > endMonth) {
            map[name].months[m].value += monthly
            map[name].months[m].type = 'projected'
          }
        } else {
          // 👉 NO END DATE → CONTINUOUS
          if (currentMonth >= startMonth) {
            map[name].months[m].value += monthly

            if (map[name].months[m].type !== 'realized') {
              map[name].months[m].type = 'projected'
            }
          }
        }
      }
    }
  })

  // 🔴 MISSED
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  Object.values(map).forEach((row: any) => {
    row.months = row.months.map((cell: any, idx: number) => {
      const monthDate = new Date(year, idx, 1)

      if (
        cell.type === 'projected' &&
        monthDate < currentMonthStart
      ) {
        return { ...cell, type: 'missed' }
      }

      return cell
    })

    row.total = row.months.reduce(
      (s: number, m: any) => s + (Number(m.value) || 0),
      0
    )
  })

  return Object.values(map)
}


export default function ProjectionPage() {
  const [data, setData] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [colTotals, setColTotals] = useState<number[]>([])

  const [kpis, setKpis] = useState({
  realized: 0,
  projected: 0
})


  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
  const { data } = await supabase
    .from('seva_bookings')
    .select('*')

  const matrix = buildMatrix(data || [], year)

  const totals = Array(12).fill(0)

  let realized = 0
  let projected = 0

  matrix.forEach((row: any) => {
    row.months.forEach((m: any, i: number) => {
      const val = Number(m.value) || 0

      totals[i] += val

      if (m.type === 'realized') {
        realized += val
      } else if (m.type === 'projected') {
        projected += val
      }
    })
  })

  setColTotals(totals)
  setData(matrix)
  setKpis({ realized, projected })
}

  const downloadCSV = () => {
    const header = ['Devotee', ...months, 'Total']

    const rows = data.map(r => [
      r.name,
      ...r.months.map((m: any) => m.value || ''),
      r.total
    ])

    const csv = [header, ...rows]
      .map(r => r.map(val => `"${val}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `projection_${year}.csv`
    a.click()
  }

  const grandTotal = colTotals.reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 space-y-4 bg-gray-100 min-h-screen text-gray-900">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-xl font-bold text-gray-900">
            📊 Monthly Donation Projection
          </div>
          <div className="text-sm text-gray-600">
            Realized vs Expected Donations
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border px-3 py-1 rounded-lg w-24 text-black"
          />

          <button
            onClick={downloadCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow"
          >
            ⬇️ CSV
          </button>
        </div>
      </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  {/* REALIZED */}
  <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
    <div className="text-sm text-green-700 font-medium">
      Total Realized ({year})
    </div>
    <div className="text-2xl font-bold text-green-800">
      ₹ {kpis.realized.toLocaleString()}
    </div>
  </div>

  {/* PROJECTED */}
  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
    <div className="text-sm text-orange-700 font-medium">
      Total Projected ({year})
    </div>
    <div className="text-2xl font-bold text-orange-800">
      ₹ {kpis.projected.toLocaleString()}
    </div>
  </div>

</div>


      {/* LEGEND */}
      <div className="flex gap-6 text-sm font-medium">
        <div className="flex items-center gap-2 text-green-700">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          Realized
        </div>
        <div className="flex items-center gap-2 text-orange-700">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          Projected
        </div>
        <div className="flex items-center gap-2 text-red-700">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          Missed
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto rounded-2xl shadow bg-white">
        <table className="min-w-full text-sm">

          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-800">
                Devotee
              </th>
              {months.map(m => (
                <th key={m} className="p-3 text-gray-700 font-medium">
                  {m}
                </th>
              ))}
              <th className="p-3 text-gray-800 font-semibold">
                Total
              </th>
            </tr>
          </thead>

          <tbody>

            {[...data]
              .sort((a, b) =>
                (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
              )
              .map((row, i) => (
              <tr key={i} className="border-t hover:bg-gray-50">

                <td className="p-3 font-medium text-gray-900 whitespace-nowrap">
                  {row.name}
                </td>

                {row.months.map((cell: any, idx: number) => (
                  <td
                    key={idx}
                    className={`p-2 text-center ${
                      cell.type === 'realized'
                        ? 'bg-green-100 text-green-800 font-semibold'
                        : cell.type === 'projected'
                        ? 'bg-orange-100 text-orange-800'
                        : cell.type === 'missed'
                        ? 'bg-red-100 text-red-800 font-semibold'
                        : 'text-gray-400'
                    }`}
                  >
                    {cell.value ? `₹${cell.value}` : '-'}
                  </td>
                ))}

                <td className="p-2 text-center font-bold text-blue-700">
                  ₹{row.total}
                </td>

              </tr>
            ))}
          </tbody>

          <tfoot className="bg-gray-200 font-semibold">
            <tr>
              <td className="p-3 text-gray-800">Total</td>
              {colTotals.map((t, i) => (
                <td key={i} className="p-2 text-center text-gray-800">
                  ₹{t}
                </td>
              ))}
              <td className="p-2 text-center text-green-800 font-bold">
                ₹{grandTotal}
              </td>
            </tr>
          </tfoot>

        </table>
      </div>
    </div>
  )
}