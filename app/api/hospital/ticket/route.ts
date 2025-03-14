import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/hospital";

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

    const newTicket = new Ticket({
      ticketNo,
      departmentHistory: [],
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

// Update the GET function to properly handle department history completion status
export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department");
  const unassigned = searchParams.get("unassigned") === "true";
  const held = searchParams.get("held") === "true";

  console.log(
    `GET tickets for department: ${department}, unassigned: ${unassigned}, held: ${held}`
  );

  const query: any = { noShow: false, completed: false };

  if (held && department) {
    // For held tickets in a specific department
    // Find tickets where:
    // 1. The department exists in departmentHistory
    // 2. The completed field for that department is false
    // 3. The ticket is marked as held
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
    // For reception - tickets that haven't been assigned to any department yet
    query.departmentHistory = { $size: 0 };
    query.held = held === true;
  } else if (department) {
    // For specific departments - find tickets that need to be processed by this department
    // Find tickets where:
    // 1. The department exists in departmentHistory
    // 2. The completed field for that department is false
    // 3. The ticket is not held (unless we're specifically looking for held tickets)
    query.$and = [
      {
        departmentHistory: {
          $elemMatch: {
            department: department,
            completed: false,
          },
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
