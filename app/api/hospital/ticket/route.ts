import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import { Ticket, Department } from "@/lib/models/hospital"

async function generateTicketNumber() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const latestTicket = await Ticket.findOne({
    createdAt: { $gte: today },
  }).sort({ createdAt: -1 })

  let prefix = "A"
  let number = 1

  if (latestTicket) {
    prefix = latestTicket.ticketNo[0]
    number = Number.parseInt(latestTicket.ticketNo.slice(1)) + 1

    if (number > 99) {
      prefix = String.fromCharCode(prefix.charCodeAt(0) + 1)
      number = 1
    }
  }

  return `${prefix}${number.toString().padStart(2, "0")}`
}

export async function POST() {
  try {
    await dbConnect()

    const ticketNo = await generateTicketNumber()

    // Get Reception department icon
    const receptionDept = await Department.findOne({ title: "Reception" })
    const receptionIcon = receptionDept ? receptionDept.icon : "👋"

    const newTicket = new Ticket({
      ticketNo,
      departmentHistory: [
        {
          department: "Reception",
          icon: receptionIcon,
          timestamp: new Date(),
          note: "",
          completed: false,
          actuallyStarted: false, // New field
          // roomId will be assigned when the ticket is picked up by a receptionist
        },
      ],
      completed: false,
      noShow: false,
      call: false,
      held: false,
    })

    await newTicket.save()

    return NextResponse.json(
      { ticketNo: newTicket.ticketNo },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json(
      { error: "Failed to create ticket" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    )
  }
}

export async function GET(request: Request) {
  await dbConnect()

  const { searchParams } = new URL(request.url)
  const department = searchParams.get("department")
  const unassigned = searchParams.get("unassigned") === "true"
  const held = searchParams.get("held") === "true"
  const roomId = searchParams.get("roomId")
  const date = searchParams.get("date") // Get date parameter in YYYY-MM-DD format

  console.log(
    `GET tickets for department: ${department}, unassigned: ${unassigned}, held: ${held}, roomId: ${roomId}, date: ${date}`,
  )

  const query: any = { noShow: false, completed: false }

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

  if (held && department) {
    // For held tickets in a specific department
    query.$and = [
      {
        departmentHistory: {
          $elemMatch: {
            department: department,
            completed: false,
          },
        },
      },
      { held: true },
    ]
  } else if (unassigned) {
    // For reception - tickets that haven't been assigned to any department yet or
    // tickets that have Reception in departmentHistory but not completed
    query.$or = [
      { departmentHistory: { $size: 0 } },
      {
        departmentHistory: {
          $elemMatch: {
            department: "Reception",
            completed: false,
          },
        },
      },
    ]
    query.held = held === true
  } else if (department) {
    // IMPROVED: For specific departments - find tickets that need to be processed by this department
    // A ticket is available for a department if:
    // 1. The department exists in departmentHistory
    // 2. The completed field for that department is false
    // 3. The ticket is not held (unless we're specifically looking for held tickets)
    // 4. For cash tickets: payment must be cleared (except Reception)

    const departmentMatch = {
      department: department,
      completed: false,
    }

    query.$and = [
      {
        departmentHistory: {
          $elemMatch: departmentMatch,
        },
      },
    ]

    // Only get non-held tickets for normal queue
    if (!held) {
      query.$and.push({ held: false })
    }

    // Filter out cash tickets that haven't been cleared for payment
    // (except for Reception department which handles initial intake)
    if (department !== "Reception") {
      query.$and.push({
        $or: [
          { userType: { $ne: "Cash" } }, // Non-cash tickets
          {
            departmentHistory: {
              $elemMatch: {
                department: department,
                completed: false,
                cashCleared: "Cleared",
              },
            },
          }, // Cash tickets with cleared payment
        ],
      })
    }
  }

  console.log("Query:", JSON.stringify(query, null, 2))

  const tickets = await Ticket.find(query).sort({ createdAt: 1 })
  console.log(`Found ${tickets.length} tickets for department: ${department}, held: ${held}, date: ${filterDate}`)

  // Sort tickets: Emergency first, then cash tickets by payment time, then by creation time
  if (tickets.length > 0) {
    tickets.sort((a, b) => {
      // Emergency tickets always get priority
      if (a.emergency && !b.emergency) return -1
      if (!a.emergency && b.emergency) return 1

      // If both are cash tickets with cleared payments, sort by payment time
      if (a.userType === "Cash" && b.userType === "Cash") {
        const aDeptHistory = a.departmentHistory?.find((h: { department: string | null; completed: any }) => h.department === department && !h.completed)
        const bDeptHistory = b.departmentHistory?.find((h: { department: string | null; completed: any }) => h.department === department && !h.completed)

        if (aDeptHistory?.paidAt && bDeptHistory?.paidAt) {
          return new Date(aDeptHistory.paidAt).getTime() - new Date(bDeptHistory.paidAt).getTime()
        }
      }

      // Default sort by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    console.log("Ticket numbers after sorting:", tickets.map((t) => t.ticketNo).join(", "))
  }

  return NextResponse.json(tickets)
}
