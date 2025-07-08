import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await dbConnect()
    const body = await req.json()
    const { department, clearAll = false } = body

    console.log(`Clearing payment for ticket ${id}${clearAll ? " (all departments)" : ` in department: ${department}`}`)

    // Validate input
    if (!clearAll && !department) {
      return NextResponse.json({ error: "Department is required when not clearing all" }, { status: 400 })
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
    const clearedDepartments = []

    if (clearAll) {
      // Clear all pending departments
      let foundPending = false

      for (let i = 0; i < ticket.departmentHistory.length; i++) {
        const hist = ticket.departmentHistory[i]

        // Skip Reception and already completed departments
        if (hist.department === "Reception" || hist.completed) {
          continue
        }

        // Check if payment needs clearing
        if (hist.cashCleared === null || hist.cashCleared === undefined) {
          ticket.departmentHistory[i].cashCleared = "Cleared"
          ticket.departmentHistory[i].paidAt = now
          clearedDepartments.push(hist.department)
          foundPending = true
        }
      }

      if (!foundPending) {
        return NextResponse.json({ error: "No pending payments found for this ticket" }, { status: 400 })
      }

      await ticket.save()
      console.log(`Payment cleared for ticket ${id} in all departments: ${clearedDepartments.join(", ")}`)

      return NextResponse.json(
        {
          success: true,
          ticket,
          clearedDepartments,
          message: `Payment cleared for ${clearedDepartments.length} department${clearedDepartments.length > 1 ? "s" : ""}`,
        },
        { status: 200 },
      )
    } else {
      // Clear specific department (existing logic)
      const deptIndex = ticket.departmentHistory.findIndex(
        (hist: any) => hist.department === department && !hist.completed,
      )

      if (deptIndex === -1) {
        return NextResponse.json({ error: "Department not found in ticket history" }, { status: 404 })
      }

      // Check if payment is already cleared
      if (ticket.departmentHistory[deptIndex].cashCleared === "Cleared") {
        return NextResponse.json({ error: "Payment already cleared for this department" }, { status: 400 })
      }

      // Clear the payment
      ticket.departmentHistory[deptIndex].cashCleared = "Cleared"
      ticket.departmentHistory[deptIndex].paidAt = now

      await ticket.save()
      console.log(`Payment cleared for ticket ${id} in department ${department}`)

      return NextResponse.json({ success: true, ticket }, { status: 200 })
    }
  } catch (error) {
    console.error("Error clearing payment:", error)
    return NextResponse.json({ error: "Failed to clear payment" }, { status: 500 })
  }
}
