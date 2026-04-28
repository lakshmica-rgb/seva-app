import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 🔐 Create Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // IMPORTANT
)

export async function POST(req: Request) {
try {
  const { question } = await req.json()

  // 🧠 Ask AI → convert to SQL
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are a data assistant.

Table: seva_bookings

Columns:
date, seva_name, devotee_name, phone, amount, payment_mode, payment_reference, status

Return ONLY JSON like:

{ "intent": "..." }

Supported intents:
- total_revenue_month
- total_revenue_year
- count_bookings
- revenue_by_seva
- revenue_by_payment_mode
- today_revenue
- bookings_this_month
- top_devotees
- donor_history
- high_value_donors
- repeat_donors
- top_devotees_month

Examples:
User: "show Lakshmi history"
Output: { "intent": "donor_history", "name": "Lakshmi" }

User: "who donated more than 5000"
Output: { "intent": "high_value_donors", "amount": 5000 }

User: "repeat donors"
Output: { "intent": "repeat_donors" }

No explanation.
`

      },
      {
        role: "user",
        content: question
      }
    ]
  })

 // console.log("OPENAI RAW:", completion)
//  console.log("AI CONTENT:", completion.choices[0].message.content)

// const sql = completion.choices[0]?.message?.content?.trim()

const raw = completion.choices[0]?.message?.content || ''

let intentObj: any = {}

try {
  intentObj = JSON.parse(raw)
} catch {
  return NextResponse.json({ error: "Invalid AI response" })
}

let result: any = null

const today = new Date()
const currentMonth = today.toISOString().slice(0, 7)
const currentYear = today.getFullYear()

if (intentObj.intent === "total_revenue_month") {


  const { data, error } = await supabase
  .from('seva_bookings')
  .select('*')

//console.log("SUPABASE ERROR:", error)
//console.log("DATA LENGTH:", data?.length)
// console.log("FULL DATA SAMPLE:", data?.slice(0, 3))


const today = new Date()
const currentMonth = today.getMonth()
const currentYear = today.getFullYear()

const filtered = data?.filter(b => {
  if (!b.date) return false

  const d = new Date(b.date)

  return (
    d.getMonth() === currentMonth &&
    d.getFullYear() === currentYear
  )
}) || []

const total = filtered.reduce((s, b) => s + (b.amount || 0), 0)

result = {
  type: "kpi",
  title: "Total Revenue (This Month)",
  value: total
}

}

else if (intentObj.intent === "total_revenue_year") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('amount, date')

  const filtered = data?.filter(b =>
    new Date(b.date).getFullYear() === currentYear
  ) || []


  
  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0)

  result = `Total revenue this year: ₹ ${total}`
}

else if (intentObj.intent === "count_bookings") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('id')

  result = `Total bookings: ${data?.length || 0}`
}

else if (intentObj.intent === "today_revenue") {
  const todayStr = new Date().toISOString().slice(0, 10)

  const { data } = await supabase
    .from('seva_bookings')
    .select('amount')
    .eq('date', todayStr)

  const total = data?.reduce((s, b) => s + (b.amount || 0), 0)

  result = `Today's revenue: ₹ ${total}`
}

else if (intentObj.intent === "bookings_this_month") {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const { data } = await supabase
    .from('seva_bookings')
    .select('id, date')
    .gte('date', start.toISOString().slice(0, 10))
    .lt('date', end.toISOString().slice(0, 10))

  result = `Bookings this month: ${data?.length || 0}`
}

else if (intentObj.intent === "revenue_by_payment_mode") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('amount, payment_mode')

  const map: any = {}

  data?.forEach(b => {
    const mode = b.payment_mode || 'Unknown'
    map[mode] = (map[mode] || 0) + (b.amount || 0)
  })

  result = Object.entries(map)
    .map(([k, v]) => `${k}: ₹ ${v}`)
    .join('\n')
}

else if (intentObj.intent === "revenue_by_seva") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('amount, seva_name')

  const map: any = {}

  data?.forEach(b => {
    const seva = b.seva_name || 'Unknown'
    map[seva] = (map[seva] || 0) + (b.amount || 0)
  })

  const sorted = Object.entries(map)
    .sort((a: any, b: any) => b[1] - a[1])

  const top = sorted[0]

  result = `Top Seva: ${top?.[0]} (₹ ${top?.[1]})`
}

else if (intentObj.intent === "revenue_by_date") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('amount, date')

  const map: any = {}

  data?.forEach(b => {
    const date = b.date
    map[date] = (map[date] || 0) + (b.amount || 0)
  })

  result = Object.entries(map)
    .map(([d, v]) => `${d}: ₹ ${v}`)
    .join('\n')
}

else if (intentObj.intent === "top_devotees") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('amount, devotee_name')

  const map: any = {}

  data?.forEach(b => {
    const name = b.devotee_name || 'Unknown'
    map[name] = (map[name] || 0) + (b.amount || 0)
  })

  const sorted = Object.entries(map)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)

    result = {
      type: "list",
      title: "Top Devotees",
      items: sorted.map(([name, amt], i) => ({
        rank: i + 1,
        name,
        amount: amt
      }))
}
 
}

else if (intentObj.intent === "donor_history") {
  const name = intentObj.name?.toLowerCase()

  const { data } = await supabase
    .from('seva_bookings')
    .select('*')

  const filtered = data?.filter(b =>
    b.devotee_name?.toLowerCase().includes(name)
  ) || []

  result = filtered.length
    ? filtered.map(b =>
        `${b.date} - ${b.seva_name} - ₹ ${b.amount}`
      ).join('\n')
    : "No records found"
}

else if (intentObj.intent === "high_value_donors") {
  const threshold = intentObj.amount || 5000

  const { data } = await supabase
    .from('seva_bookings')
    .select('devotee_name, amount')

  const map: any = {}

  data?.forEach(b => {
    const name = (b.devotee_name || '').trim()
    if (!name) return

    map[name] = (map[name] || 0) + (b.amount || 0)
  })

  const filtered = Object.entries(map)
    .filter(([, amt]: any) => amt >= threshold)
    .sort((a: any, b: any) => b[1] - a[1])

  result = {
    type: "list",
    title: `Donors above ₹ ${threshold}`,
    items: filtered.map(([name, amount], i) => ({
      rank: i + 1,
      name,
      amount
    }))
  }
}

else if (intentObj.intent === "repeat_donors") {
  const { data } = await supabase
    .from('seva_bookings')
    .select('devotee_name')

  const count: any = {}

  data?.forEach(b => {
    const name = (b.devotee_name || '').trim()
    if (!name) return

    count[name] = (count[name] || 0) + 1
  })

  const repeat = Object.entries(count)
    .filter(([, c]: any) => c > 1)
    .sort((a: any, b: any) => b[1] - a[1])

  result = {
    type: "list",
    title: "Repeat Donors",
    items: repeat.map(([name, count], i) => ({
      rank: i + 1,
      name,
      count
    }))
  }
}

else if (intentObj.intent === "top_devotees_month") {
  const today = new Date()
  const month = today.getMonth()
  const year = today.getFullYear()

  const { data } = await supabase
    .from('seva_bookings')
    .select('devotee_name, amount, date')

  const filtered = data?.filter(b => {
    const d = new Date(b.date)
    return d.getMonth() === month && d.getFullYear() === year
  }) || []

  const map: any = {}

  filtered.forEach(b => {
    const name = b.devotee_name || 'Unknown'
    map[name] = (map[name] || 0) + (b.amount || 0)
  })

  const sorted = Object.entries(map)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)

  result = sorted.map(([n, a], i) =>
    `${i + 1}. ${n} - ₹ ${a}`
  ).join('\n')
}

else 
  {
  result = "Sorry, I don’t understand that yet."
}

return NextResponse.json({
  answer: result
})

} catch (err: any) {
  console.error("CHAT API ERROR:", err)

  return NextResponse.json({
    error: err.message || "Something went wrong"
  }, { status: 500 })
}

}
