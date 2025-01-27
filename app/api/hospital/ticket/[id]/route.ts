import { type NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Ticket } from "@/lib/models/hospital";
import { Journey } from "@/lib/models/hospital";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const {
      journeyId,
      currentStep,
      call,
      note,
      reasonforVisit,
      receptionistNote,
      noShow,
      journeySteps,
    } = await req.json();

    let updateData: any = {};

    // Handle journey assignment
    if (journeyId) {
      const journey = await Journey.findById(journeyId);
      if (!journey) {
        return NextResponse.json(
          { error: "Journey not found" },
          { status: 404 }
        );
      }

      // Create journey steps map if not provided
      if (!journeySteps) {
        const newJourneySteps = new Map();
        journey.steps.forEach((step: { title: string }) => {
          newJourneySteps.set(step.title, { completed: false, note: "" });
        });
        updateData.journeySteps = newJourneySteps;
      } else {
        updateData.journeySteps = journeySteps;
      }

      updateData = {
        ...updateData,
        journeyId,
        currentStep: currentStep || 0,
        completed: false,
      };
    }

    // Handle step completion
    if (currentStep !== undefined) {
      const ticket = await Ticket.findById(id);
      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket not found" },
          { status: 404 }
        );
      }

      const journey = await Journey.findById(ticket.journeyId);
      if (!journey) {
        return NextResponse.json(
          { error: "Journey not found" },
          { status: 404 }
        );
      }

      if (currentStep >= 0 && currentStep < journey.steps.length) {
        // Clear the current step
        const currentStepTitle = journey.steps[currentStep].title;
        updateData = {
          ...updateData,
          [`journeySteps.${currentStepTitle}.completed`]: true,
          [`journeySteps.${currentStepTitle}.note`]: note || "",
        };

        // Move to the next step if it exists
        if (currentStep + 1 < journey.steps.length) {
          updateData.currentStep = currentStep + 1;
        } else {
          // If this was the last step, mark the ticket as completed
          updateData.completed = true;
        }

        // Check if all steps are now completed
        const allStepsCompleted = journey.steps.every(
          (step: { title: string }) =>
            ticket.journeySteps.get(step.title)?.completed ||
            step.title === currentStepTitle
        );

        if (allStepsCompleted) {
          updateData.completed = true;
        }
      }
    }

    // Handle other updates
    if (call !== undefined) {
      updateData.call = call;
    }

    if (reasonforVisit !== undefined) {
      updateData.reasonforVisit = reasonforVisit;
    }

    if (receptionistNote !== undefined) {
      updateData.receptionistNote = receptionistNote;
    }

    if (noShow !== undefined) {
      updateData.noShow = noShow;
    }

    // Update the ticket
    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 }
    );
  }
}
