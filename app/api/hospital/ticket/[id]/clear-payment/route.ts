import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    await dbConnect()
    const body = await req.json()
    const { department } = body

    console.log(`Clearing payment for ticket ${id} in department: ${department}`)

    // Validate input
    if (!department) {
      return NextResponse.json({ error: "Department is required" }, { status: 400 })
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

    // Find the department history entry that needs payment clearance
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
  } catch (error) {
    console.error("Error clearing payment:", error)
    return NextResponse.json({ error: "Failed to clear payment" }, { status: 500 })
  }
}
