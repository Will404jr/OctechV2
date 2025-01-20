import { Types } from "mongoose";

export interface Ticket {
  _id: string;
  ticketNo: string;
  reasonforVisit: string;
  receptionistNote?: string;
  journeyId: {
    _id: string;
    name: string;
    steps: { title: string; icon: string }[];
  } | null;
  currentStep: number;
  journeySteps: Map<string, { completed: boolean; note: string }>;
  completed: boolean;
  call: boolean;
  createdAt: Date;
  updatedAt: Date;
}
