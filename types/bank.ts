import type { Types } from "mongoose";

export interface IBankTicket {
  _id: Types.ObjectId;
  ticketNo: string;
  queueId: Types.ObjectId;
  subItemId?: Types.ObjectId;
  issueDescription: string;
  justifyReason?: string | null;
  ticketStatus: "Not Served" | "Serving" | "Served" | "Hold";
  counterId?: Types.ObjectId | null;
  branchId: Types.ObjectId;
  callAgain: boolean;
  language: "English" | "Luganda";

  // Status timestamp fields
  notServedAt: Date;
  servingAt?: Date | null;
  holdAt?: Date | null;
  servedAt?: Date | null;

  // Duration tracking fields (in seconds)
  notServedDuration: number;
  servingDuration: number;
  holdDuration: number;
  totalDuration: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ICounter {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  isActive: boolean;
}
