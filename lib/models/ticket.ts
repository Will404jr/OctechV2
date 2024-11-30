import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true },
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      required: true,
    },
    subItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    issueDescription: { type: String, required: true },
    ticketStatus: {
      type: String,
      enum: ["Not Served", "Serving", "Served"],
      default: "Not Served",
      required: true,
    },
  },
  { timestamps: true }
);

// Add a pre-save middleware to ensure ticketStatus is set
ticketSchema.pre("save", function (next) {
  if (!this.ticketStatus) {
    this.ticketStatus = "Not Served";
  }
  next();
});

export const Ticket =
  mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
