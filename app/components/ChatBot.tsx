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
  "who donated more than 5000"
]

  const renderResponse = () => {
  if (!response?.answer) return null

  const a = response.answer

  

  // KPI
  if (a.type === "kpi") {
    return (
      <div className="bg-green-50 p-4 rounded-xl text-center">
        <div className="text-sm text-gray-500">{a.title}</div>
        <div className="text-2xl font-bold text-green-700">
          ₹ {a.value}
        </div>
      </div>
    )
  }

  // LIST
  if (a.type === "list") {
    return (
      <div>
        <div className="font-semibold mb-2">{a.title}</div>
        <div className="space-y-2">
          {a.items.map((item: any) => (
            <div
              key={item.rank}
              className="flex justify-between bg-gray-50 p-2 rounded"
            >
              <div>
                {item.rank}. {item.name}
              </div>
              <div className="text-green-600 font-medium">
                  {item.amount
                      ? `₹ ${item.amount}`
                      : `${item.count} times`}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // BREAKDOWN
  if (a.type === "breakdown") {
    return (
      <div>
        <div className="font-semibold mb-2">{a.title}</div>
        {a.items.map((item: any, i: number) => (
          <div
            key={i}
            className="flex justify-between bg-gray-50 p-2 rounded mb-1"
          >
            <span>{item.label}</span>
            <span className="text-blue-600">₹ {item.value}</span>
          </div>
        ))}
      </div>
    )
  }




  return <div>{JSON.stringify(a)}</div>
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

    setResponse(data)
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