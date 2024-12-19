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
      Staff: { type: Boolean, default: false },
      Roles: { type: Boolean, default: false },
      Serving: { type: Boolean, default: false },
      Queues: { type: Boolean, default: false },
      UpcomingEvents: { type: Boolean, default: false },
      Ads: { type: Boolean, default: false },
      Settings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

//staff schema
const staffSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
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
    kioskUsername: { type: String, required: true },
    kioskPassword: {
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
  if (this.isModified("kioskPassword") && this.kioskPassword) {
    this.kioskPassword = await bcrypt.hash(this.kioskPassword, 10);
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

settingsSchema.methods.compareKioskPassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.kioskPassword);
};

export const Settings =
  mongoose.models.Settings || mongoose.model("Settings", settingsSchema);

// room schema
const roomSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    roomNumber: { type: Number, required: true },
    queueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
