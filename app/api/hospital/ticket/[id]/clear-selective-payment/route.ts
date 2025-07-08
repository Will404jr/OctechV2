import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await dbConnect()
    const body = await req.json()
    const { selectedDepartments } = body

    console.log(`Clearing selective payment for ticket ${id}`, selectedDepartments)

    // Validate input
    if (!selectedDepartments || !Array.isArray(selectedDepartments) || selectedDepartments.length === 0) {
      return NextResponse.json({ error: "Selected departments are required" }, { status: 400 })
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

    const now = new Date()
    const clearedDepartments = []

    // Clear payment for selected departments in the queue
    if (ticket.departmentQueue && ticket.departmentQueue.length > 0) {
      for (let i = 0; i < ticket.departmentQueue.length; i++) {
        const queueItem = ticket.departmentQueue[i]

        // Check if this department is in the selected list and needs clearing
        if (
          selectedDepartments.includes(queueItem.departmentName) &&
          !queueItem.processed &&
          queueItem.clearPayment !== "Cleared"
        ) {
          ticket.departmentQueue[i].clearPayment = "Cleared"
          clearedDepartments.push(queueItem.departmentName)
        }
      }
    }

    // Also clear selected departments in history that are not completed
    if (ticket.departmentHistory && ticket.departmentHistory.length > 0) {
      for (let i = 0; i < ticket.departmentHistory.length; i++) {
        const historyItem = ticket.departmentHistory[i]

        // Check if this department is in the selected list and needs clearing
        if (
          selectedDepartments.includes(historyItem.department) &&
          !historyItem.completed &&
          historyItem.department !== "Reception" &&
          (historyItem.cashCleared === null || historyItem.cashCleared === undefined)
        ) {
          ticket.departmentHistory[i].cashCleared = "Cleared"
          ticket.departmentHistory[i].paidAt = now
          if (!clearedDepartments.includes(historyItem.department)) {
            clearedDepartments.push(historyItem.department)
          }
        }
      }
    }

    if (clearedDepartments.length === 0) {
      return NextResponse.json({ error: "No departments found that need payment clearance" }, { status: 400 })
    }

    await ticket.save()

    console.log(`Selective payment cleared for ticket ${id}. Cleared departments: ${clearedDepartments.join(", ")}`)

    return NextResponse.json(
      {
        success: true,
        ticket,
        clearedDepartments,
        message: `Payment cleared for ${clearedDepartments.length} selected department${clearedDepartments.length > 1 ? "s" : ""}`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error clearing selective payment:", error)
    return NextResponse.json({ error: "Failed to clear selective payment" }, { status: 500 })
  }
}
