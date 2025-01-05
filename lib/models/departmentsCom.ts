// departments.js

const HOSPITAL_DEPARTMENTS = [
  // Front Desk & Administration
  {
    id: "reception",
    title: "Reception",
    icon: "👋",
    category: "Administration",
  },
  {
    id: "registration",
    title: "Registration",
    icon: "📋",
    category: "Administration",
  },
  { id: "billing", title: "Billing", icon: "💰", category: "Administration" },
  {
    id: "insurance",
    title: "Insurance Desk",
    icon: "📄",
    category: "Administration",
  },
  {
    id: "medical_records",
    title: "Medical Records",
    icon: "🗂️",
    category: "Administration",
  },

  // Emergency & Critical Care
  {
    id: "emergency",
    title: "Emergency Room",
    icon: "🚨",
    category: "Emergency",
  },
  { id: "trauma", title: "Trauma Center", icon: "🏥", category: "Emergency" },
  {
    id: "icu",
    title: "Intensive Care Unit",
    icon: "💓",
    category: "Emergency",
  },
  { id: "nicu", title: "Neonatal ICU", icon: "👶", category: "Emergency" },
  {
    id: "ambulance",
    title: "Ambulance Services",
    icon: "🚑",
    category: "Emergency",
  },

  // General Medical
  { id: "triage", title: "Triage", icon: "🔍", category: "General" },
  {
    id: "general_medicine",
    title: "General Medicine",
    icon: "👨‍⚕️",
    category: "General",
  },
  {
    id: "outpatient",
    title: "Outpatient Clinic",
    icon: "🏃",
    category: "General",
  },
  { id: "inpatient", title: "Inpatient Ward", icon: "🛏️", category: "General" },
  { id: "pediatrics", title: "Pediatrics", icon: "🧒", category: "General" },

  // Specialized Medicine
  {
    id: "cardiology",
    title: "Cardiology",
    icon: "❤️",
    category: "Specialized",
  },
  { id: "neurology", title: "Neurology", icon: "🧠", category: "Specialized" },
  {
    id: "orthopedics",
    title: "Orthopedics",
    icon: "🦴",
    category: "Specialized",
  },
  {
    id: "dermatology",
    title: "Dermatology",
    icon: "🧴",
    category: "Specialized",
  },
  {
    id: "ophthalmology",
    title: "Ophthalmology",
    icon: "👁️",
    category: "Specialized",
  },
  { id: "ent", title: "ENT", icon: "👂", category: "Specialized" },
  { id: "dental", title: "Dental", icon: "🦷", category: "Specialized" },
  {
    id: "psychiatry",
    title: "Psychiatry",
    icon: "🧪",
    category: "Specialized",
  },
  { id: "oncology", title: "Oncology", icon: "⚕️", category: "Specialized" },

  // Diagnostics & Testing
  {
    id: "laboratory",
    title: "Laboratory",
    icon: "🧪",
    category: "Diagnostics",
  },
  { id: "radiology", title: "Radiology", icon: "📸", category: "Diagnostics" },
  { id: "mri", title: "MRI", icon: "🔬", category: "Diagnostics" },
  { id: "ct_scan", title: "CT Scan", icon: "📽️", category: "Diagnostics" },
  {
    id: "ultrasound",
    title: "Ultrasound",
    icon: "🎥",
    category: "Diagnostics",
  },
  {
    id: "blood_bank",
    title: "Blood Bank",
    icon: "🩸",
    category: "Diagnostics",
  },

  // Surgery & Operation
  { id: "surgery", title: "Surgery", icon: "🔪", category: "Surgery" },
  {
    id: "operation_theater",
    title: "Operation Theater",
    icon: "⚔️",
    category: "Surgery",
  },
  { id: "post_op", title: "Post-Operation", icon: "🛏️", category: "Surgery" },
  {
    id: "anesthesiology",
    title: "Anesthesiology",
    icon: "💉",
    category: "Surgery",
  },

  // Support Services
  { id: "pharmacy", title: "Pharmacy", icon: "💊", category: "Support" },
  {
    id: "physiotherapy",
    title: "Physiotherapy",
    icon: "🤸",
    category: "Support",
  },
  { id: "nutrition", title: "Nutrition", icon: "🥗", category: "Support" },
  {
    id: "social_services",
    title: "Social Services",
    icon: "🤝",
    category: "Support",
  },
  { id: "counseling", title: "Counseling", icon: "💭", category: "Support" },

  // Payment & Exit
  { id: "cashier", title: "Cashier", icon: "💵", category: "Payment" },
  { id: "discharge", title: "Discharge", icon: "🚪", category: "Payment" },
];

// Helper function to get departments by category
const getDepartmentsByCategory = (category: string) => {
  return HOSPITAL_DEPARTMENTS.filter((dept) => dept.category === category);
};

// Helper function to get department by ID
const getDepartmentById = (id: string) => {
  return HOSPITAL_DEPARTMENTS.find((dept) => dept.id === id);
};

// Get all categories
const getCategories = () => {
  return Array.from(new Set(HOSPITAL_DEPARTMENTS.map((dept) => dept.category)));
};

module.exports = {
  HOSPITAL_DEPARTMENTS,
  getDepartmentsByCategory,
  getDepartmentById,
  getCategories,
};
