import mongoose from "mongoose";
import bcrypt from "bcryptjs";

//ad schema
const adSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

export const Ad = mongoose.models.Ad || mongoose.model("Ad", adSchema);

//branch schema
const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    localNetworkAddress: { type: String, required: true },
    databaseHost: { type: String, required: true },
    databaseName: { type: String, required: true },
    databaseUser: { type: String, required: true },
    databasePassword: { type: String, required: false },
    kioskUsername: { type: String, required: true },
    kioskPassword: {
      type: String,
      required: true,
    },
    hallDisplayUsername: { type: String, required: true },
    hallDisplayPassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
branchSchema.pre("save", async function (next) {
  if (this.isModified("hallDisplayPassword") && this.hallDisplayPassword) {
    this.hallDisplayPassword = await bcrypt.hash(this.hallDisplayPassword, 10);
  }
  if (this.isModified("kioskPassword") && this.kioskPassword) {
    this.kioskPassword = await bcrypt.hash(this.kioskPassword, 10);
  }
  next();
});

branchSchema.methods.compareHallDisplayPassword = async function (
  candidatePassword: string
) {
  console.log("Candidate Password:", candidatePassword);
  console.log("Stored Password:", this.password);
  return bcrypt.compare(candidatePassword, this.hallDisplayPassword);
};

branchSchema.methods.compareKioskPassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.kioskPassword);
};

export const Branch =
  mongoose.models.Branch || mongoose.model("Branch", branchSchema);

//exchangeRate schema
const exchangeRateSchema = new mongoose.Schema(
  {
    countryName: { type: String, required: true },
    countryCode: { type: String, required: true },
    currencyCode: { type: String, required: true },
    buyingRate: { type: Number, required: true },
    sellingRate: { type: Number, required: true },
  },
  { timestamps: true }
);

export const ExchangeRate =
  mongoose.models.ExchangeRate ||
  mongoose.model("ExchangeRate", exchangeRateSchema);

//queue schema
const subMenuItemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Sub-menu item name
});

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Menu item name
  subMenuItems: [subMenuItemSchema], // Array of sub-menu items
});

const queueSchema = new mongoose.Schema(
  {
    menuItem: menuItemSchema, // A single menu item with sub-menu items
  },
  { timestamps: true }
);

export const Queue =
  mongoose.models.Queue || mongoose.model("Queue", queueSchema);

//role schema
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    permissions: {
      Branches: { type: Boolean, default: false },
      Users: { type: Boolean, default: false },
      Roles: { type: Boolean, default: false },
      Serving: { type: Boolean, default: false },
      Queues: { type: Boolean, default: false },
      ExchangeRates: { type: Boolean, default: false },
      Ads: { type: Boolean, default: false },
      Settings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

//settings schema
const settingsSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Hash password before saving
settingsSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

settingsSchema.methods.compareAdminPassword = async function (
  candidatePassword: string
) {
  console.log("Candidate Password:", candidatePassword);
  console.log("Stored Password:", this.password);
  return bcrypt.compare(candidatePassword, this.password);
};

export const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

//user schema
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    image: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);

// counter schema
const counterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    counterNumber: { type: Number, required: true },
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Counter =
  mongoose.models.Counter || mongoose.model("counter", counterSchema);

// Ticket schema
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
    counterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
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
