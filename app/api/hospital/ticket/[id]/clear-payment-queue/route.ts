import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    await dbConnect()
    const body = await req.json()
    const { departments } = body

    console.log(`Clearing payment for ticket ${id} for departments:`, departments)

    // Validate input
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return NextResponse.json({ error: "Departments array is required" }, { status: 400 })
    }

    // Find ticket
    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Verify this is a cash ticket
    if (ticket.userType !== "Cash") {
      return NextResponse.json({ error: "This ticket is not a cash payment ticket" }, { status: 400 })
    }

    // Initialize departmentHistory if it doesn't exist
    if (!ticket.departmentHistory) {
      ticket.departmentHistory = []
    }

    const now = new Date()
    let clearedCount = 0

    // Clear payment for all specified departments
    for (const departmentName of departments) {
      const deptIndex = ticket.departmentHistory.findIndex(
        (hist: any) => hist.department === departmentName && !hist.completed,
      )

      if (deptIndex !== -1) {
        // Check if payment is not already cleared
        if (ticket.departmentHistory[deptIndex].cashCleared !== "Cleared") {
          ticket.departmentHistory[deptIndex].cashCleared = "Cleared"
          ticket.departmentHistory[deptIndex].paidAt = now
          clearedCount++
          console.log(`Payment cleared for ticket ${id} in department ${departmentName}`)
        }
      } else {
        // If department history doesn't exist yet, create it with payment cleared
        // This handles the case where departments are queued but not yet in history
        const departmentHistory = {
          department: departmentName,
          icon: "", // Will be updated when the ticket actually reaches this department
          timestamp: now,
          startedAt: null,
          completedAt: null,
          processingDuration: 0,
          waitingDuration: 0,
          note: "",
          completed: false,
          holdDuration: 0,
          actuallyStarted: false,
          cashCleared: "Cleared",
          paidAt: now,
        }

        ticket.departmentHistory.push(departmentHistory)
        clearedCount++
        console.log(`Pre-cleared payment for ticket ${id} in queued department ${departmentName}`)
      }
    }

    await ticket.save()

    console.log(`Payment cleared for ticket ${id} in ${clearedCount} departments`)
    return NextResponse.json(
      {
        success: true,
        ticket,
        clearedCount,
        message: `Payment cleared for ${clearedCount} departments`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error clearing payment for queue:", error)
    return NextResponse.json({ error: "Failed to clear payment for queue" }, { status: 500 })
  }
}
