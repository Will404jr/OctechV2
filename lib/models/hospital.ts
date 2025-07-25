import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

//role schema
const hospitalRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    permissions: {
      Staff: { type: Boolean, default: false },
      Roles: { type: Boolean, default: false },
      Receptionist: { type: Boolean, default: false },
      Billing: { type: Boolean, default: false },
      Tickets: { type: Boolean, default: false },
      Departments: { type: Boolean, default: false },
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
      required: false,
    },
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

//ticket schema
const ticketSchema = new mongoose.Schema(
  {
    ticketNo: {
      type: String,
      required: true,
      unique: false,
    },
    patientName: {
      type: String,
      default: null,
    },
    userType: {
      type: String,
      enum: ["Cash", "Insurance", "Staff"],
      default: null,
    },
    language: {
      type: String,
      default: "English",
    },
    reasonforVisit: {
      type: String,
      default: null,
    },
    receptionistNote: {
      type: String,
      default: null,
    },
    departmentNote: {
      type: String,
      default: null,
    },
    call: {
      type: Boolean,
      default: false,
    },
    noShow: {
      type: Boolean,
      default: false,
    },
    held: {
      type: Boolean,
      default: false,
    },
    emergency: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    totalDuration: {
      type: Number,
      default: 0,
    },
    // NEW: Department queue for multi-department routing
    departmentQueue: [
      {
        departmentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
          required: true,
        },
        departmentName: {
          type: String,
          required: true,
        },
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
          default: null,
        },
        processed: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          required: true,
        },
        // NEW: Payment clearance field for queue-level bulk clearing
        clearPayment: {
          type: String,
          enum: ["Cleared", "Pending", "Rejected"],
          default: null,
        },
      },
    ],
    currentQueueIndex: {
      type: Number,
      default: 0,
    },
    departmentHistory: [
      {
        department: {
          type: String,
          required: true,
        },
        icon: {
          type: String,
          default: null,
        },
        timestamp: {
          type: Date,
          required: true,
          default: Date.now,
        },
        startedAt: {
          type: Date,
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        processingDuration: {
          type: Number,
          default: 0,
        },
        waitingDuration: {
          type: Number,
          default: 0,
        },
        note: {
          type: String,
          default: "",
        },
        completed: {
          type: Boolean,
          default: false,
        },
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
          default: null,
        },
        holdStartedAt: {
          type: Date,
          default: null,
        },
        holdDuration: {
          type: Number,
          default: 0,
        },
        actuallyStarted: {
          type: Boolean,
          default: false,
        },
        cashCleared: {
          type: String,
          enum: ["Cleared", "Pending", "Rejected"],
          default: null,
        },
        paidAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

export const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema)


//department and room schema
const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    label: { type: String, required: false, default: "" },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    available: { type: Boolean, default: false },
    currentTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const departmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    icon: { type: String, required: true },
    rooms: [roomSchema],
  },
  { timestamps: true }
);

// Create a compound index to ensure unique room numbers within a department
departmentSchema.index({ title: 1, "rooms.roomNumber": 1 }, { unique: true });

export const Department =
  mongoose.models.Department || mongoose.model("Department", departmentSchema);

export const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

// Log schema
const logSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    action: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

export const Log = mongoose.models.Log || mongoose.model("Log", logSchema);
