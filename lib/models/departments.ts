export interface Department {
  title: string;
  icon: string;
}

const departments: Department[] = [
  { title: "Reception", icon: "👋" },
  { title: "Registration", icon: "📋" },
  { title: "Triage", icon: "🔍" },
  { title: "Emergency", icon: "🚨" },
  { title: "Laboratory", icon: "🧪" },
  { title: "Radiology", icon: "📸" },
  { title: "MRI", icon: "🔬" },
  { title: "CT Scan", icon: "📽️" },
  { title: "Ultrasound", icon: "🎥" },
  { title: "Blood Bank", icon: "🩸" },
  { title: "General Medicine", icon: "👨‍⚕️" },
  { title: "Cardiology", icon: "❤️" },
  { title: "Neurology", icon: "🧠" },
  { title: "Orthopedics", icon: "🦴" },
  { title: "Pediatrics", icon: "🧒" },
  { title: "Surgery", icon: "⚔️" },
  { title: "ICU", icon: "💓" },
  { title: "Pharmacy", icon: "💊" },
  { title: "Physiotherapy", icon: "🤸" },
  { title: "Billing", icon: "💰" },
  { title: "Cashier", icon: "💵" },
  { title: "Discharge", icon: "🚪" },
];

export default departments;
