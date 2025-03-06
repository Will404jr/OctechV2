import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { string } from "zod";

//ad schema
const hospitalAdSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

export const HospitalAd =
  mongoose.models.HospitalAd || mongoose.model("HospitalAd", hospitalAdSchema);

// event schema
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Event =
  mongoose.models.Event || mongoose.model("Event", eventSchema);

//queue schema
const TreeNodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["default", "primary", "secondary", "warning", "success"],
      default: "default",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeNode",
      default: null,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "hospitalQueues" }
);

export const TreeNode =
  mongoose.models.TreeNode || mongoose.model("TreeNode", TreeNodeSchema);

//role schema
const hospitalRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    permissions: {
      Staff: { type: Boolean, default: false },
      Roles: { type: Boolean, default: false },
      Receptionist: { type: Boolean, default: false },
      Serving: { type: Boolean, default: false },
      Queues: { type: Boolean, default: false },
      UpcomingEvents: { type: Boolean, default: false },
      Ads: { type: Boolean, default: false },
      Settings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const HospitalRole =
  mongoose.models.HospitalRole ||
  mongoose.model("HospitalRole", hospitalRoleSchema);

//staff schema
const staffSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HospitalRole",
      required: true,
    },
    department: { type: String, required: true },
  },
  { timestamps: true }
);

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
staffSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Staff =
  mongoose.models.Staff || mongoose.model("Staff", staffSchema);

//settings schema
const hospitalSettingsSchema = new mongoose.Schema(
  {
    companyType: { type: String, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    timezone: { type: String },
    defaultLanguage: { type: String },
    notificationText: { type: String, required: true },
    logoImage: { type: String },
    password: {
      type: String,
      required: true,
    },
    kioskUsername: { type: String, required: true },
    kioskPassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, collection: "settings" }
);

// Hash password before saving
hospitalSettingsSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("kioskPassword") && this.kioskPassword) {
    this.kioskPassword = await bcrypt.hash(this.kioskPassword, 10);
  }
  next();
});

hospitalSettingsSchema.methods.compareAdminPassword = async function (
  candidatePassword: string
) {
  console.log("Candidate Password:", candidatePassword);
  console.log("Stored Password:", this.password);
  return bcrypt.compare(candidatePassword, this.password);
};

hospitalSettingsSchema.methods.compareKioskPassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.kioskPassword);
};

export const HospitalSettings =
  mongoose.models.HospitalSettings ||
  mongoose.model("HospitalSettings", hospitalSettingsSchema);

// room schema
const roomSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    department: { type: String, required: true },
    roomNumber: { type: Number, required: true },
    servingTicket: { type: String, default: "", required: false },
  },
  { timestamps: true }
);

// Add a compound unique index for department and roomNumber
roomSchema.index({ department: 1, roomNumber: 1 }, { unique: true });

export const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

//ticket schema
const ticketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true },
    reasonforVisit: { type: String, default: "", required: false },
    receptionistNote: { type: String, default: "", required: false },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Journey",
      required: false,
    },
    currentStep: { type: Number, default: 0 },
    journeySteps: {
      type: Map,
      of: new mongoose.Schema({
        completed: { type: Boolean, default: false },
        note: { type: String, default: "", required: false },
      }),
      default: new Map(),
    },
    completed: { type: Boolean, default: false },
    call: { type: Boolean, default: false },
    noShow: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Ticket =
  mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);

//  journey schema
const StepSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  icon: {
    type: String,
    required: true,
  },
});

// Main Journey Schema
const JourneySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    steps: [StepSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
JourneySchema.index({ name: 1 });
JourneySchema.index({ createdAt: -1 });

export const Journey =
  mongoose.models.Journey || mongoose.model("Journey", JourneySchema);

// Example of how to use the schema
// const example = {
//   name: "General Checkup",
//   steps: [
//     { id: 1, title: "Reception", icon: "👋" },
//     { id: 2, title: "Triage", icon: "🔍" },
//     { id: 3, title: "Laboratory", icon: "🧪" },
//     { id: 4, title: "General Medicine", icon: "👨‍⚕️" },
//     { id: 5, title: "Pharmacy", icon: "💊" },
//     { id: 6, title: "Cashier", icon: "💵" }
//   ]
// };
