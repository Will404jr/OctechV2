import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket } from "@/lib/models/hospital"
import { calculateDurationInSeconds } from "@/lib/utils/time-tracking"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    await dbConnect()
    const ticket = await Ticket.findById(id)

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check if the ticket was created today
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Set to beginning of today

    const ticketCreatedAt = new Date(ticket.createdAt)

    // If the ticket was not created today, return 404
    if (ticketCreatedAt < today) {
      return NextResponse.json({ error: "Ticket not created today" }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    await dbConnect()

    const body = await req.json()
    const {
      call,
      patientName,
      userType,
      reasonforVisit,
      receptionistNote,
      noShow,
      held,
      departmentNote,
      emergency,
      currentDepartment,
      roomId,
      startServing, // New field to indicate when staff actually starts serving
    } = body

    console.log(`Updating ticket ${id}:`, body)

    // Find ticket first to check current state
    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    const now = new Date()
    const updateData: any = {}

    // Handle hold/unhold status
    if (held !== undefined && currentDepartment) {
      updateData.held = held
      console.log(`Setting ticket ${id} held status to ${held}`)

      // Find the current department in history
      const deptIndex = ticket.departmentHistory.findIndex(
        (hist: any) => hist.department === currentDepartment && !hist.completed,
      )

      if (deptIndex >= 0) {
        if (held) {
          // Start hold time tracking
          ticket.departmentHistory[deptIndex].holdStartedAt = now
          console.log(`Started hold time tracking for department ${currentDepartment}`)
        } else if (ticket.departmentHistory[deptIndex].holdStartedAt) {
          // Calculate and add hold duration
          const holdDuration = calculateDurationInSeconds(ticket.departmentHistory[deptIndex].holdStartedAt, now)

          const previousHoldDuration = ticket.departmentHistory[deptIndex].holdDuration || 0
          ticket.departmentHistory[deptIndex].holdDuration = previousHoldDuration + holdDuration
          ticket.departmentHistory[deptIndex].holdStartedAt = null

          console.log(`Added ${holdDuration} seconds to hold duration for department ${currentDepartment}`)
        }
      }
    }

    // Handle department note updates
    if (departmentNote && currentDepartment) {
      // Initialize departmentHistory if it doesn't exist
      if (!ticket.departmentHistory) {
        ticket.departmentHistory = []
      }

      // Find if this department is already in history but not completed
      const deptIndex = ticket.departmentHistory.findIndex(
        (hist: any) => hist.department === currentDepartment && !hist.completed,
      )

      if (deptIndex >= 0) {
        // Update existing entry
        ticket.departmentHistory[deptIndex].note = departmentNote
      }
    }

    // FIXED: Handle roomId updates and actual start of serving
    if (roomId && currentDepartment) {
      // Find if this department is already in history but not completed
      const deptIndex = ticket.departmentHistory.findIndex(
        (hist: any) => hist.department === currentDepartment && !hist.completed,
      )

      if (deptIndex >= 0) {
        // Update existing entry with roomId
        ticket.departmentHistory[deptIndex].roomId = roomId

        // FIXED: Only set startedAt if startServing is true or if not already started
        if (startServing && !ticket.departmentHistory[deptIndex].startedAt) {
          ticket.departmentHistory[deptIndex].startedAt = now
          ticket.departmentHistory[deptIndex].actuallyStarted = true
          console.log(`Actually started serving for department ${currentDepartment}`)
        } else if (!ticket.departmentHistory[deptIndex].startedAt && !startServing) {
          // Room assigned but not started serving yet
          console.log(`Room ${roomId} assigned to department ${currentDepartment} but not started serving yet`)
        }
      }
    }

    // Handle other updates
    if (call !== undefined) {
      updateData.call = call
    }

    if (patientName !== undefined) {
      updateData.patientName = patientName
    }

    if (userType !== undefined) {
      updateData.userType = userType
    }

    if (reasonforVisit !== undefined) {
      updateData.reasonforVisit = reasonforVisit
    }

    if (receptionistNote !== undefined) {
      updateData.receptionistNote = receptionistNote
    }

    if (emergency !== undefined) {
      updateData.emergency = emergency
    }

    if (noShow !== undefined) {
      updateData.noShow = noShow

      // If marking as no-show, calculate durations for reporting
      if (noShow) {
        // Calculate total duration from creation to now
        const totalDuration = calculateDurationInSeconds(ticket.createdAt, now)
        updateData.totalDuration = totalDuration
        console.log(`Marking ticket as no-show. Total duration: ${totalDuration} seconds`)
      }
    }

    // Update the ticket
    Object.assign(ticket, updateData)
    await ticket.save()

    console.log(`Ticket ${id} updated successfully`)
    return NextResponse.json(ticket)
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
