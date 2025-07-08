import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await dbConnect()

    console.log(`Clearing queue payment for ticket ${id}`)

    // Find ticket
    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Verify this is a cash ticket
    if (ticket.userType !== "Cash") {
      return NextResponse.json({ error: "This ticket is not a cash payment ticket" }, { status: 400 })
    }

    // Check if ticket has a department queue
    if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
      return NextResponse.json({ error: "No department queue found for this ticket" }, { status: 400 })
    }

    const now = new Date()
    let clearedCount = 0

    // Clear payment for all departments in the queue that haven't been processed yet
    for (let i = 0; i < ticket.departmentQueue.length; i++) {
      const queueItem = ticket.departmentQueue[i]

      // Only clear payment for unprocessed departments that don't already have clearPayment set
      if (!queueItem.processed && queueItem.clearPayment !== "Cleared") {
        ticket.departmentQueue[i].clearPayment = "Cleared"
        clearedCount++
      }
    }

    if (clearedCount === 0) {
      return NextResponse.json({ error: "No departments found that need payment clearance" }, { status: 400 })
    }

    // Also update any current department in history that's not completed
    if (ticket.departmentHistory && ticket.departmentHistory.length > 0) {
      for (let i = 0; i < ticket.departmentHistory.length; i++) {
        const historyItem = ticket.departmentHistory[i]

        // If this department is not completed and is a cash ticket, clear the payment
        if (
          !historyItem.completed &&
          historyItem.department !== "Reception" &&
          (historyItem.cashCleared === null || historyItem.cashCleared === undefined)
        ) {
          ticket.departmentHistory[i].cashCleared = "Cleared"
          ticket.departmentHistory[i].paidAt = now
        }
      }
    }

    await ticket.save()

    console.log(`Queue payment cleared for ticket ${id}. Cleared ${clearedCount} departments in queue.`)

    return NextResponse.json(
      {
        success: true,
        ticket,
        clearedCount,
        message: `Payment cleared for ${clearedCount} department${clearedCount > 1 ? "s" : ""} in queue`,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error clearing queue payment:", error)
    return NextResponse.json({ error: "Failed to clear queue payment" }, { status: 500 })
  }
}
