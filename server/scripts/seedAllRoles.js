import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { connectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";
import Department from "../src/models/Department.js";
import DoctorProfile from "../src/models/DoctorProfile.js";

const DEFAULT_PASSWORD = "Password@123";

const ROLES_SEED = [
  { name: "SUPER_ADMIN", displayName: "Super Administrator", description: "Full system administration" },
  { name: "HOSPITAL_ADMIN", displayName: "Hospital Administrator", description: "Hospital operational management" },
  { name: "DOCTOR", displayName: "Doctor / Clinician", description: "Clinical encounters and prescriptions" },
  { name: "NURSE", displayName: "Nurse", description: "Ward and patient monitoring" },
  { name: "RECEPTIONIST", displayName: "Receptionist", description: "Front desk and appointments" },
  { name: "PHARMACIST", displayName: "Pharmacist", description: "Dispensary and medicines" },
  { name: "LAB_TECHNICIAN", displayName: "Lab Technician", description: "Diagnostics and investigations" },
  { name: "PATIENT", displayName: "Patient", description: "Self service portal" },
];

const USERS_SEED = [
  {
    name: "System Super Admin",
    email: "admin@hospital.local",
    role: "SUPER_ADMIN",
    phone: "111-222-0001",
  },
  {
    name: "Operational Admin",
    email: "hadmin@hospital.local",
    role: "HOSPITAL_ADMIN",
    phone: "111-222-0002",
  },
  {
    name: "Dr. Sarah Mitchell",
    email: "doctor.mitchell@hospital.local",
    role: "DOCTOR",
    phone: "111-222-0003",
    departmentCode: "CARD",
    specialization: "Cardiologist",
    consultationFee: 75,
  },
  {
    name: "Dr. James Wilson",
    email: "doctor.wilson@hospital.local",
    role: "DOCTOR",
    phone: "111-222-0010",
    departmentCode: "NEURO",
    specialization: "Neurologist",
    consultationFee: 90,
  },
  {
    name: "Dr. Anita Sharma",
    email: "doctor.sharma@hospital.local",
    role: "DOCTOR",
    phone: "111-222-0011",
    departmentCode: "PED",
    specialization: "Pediatrician",
    consultationFee: 60,
  },
  {
    name: "Dr. David Chen",
    email: "doctor.chen@hospital.local",
    role: "DOCTOR",
    phone: "111-222-0012",
    departmentCode: "ORTHO",
    specialization: "Orthopedic Surgeon",
    consultationFee: 85,
  },
  {
    name: "Nurse Emily Davis",
    email: "nurse@hospital.local",
    role: "NURSE",
    phone: "111-222-0004",
  },
  {
    name: "Receptionist Mark Lee",
    email: "receptionist@hospital.local",
    role: "RECEPTIONIST",
    phone: "111-222-0005",
  },
  {
    name: "Pharmacist John Clark",
    email: "pharmacist@hospital.local",
    role: "PHARMACIST",
    phone: "111-222-0006",
  },
  {
    name: "Lab Tech Alex Morgan",
    email: "lab@hospital.local",
    role: "LAB_TECHNICIAN",
    phone: "111-222-0007",
  },
  {
    name: "Patient Robert Brown",
    email: "patient@hospital.local",
    role: "PATIENT",
    phone: "111-222-0008",
  },
];

async function seedAllRoleUsers() {
  try {
    console.log("Connecting to database...");
    await connectDatabase();

    // 1. Ensure Roles exist
    for (const r of ROLES_SEED) {
      await Role.findOneAndUpdate({ name: r.name }, { $set: r }, { upsert: true });
    }

    // 2. Fetch or create default departments
    const depts = [
      { name: "Cardiology", code: "CARD" },
      { name: "Neurology", code: "NEURO" },
      { name: "Pediatrics", code: "PED" },
      { name: "Orthopedics", code: "ORTHO" },
    ];
    for (const d of depts) {
      await Department.findOneAndUpdate({ code: d.code }, { $set: d }, { upsert: true });
    }

    console.log("\n==================================================================");
    console.log("SEEDING DEMO USERS FOR ALL ROLES (Password: Password@123)");
    console.log("==================================================================");

    for (const u of USERS_SEED) {
      const dept = u.departmentCode ? await Department.findOne({ code: u.departmentCode }) : null;
      let user = await User.findOne({ email: u.email });
      if (!user) {
        const passwordHash = await User.hashPassword(DEFAULT_PASSWORD);
        user = await User.create({
          name: u.name,
          email: u.email,
          phone: u.phone,
          passwordHash,
          role: u.role,
          departmentId: dept?._id || null,
          status: "ACTIVE",
        });
      } else {
        user.name = u.name;
        user.role = u.role;
        user.status = "ACTIVE";
        if (dept) user.departmentId = dept._id;
        await user.save();
      }

      if (u.role === "DOCTOR") {
        await DoctorProfile.findOneAndUpdate(
          { userId: user._id },
          {
            userId: user._id,
            departmentId: dept?._id || null,
            specialization: u.specialization || "General Medicine",
            consultationFee: u.consultationFee || 50,
          },
          { upsert: true }
        );
      }

      console.log(`✓ [${u.role.padEnd(14)}] Email: ${u.email.padEnd(26)} Password: ${DEFAULT_PASSWORD}`);
    }

    console.log("==================================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding role users:", err);
    process.exit(1);
  }
}

seedAllRoleUsers();

