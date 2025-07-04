import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    await dbConnect()
    const body = await req.json()
    const { roomId, department } = body

    // Validate input
    if (!roomId || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Find ticket
    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Initialize departmentHistory if it doesn't exist
    if (!ticket.departmentHistory) {
      ticket.departmentHistory = []
    }

    const now = new Date()

    // Find the current department entry in the history
    const deptIndex = ticket.departmentHistory.findIndex(
      (hist: any) => hist.department === department && !hist.completed,
    )

    if (deptIndex >= 0) {
      // Update the existing entry with roomId and ACTUALLY start serving
      ticket.departmentHistory[deptIndex].roomId = roomId

      // FIXED: Only set startedAt when staff actually starts serving
      if (!ticket.departmentHistory[deptIndex].startedAt) {
        ticket.departmentHistory[deptIndex].startedAt = now
        ticket.departmentHistory[deptIndex].actuallyStarted = true
        console.log(`Actually started processing time for department ${department} in ticket ${id}`)
      }

      console.log(`Updated roomId ${roomId} and started serving for department ${department} in ticket ${id}`)
    } else {
      console.log(`Department ${department} not found in ticket history or already completed`)
    }

    await ticket.save()
    console.log(`Room assignment and serving started for ticket ${id}`)

    return NextResponse.json({ success: true, ticket }, { status: 200 })
  } catch (error) {
    console.error("Error assigning room to ticket:", error)
    return NextResponse.json({ error: "Failed to assign room to ticket" }, { status: 500 })
  }
}
