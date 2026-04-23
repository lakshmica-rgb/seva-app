import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'

export async function POST(req: Request) {
  const data = await req.json()

  const doc = new jsPDF()


  const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

  const receiptNo = Math.floor(100000 + Math.random() * 900000)

  const today = formatDate(new Date().toISOString().split('T')[0])

  let y = 20

  // 🛕 Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text("Purva Panorama Temple Donation Receipt", 105, y, { align: "center" })

  y += 8

  // Trust Name
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text("Siddhi Vinayaka Prasanna Anjeneya Temple Trust", 105, y, { align: "center" })

  y += 6
  doc.text("(to be registered)", 105, y, { align: "center" })

  y += 6
  doc.text("Purva Panorama Apartments, Bannerghatta Road,", 105, y, { align: "center" })
  y += 5
  doc.text("Bangalore - 560076", 105, y, { align: "center" })

  y += 5
  doc.text("PAN: To be obtained", 105, y, { align: "center" })

  // Divider
  y += 6
  doc.line(10, y, 200, y)

  // Receipt + Date
  y += 10
  doc.setFontSize(11)
  doc.text(`Receipt No: ${receiptNo}`, 10, y)
  doc.text(`Date: ${today}`, 150, y)

  // Received line
  y += 10
  doc.setFont('helvetica', 'italic')
  doc.text("Received with thanks", 10, y)

  doc.setFont('helvetica', 'normal')

  // Details
  y += 10
  doc.text(`Name: ${data.devotee_name || '-'}`, 10, y)

  y += 8

  doc.text(`Seva Date: ${formatDate(data.date)}`, 10, y)

  y += 8
  doc.text(`Seva: ${data.seva_name}`, 10, y)

  y += 8
  doc.text(`Mobile Number: ${data.phone || '-'}`, 10, y)

  y += 10

  // Amount (highlighted)
  doc.setFont('helvetica', 'bold')
  doc.text(`Amount Rupees ${data.amount} only`, 10, y)
  doc.setFont('helvetica', 'normal')

  y += 8
  doc.text(`Payment Mode: ${data.payment_mode || '-'}`, 10, y)

  // Sankalpa (optional addition)

  // Signature
  y += 25
  doc.text("Signed on behalf of", 10, y)

  y += 6
  doc.text("Siddhi Vinayaka Prasanna Anjeneya Temple Trust", 10, y)

  // Output
  const pdf = doc.output('arraybuffer')

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=receipt.pdf',
    },
  })
}