import dbConnect from "@/lib/db";
import { Department } from "@/lib/models/hospital";

const departments = [
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
  { title: "Oncology", icon: "🎗️" },
  { title: "Dermatology", icon: "🧴" },
  { title: "Gastroenterology", icon: "🍽️" },
  { title: "Endocrinology", icon: "🧬" },
  { title: "Nephrology", icon: "🩺" },
  { title: "Urology", icon: "🚻" },
  { title: "Pulmonology", icon: "🫁" },
  { title: "Rheumatology", icon: "🤝" },
  { title: "Hematology", icon: "🩺" },
  { title: "Infectious Diseases", icon: "🦠" },
  { title: "Psychiatry", icon: "🧠" },
  { title: "Obstetrics", icon: "🤰" },
  { title: "Gynecology", icon: "♀️" },
  { title: "Neonatology", icon: "👶" },
  { title: "Ophthalmology", icon: "👁️" },
  { title: "ENT (Ear, Nose, Throat)", icon: "👂" },
  { title: "Dentistry", icon: "🦷" },
  { title: "Nutrition", icon: "🥗" },
  { title: "Rehabilitation", icon: "🏋️" },
  { title: "Palliative Care", icon: "🕊️" },
  { title: "Maternity Ward", icon: "👩‍🍼" },
  { title: "Operating Theatre", icon: "🏥" },
  { title: "Anesthesiology", icon: "😴" },
  { title: "Pathology", icon: "🔬" },
  { title: "Medical Records", icon: "📁" },
  { title: "Human Resources", icon: "👥" },
  { title: "Maintenance", icon: "🔧" },
  { title: "Security", icon: "🔒" },
  { title: "Chaplaincy", icon: "🙏" },
  { title: "Social Services", icon: "🤝" },
  { title: "Patient Transport", icon: "🚑" },
  { title: "Medical Imaging", icon: "🖼️" },
  { title: "Outpatient Clinic", icon: "🏣" },
];

async function seedDepartments() {
  try {
    await dbConnect();

    // Clear existing departments
    await Department.deleteMany({});

    // Insert departments
    await Department.insertMany(departments);

    console.log("Departments seeded successfully!");
  } catch (error) {
    console.error("Error seeding departments:", error);
  } finally {
    process.exit(0);
  }
}

seedDepartments();
