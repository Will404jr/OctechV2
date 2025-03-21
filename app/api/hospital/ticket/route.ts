import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket, Department } from "@/lib/models/hospital";

async function generateTicketNumber() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const latestTicket = await Ticket.findOne({
    createdAt: { $gte: today },
  }).sort({ createdAt: -1 });

  let prefix = "A";
  let number = 1;

  if (latestTicket) {
    prefix = latestTicket.ticketNo[0];
    number = Number.parseInt(latestTicket.ticketNo.slice(1)) + 1;

    if (number > 99) {
      prefix = String.fromCharCode(prefix.charCodeAt(0) + 1);
      number = 1;
    }
  }

  return `${prefix}${number.toString().padStart(2, "0")}`;
}

export async function POST() {
  try {
    await dbConnect();

    const ticketNo = await generateTicketNumber();

    // Get Reception department icon
    const receptionDept = await Department.findOne({ title: "Reception" });
    const receptionIcon = receptionDept ? receptionDept.icon : "👋";

    const newTicket = new Ticket({
      ticketNo,
      departmentHistory: [
        {
          department: "Reception",
          icon: receptionIcon,
          timestamp: new Date(),
          note: "",
          completed: false,
          // roomId will be assigned when the ticket is picked up by a receptionist
        },
      ],
      completed: false,
      noShow: false,
      call: false,
      held: false,
    });

    await newTicket.save();

    return NextResponse.json(
      { ticketNo: newTicket.ticketNo },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

// Update the GET function to properly handle tickets without specific room assignments
export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department");
  const unassigned = searchParams.get("unassigned") === "true";
  const held = searchParams.get("held") === "true";
  const roomId = searchParams.get("roomId");

  console.log(
    `GET tickets for department: ${department}, unassigned: ${unassigned}, held: ${held}, roomId: ${roomId}`
  );

  const query: any = { noShow: false, completed: false };

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
    ];
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
    ];
    query.held = held === true;
  } else if (department) {
    // For specific departments - find tickets that need to be processed by this department
    // Find tickets where:
    // 1. The department exists in departmentHistory
    // 2. The completed field for that department is false
    // 3. The ticket is not held (unless we're specifically looking for held tickets)
    // 4. If roomId is provided, either the ticket has that roomId or has no roomId assigned yet

    const departmentMatch = {
      department: department,
      completed: false,
    };

    // Don't filter by roomId in the database query - we'll filter in the component
    // This allows tickets without a specific room assignment to be visible to all staff

    query.$and = [
      {
        departmentHistory: {
          $elemMatch: departmentMatch,
        },
      },
    ];

    // Only get non-held tickets for normal queue
    if (!held) {
      query.$and.push({ held: false });
    }
  }

  console.log("Query:", JSON.stringify(query, null, 2));

  const tickets = await Ticket.find(query);
  console.log(
    `Found ${tickets.length} tickets for department: ${department}, held: ${held}`
  );

  // Log the ticket numbers for debugging
  if (tickets.length > 0) {
    console.log("Ticket numbers:", tickets.map((t) => t.ticketNo).join(", "));
  }

  return NextResponse.json(tickets);
}
