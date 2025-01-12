export interface Department {
  title: string;
  icon: string;
  roomNumber: number;
}

const departments: Department[] = [
  { title: "Reception", icon: "👋", roomNumber: 1 },
  { title: "Registration", icon: "📋", roomNumber: 2 },
  { title: "Triage", icon: "🔍", roomNumber: 3 },
  { title: "Emergency", icon: "🚨", roomNumber: 4 },
  { title: "Laboratory", icon: "🧪", roomNumber: 5 },
  { title: "Radiology", icon: "📸", roomNumber: 6 },
  { title: "MRI", icon: "🔬", roomNumber: 7 },
  { title: "CT Scan", icon: "📽️", roomNumber: 8 },
  { title: "Ultrasound", icon: "🎥", roomNumber: 9 },
  { title: "Blood Bank", icon: "🩸", roomNumber: 10 },
  { title: "General Medicine", icon: "👨‍⚕️", roomNumber: 11 },
  { title: "Cardiology", icon: "❤️", roomNumber: 12 },
  { title: "Neurology", icon: "🧠", roomNumber: 13 },
  { title: "Orthopedics", icon: "🦴", roomNumber: 14 },
  { title: "Pediatrics", icon: "🧒", roomNumber: 15 },
  { title: "Surgery", icon: "⚔️", roomNumber: 16 },
  { title: "ICU", icon: "💓", roomNumber: 17 },
  { title: "Pharmacy", icon: "💊", roomNumber: 18 },
  { title: "Physiotherapy", icon: "🤸", roomNumber: 19 },
  { title: "Billing", icon: "💰", roomNumber: 20 },
  { title: "Cashier", icon: "💵", roomNumber: 21 },
  { title: "Discharge", icon: "🚪", roomNumber: 22 },
];

export default departments;
