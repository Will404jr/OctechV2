import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/hospital";
import { Journey } from "@/lib/models/hospital";

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

export async function POST() {
  try {
    await dbConnect();

    const ticketNo = await generateTicketNumber();

    const newTicket = new Ticket({
      ticketNo,
      journeyId: null,
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

export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const journeyId = searchParams.get("journeyId");
  const department = searchParams.get("department");
  const currentStepOnly = searchParams.get("currentStepOnly") === "true";

  // console.log(
  //   `Fetching tickets for department: ${department}, currentStepOnly: ${currentStepOnly}`
  // );

  let query: any = { noShow: false, completed: false };

  if (journeyId === "null") {
    query = { ...query, journeyId: null };
  } else if (journeyId) {
    query = { ...query, journeyId };
  }

  if (department) {
    const journeys = await Journey.find({ "steps.title": department });
    const journeyIds = journeys.map((journey) => journey._id);

    // console.log(
    //   `Found ${journeys.length} journeys for department ${department}`
    // );

    query = {
      ...query,
      journeyId: { $in: journeyIds },
    };

    if (currentStepOnly) {
      const journeyStepIndices = await Promise.all(
        journeys.map(async (journey) => {
          const stepIndex = journey.steps.findIndex(
            (step: any) => step.title === department
          );
          return { journeyId: journey._id, stepIndex };
        })
      );

      query.$or = journeyStepIndices.map(({ journeyId, stepIndex }) => ({
        journeyId,
        currentStep: stepIndex,
      }));
    } else {
      query[`journeySteps.${department}.completed`] = { $ne: true };
    }
  }

  // console.log("Final query:", JSON.stringify(query, null, 2));

  const tickets = await Ticket.find(query).populate("journeyId");

  // console.log(`Found ${tickets.length} tickets`);

  return NextResponse.json(tickets);
}
