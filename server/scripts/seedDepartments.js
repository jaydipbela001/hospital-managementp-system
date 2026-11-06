import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import { Department } from "../src/models/Department.js";

const DEFAULT_DEPARTMENTS = [
  {
    name: "General Medicine",
    code: "GENMED",
    description: "Primary adult care, diagnosis, and non-surgical management.",
  },
  {
    name: "Cardiology",
    code: "CARD",
    description: "Heart, vascular care, ECG, and cardiovascular consultations.",
  },
  {
    name: "Orthopedics",
    code: "ORTHO",
    description: "Bones, joints, ligaments, tendons, and musculoskeletal conditions.",
  },
  {
    name: "Pediatrics",
    code: "PED",
    description: "Infant, child, and adolescent medical care and vaccinations.",
  },
  {
    name: "Gynecology & Obstetrics",
    code: "OBGYN",
    description: "Women's reproductive health, pregnancy, and childbirth services.",
  },
  {
    name: "Neurology",
    code: "NEURO",
    description: "Brain, spinal cord, and nervous system disorders.",
  },
  {
    name: "Dermatology",
    code: "DERM",
    description: "Skin, hair, and nail health consultations.",
  },
  {
    name: "Emergency & Trauma",
    code: "EMERG",
    description: "24/7 urgent resuscitation and acute critical interventions.",
  },
  {
    name: "Radiology",
    code: "RAD",
    description: "X-ray, CT scan, Ultrasound, and medical imaging services.",
  },
  {
    name: "Pathology & Laboratory",
    code: "PATH",
    description: "Clinical blood tests, tissue biopsies, and lab diagnostics.",
  },
  {
    name: "Pharmacy",
    code: "PHARM",
    description: "Inpatient and outpatient medication dispensing.",
  },
];

async function seedDepartments() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/hms_db";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for department seeding...");

    for (const dept of DEFAULT_DEPARTMENTS) {
      await Department.findOneAndUpdate(
        { $or: [{ name: dept.name }, { code: dept.code }] },
        { ...dept, status: "ACTIVE" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✓ Seeded/Updated department: ${dept.name} (${dept.code})`);
    }

    console.log("All default hospital departments seeded successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed departments:", err);
    process.exit(1);
  }
}

seedDepartments();

