'use client'

import { useState } from 'react'

export default function ChatBot({ onClose }: any) {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const sampleQueries = [
  "total revenue this month",
  "today revenue",
  "top 5 devotees",
  "repeat donors",
  "upi vs cash collection",
  "bookings this month",
  "who donated more than 5000",
  "Next month revenue",
  "Next 3 months revenue",
  "Recurring monthly base",
  "Which donors will expire next month?",
  "Who has not renewed?",
  "Top recurring donors"
]

 const renderResponse = () => {

  console.log("FINAL RESPONSE:", response)
  console.log("RESPONSE TYPE:", response.type)

  if (!response) return null

  if (response.error) {
    return (
      <div className="text-red-500 text-sm">
        ❌ {response.error}
      </div>
    )
  }

  if (typeof response === "string") {
  return (
    <div className="text-sm text-gray-700 whitespace-pre-line">
      {response}
    </div>
  )
}

  // ✅ KPI
  if (response.type === "kpi") {
    return (
      <div className="text-center">
        <div className="text-sm text-gray-500">{response.title}</div>
        <div className="text-xl font-bold text-green-600">
          ₹ {response.value}
        </div>
      </div>
    )
  }

  // text
  if (response.type === "text") {
  return (
    <div className="text-sm text-gray-700">
      {response.message}
    </div>
  )
}

// count type

if (response.type === "count") {
  return (
    <div className="text-center">
      <div className="text-sm text-gray-500">{response.title}</div>
      <div className="text-xl font-bold text-indigo-600">
        {response.value}
      </div>
    </div>
  )
}

  // ✅ BREAKDOWN (KEEP YOUR EXISTING LOGIC)
  if (response.type === "breakdown") {
  return (
    <div>
      <div className="font-semibold mb-2">{response.title}</div>
      <ul className="list-decimal ml-5 text-sm">
        {(response.items || []).map((item: any, i: number) => (
          <li key={i}>
            {(item.name || item.payment_mode || "Unknown")} 
            {" (₹ "}{item.amount ?? item.value ?? 0}{")"}
          </li>
        ))}
      </ul>
    </div>
  )
}

  // ✅ DONOR LIST (NEW)
  if (response.type === "donor_list") {
  return (
    <div>
      <div className="font-semibold mb-2">{response.title}</div>
      <ul className="list-disc ml-5 text-sm">
        {(response.items || []).map((item: any, i: number) => (
          <li key={i}>
            {item?.name || "Unknown"} (₹ {item?.amount ?? 0}/month)
          </li>
        ))}
      </ul>
    </div>
  )
}

  // ✅ SIMPLE LIST (NEW)
  if (response.type === "list") {
  return (
    <div>
      <div className="font-semibold mb-2">{response.title}</div>
      <ul className="list-disc ml-5 text-sm">
        {(response.items || []).map((item: any, i: number) => (
          <li key={i}>
            {typeof item === "string" ? item : item?.name || "Unknown"}
          </li>
        ))}
      </ul>
    </div>
  )
}

  // ⚠️ FALLBACK (for debugging)
  return (
    <div className="text-xs text-red-500">
      ⚠️ Unable to render response
    </div>
  )
}

  const askQuestion = async () => {
    if (!question) return

    setLoading(true)

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    })

    try {
    const text = await res.text()
    const data = text ? JSON.parse(text) : { error: "Empty response" }

    setResponse(data.answer || data)
    } catch (err) {
    console.error(err)
    setResponse({ error: "Failed to parse response" })
    }

    setLoading(false)
   
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">

      <div className="bg-white w-full max-w-lg rounded-xl p-4 space-y-3">

        {/* Header */}
        <div className="flex justify-between">
          <div className="font-bold">💬 Ask Ganesha</div>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Input */}
        <input
          className="w-full border p-2 rounded"
          placeholder="Ask something like 'total revenue this month'"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

                <div className="bg-gray-50 p-2 rounded text-xs">
          <div className="font-semibold mb-1">💡 Try these:</div>

          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                className="bg-white border px-2 py-1 rounded hover:bg-gray-100"
              >
                {q}
              </button>
            ))}
          </div>
        </div>


        {/* Button */}
        <button
          onClick={askQuestion}
          className="bg-indigo-500 text-white px-4 py-2 rounded"
        >
          {loading ? "Thinking..." : "Ask"}
        </button>

        {/* Response */}
       {response && (
            <div className="bg-white p-3 rounded-xl shadow mt-3 max-h-[400px] overflow-y-auto">
                {renderResponse()}
            </div>
        )}

      </div>
    </div>
  )
}