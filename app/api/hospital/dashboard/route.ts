import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/hospital";

export async function GET() {
  try {
    await dbConnect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickets = await Ticket.find({
      createdAt: { $gte: today },
    });

    const totalTickets = tickets.length;
    const ticketsServed = tickets.filter((ticket) => ticket.completed).length;
    const waitingTickets = tickets.filter((ticket) => !ticket.completed).length;
    const cancelledTickets = tickets.filter((ticket) => ticket.noShow).length;

    // Calculate tickets per hour
    const ticketsPerHour = Array(24).fill(0);
    tickets.forEach((ticket) => {
      const hour = new Date(ticket.createdAt).getHours();
      ticketsPerHour[hour]++;
    });

    return NextResponse.json({
      totalTickets,
      ticketsServed,
      waitingTickets,
      cancelledTickets,
      ticketsPerHour,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
