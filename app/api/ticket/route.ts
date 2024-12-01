import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/ticket";

function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  return response;
}

export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 204 }));
}

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
    number = parseInt(latestTicket.ticketNo.slice(1)) + 1;

    if (number > 99) {
      prefix = String.fromCharCode(prefix.charCodeAt(0) + 1);
      number = 1;
    }
  }

  return `${prefix}${number.toString().padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const queueId = searchParams.get("queueId");
    const status = searchParams.get("status");

    console.log(
      "Received request with queueId:",
      queueId,
      "and status:",
      status
    );

    let query: any = {};
    if (queueId) query.queueId = queueId;
    if (status) query.ticketStatus = status;

    console.log("Executing query:", query);

    const tickets = await Ticket.find(query).sort({ createdAt: 1 });

    console.log("Found tickets:", tickets.length);

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    console.log("Received body:", body);

    if (!body.queueId || !body.issueDescription) {
      const response = NextResponse.json(
        {
          success: false,
          error: "Missing required fields: queueId or issueDescription",
        },
        { status: 400 }
      );
      return setCorsHeaders(response);
    }

    const ticketNo = await generateTicketNumber();

    const newTicket = new Ticket({
      ticketNo,
      queueId: body.queueId,
      subItemId: body.subItemId,
      issueDescription: body.issueDescription,
      ticketStatus: "Not Served", // Explicitly set here
    });

    const savedTicket = await newTicket.save();

    console.log("Newly created ticket:", savedTicket.toObject());

    // Fetch the ticket again to ensure all fields are populated
    const fetchedTicket = await Ticket.findById(savedTicket._id).lean();
    console.log("Fetched ticket from database:", fetchedTicket);

    const response = NextResponse.json(
      { success: true, data: fetchedTicket },
      { status: 201 }
    );
    return setCorsHeaders(response);
  } catch (error) {
    console.error("Error creating ticket:", error);

    const response = NextResponse.json(
      { success: false, error: "An unknown error occurred" },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}
