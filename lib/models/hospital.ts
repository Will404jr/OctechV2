import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

export const Ad = mongoose.models.Ad || mongoose.model("Ad", adSchema);

//queue schema
const queueItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subItems: [{ type: String }],
});

const queueSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    menuItems: [queueItemSchema],
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
      viewUsers: { type: Boolean, default: false },
      manageUsers: { type: Boolean, default: false },
      viewRoles: { type: Boolean, default: false },
      manageRoles: { type: Boolean, default: false },
      viewServing: { type: Boolean, default: false },
      manageServing: { type: Boolean, default: false },
      viewQueues: { type: Boolean, default: false },
      manageQueues: { type: Boolean, default: false },
      viewAds: { type: Boolean, default: false },
      manageAds: { type: Boolean, default: false },
      viewSettings: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);

//user schema
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalRole', required: true },
  },
  { timestamps: true });
  
  export const User = mongoose.models.User || mongoose.model('User', userSchema);

//settings schema
const settingsSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    timezone: { type: String, required: true },
    defaultLanguage: { type: String, required: true },
    notificationText: { type: String },
    logoImage: { type: String },
  },
  { timestamps: true });
  
  export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
