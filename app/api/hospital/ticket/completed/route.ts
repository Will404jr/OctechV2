// api/hospital/ticket/completed/route.ts

import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function GET(request: Request) {
  await dbConnect()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") // Get date parameter in YYYY-MM-DD format

  console.log(`GET completed tickets for date: ${date}`)

  // Create a query specifically for completed tickets
  const query: any = {
    completed: true, // Only get completed tickets
  }

  // Add date filter if provided, otherwise default to today
  const filterDate = date || new Date().toISOString().split("T")[0]
  const startOfDay = new Date(filterDate)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(filterDate)
  endOfDay.setHours(23, 59, 59, 999)

  query.createdAt = {
    $gte: startOfDay,
    $lte: endOfDay,
  }

  console.log("Completed tickets query:", JSON.stringify(query, null, 2))

  const tickets = await Ticket.find(query).sort({ completedAt: -1 })
  console.log(`Found ${tickets.length} completed tickets for date: ${filterDate}`)

  // Log the ticket numbers for debugging
  if (tickets.length > 0) {
    console.log("Completed ticket numbers:", tickets.map((t) => t.ticketNo).join(", "))
  }

  return NextResponse.json(tickets)
}
