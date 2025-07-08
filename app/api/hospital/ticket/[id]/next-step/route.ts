import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket, Department } from "@/lib/models/hospital"
import { calculateDurationInSeconds } from "@/lib/utils/time-tracking"

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await dbConnect()

    const body = await req.json()
    const {
      departmentId,
      departments, // New: array of departments for multi-department routing
      roomId,
      userType,
      patientName,
      reasonForVisit,
      receptionistNote,
      departmentNote,
      currentDepartment,
      cashCleared, // Add this field to handle explicit cash clearing
    } = body

    console.log(`Processing next step for ticket ${id} from ${currentDepartment}`)

    // Find ticket
    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Handle multi-department routing
    if (departments && Array.isArray(departments) && departments.length > 0) {
      console.log(`Setting up multi-department queue for ticket ${id}:`, departments)

      // Fetch department details for the queue
      const departmentQueue = []
      for (let i = 0; i < departments.length; i++) {
        const dept = await Department.findById(departments[i].departmentId)
        if (!dept) {
          return NextResponse.json({ error: `Department not found: ${departments[i].departmentId}` }, { status: 404 })
        }

        departmentQueue.push({
          departmentId: departments[i].departmentId,
          departmentName: dept.title,
          roomId: departments[i].roomId || null,
          processed: false,
          order: i,
          clearPayment: null, // Initialize as null
        })
      }

      // Set the department queue
      ticket.departmentQueue = departmentQueue
      ticket.currentQueueIndex = 0

      // Process the first department in the queue
      const firstDept = departmentQueue[0]
      const firstDepartment = await Department.findById(firstDept.departmentId)

      return await processNextDepartment(ticket, firstDepartment, firstDept.roomId, {
        userType,
        patientName,
        reasonForVisit,
        receptionistNote,
        departmentNote,
        currentDepartment,
        cashCleared, // Pass the cashCleared field
      })
    }

    // Handle single department routing (existing logic)
    if (!departmentId) {
      return NextResponse.json({ error: "Missing department ID" }, { status: 400 })
    }

    const department = await Department.findById(departmentId)
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    return await processNextDepartment(ticket, department, roomId, {
      userType,
      patientName,
      reasonForVisit,
      receptionistNote,
      departmentNote,
      currentDepartment,
      cashCleared, // Pass the cashCleared field
    })
  } catch (error) {
    console.error("Error assigning next step:", error)
    return NextResponse.json({ error: "Failed to assign next step" }, { status: 500 })
  }
}

async function processNextDepartment(ticket: any, department: any, roomId: string | null, ticketData: any) {
  const {
    userType,
    patientName,
    reasonForVisit,
    receptionistNote,
    departmentNote,
    currentDepartment,
    cashCleared, // Add this parameter
  } = ticketData

  console.log(`Processing department: ${department.title}`)

  // Find current department to get its icon
  const currentDepartmentData = await Department.findOne({
    title: currentDepartment,
  })
  const currentDepartmentIcon = currentDepartmentData ? currentDepartmentData.icon : ""

  // Initialize departmentHistory if it doesn't exist
  if (!ticket.departmentHistory) {
    ticket.departmentHistory = []
  }

  const now = new Date()

  // Check if current department is already in history but not completed
  const currentDeptIndex = ticket.departmentHistory.findIndex(
    (hist: any) => hist.department === currentDepartment && !hist.completed,
  )

  if (currentDeptIndex >= 0) {
    // Update the existing entry
    ticket.departmentHistory[currentDeptIndex].note = departmentNote || ""
    ticket.departmentHistory[currentDeptIndex].completed = true
    ticket.departmentHistory[currentDeptIndex].completedAt = now

    // Calculate processing duration if startedAt exists
    if (ticket.departmentHistory[currentDeptIndex].startedAt) {
      const processingDuration = calculateDurationInSeconds(ticket.departmentHistory[currentDeptIndex].startedAt, now)
      const holdDuration = ticket.departmentHistory[currentDeptIndex].holdDuration || 0
      ticket.departmentHistory[currentDeptIndex].processingDuration = processingDuration - holdDuration
    }

    // Add the roomId of the current user to the history if not already set
    if (roomId && !ticket.departmentHistory[currentDeptIndex].roomId) {
      ticket.departmentHistory[currentDeptIndex].roomId = roomId
    }
  } else {
    // Add current department to history with completed status
    ticket.departmentHistory.push({
      department: currentDepartment,
      icon: currentDepartmentIcon,
      timestamp: now,
      startedAt: now,
      completedAt: now,
      processingDuration: 0,
      note: departmentNote || "",
      completed: true,
      roomId: roomId,
      holdDuration: 0,
    })
  }

  // Check if this department is in the queue and get its clearPayment status
  let queueClearPaymentStatus = null
  if (ticket.departmentQueue && ticket.departmentQueue.length > 0) {
    const queueItem = ticket.departmentQueue.find((item: any) => item.departmentName === department.title)
    if (queueItem) {
      queueClearPaymentStatus = queueItem.clearPayment
    }
  }

  // Determine cashCleared status for the new department entry
  let newCashCleared = undefined
  let newPaidAt = undefined

  if (cashCleared === "Cleared") {
    // Explicitly setting cashCleared to "Cleared" (e.g., when returning a Cash ticket)
    newCashCleared = "Cleared"
    newPaidAt = now
  } else if (queueClearPaymentStatus === "Cleared") {
    // Queue-based clearing
    newCashCleared = "Cleared"
    newPaidAt = now
  } else if (userType === "Cash") {
    // Cash ticket but not cleared
    newCashCleared = null
    newPaidAt = null
  }

  // Add next department to history
  const nextDeptEntry = {
    department: department.title,
    icon: department.icon,
    timestamp: now,
    startedAt: null,
    completedAt: null,
    processingDuration: 0,
    note: "",
    completed: false,
    holdDuration: 0,
    actuallyStarted: false,
    cashCleared: newCashCleared,
    paidAt: newPaidAt,
    roomId: roomId || null,
  }

  ticket.departmentHistory.push(nextDeptEntry)

  // Update ticket with user type and reason for visit if provided
  if (userType) ticket.userType = userType
  if (patientName) ticket.patientName = patientName
  if (reasonForVisit) ticket.reasonforVisit = reasonForVisit
  if (receptionistNote) ticket.receptionistNote = receptionistNote

  // Reset call flag
  ticket.call = false

  // Reset held flag if it was held
  if (ticket.held) {
    ticket.held = false
  }

  await ticket.save()

  console.log(`Ticket ${ticket._id} successfully moved to ${department.title}`)
  console.log(`Cash cleared status: ${newCashCleared}`)

  return NextResponse.json({ success: true, ticket }, { status: 200 })
}

// New endpoint to handle automatic queue progression
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  try {
    await dbConnect()

    const body = await req.json()
    const { currentDepartment, departmentNote } = body

    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Check if ticket has a department queue
    if (!ticket.departmentQueue || ticket.departmentQueue.length === 0) {
      return NextResponse.json({ error: "No department queue found" }, { status: 400 })
    }

    // Mark current department as processed
    if (ticket.currentQueueIndex < ticket.departmentQueue.length) {
      ticket.departmentQueue[ticket.currentQueueIndex].processed = true
    }

    // Move to next department in queue
    ticket.currentQueueIndex += 1

    // Check if there are more departments in the queue
    if (ticket.currentQueueIndex < ticket.departmentQueue.length) {
      const nextDept = ticket.departmentQueue[ticket.currentQueueIndex]
      const department = await Department.findById(nextDept.departmentId)

      if (!department) {
        return NextResponse.json({ error: "Next department not found" }, { status: 404 })
      }

      return await processNextDepartment(ticket, department, nextDept.roomId, {
        departmentNote,
        currentDepartment,
      })
    } else {
      // Queue is complete - this would be handled by the clear ticket endpoint
      return NextResponse.json(
        {
          success: true,
          message: "Department queue completed",
          ticket,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error("Error processing queue:", error)
    return NextResponse.json({ error: "Failed to process queue" }, { status: 500 })
  }
}
