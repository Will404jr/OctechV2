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

export async function GET() {
  try {
    await dbConnect();
    const tickets = await Ticket.find({});
    const response = NextResponse.json(tickets);
    return setCorsHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
    return setCorsHeaders(response);
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    console.log("Received body:", body); // Debug received data

    // Validate required fields
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

    // Explicitly set ticketStatus during creation
    const newTicket = await Ticket.create({
      ticketNo,
      queueId: body.queueId,
      subItemId: body.subItemId,
      issueDescription: body.issueDescription,
      ticketStatus: "Not Served", // Explicitly set here
    });

    console.log("Newly created ticket:", newTicket.toObject());

    const savedTicket = await Ticket.findById(newTicket._id).lean();
    console.log("Saved ticket from database:", savedTicket);

    const response = NextResponse.json(
      { success: true, data: savedTicket },
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
