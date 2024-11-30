import mongoose from "mongoose";

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
    databasePassword: { type: String, required: true },
  },
  { timestamps: true }
);

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
      viewBranches: { type: Boolean, default: false },
      manageBranches: { type: Boolean, default: false },
      viewUsers: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
      viewRoles: { type: Boolean, default: false },
      manageRoles: { type: Boolean, default: false },
      viewServing: { type: Boolean, default: false },
      manageServing: { type: Boolean, default: false },
      viewQueues: { type: Boolean, default: false },
      manageQueues: { type: Boolean, default: false },
      viewExchangeRates: { type: Boolean, default: false },
      manageExchangeRates: { type: Boolean, default: false },
      viewAds: { type: Boolean, default: false },
      manageAds: { type: Boolean, default: false },
      viewSettings: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

//settings schema
const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    timezone: { type: String, required: true },
    defaultLanguage: { type: String, required: true },
    notificationText: { type: String },
    logoImage: { type: String },
  },
  { timestamps: true }
);

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
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", userSchema);
