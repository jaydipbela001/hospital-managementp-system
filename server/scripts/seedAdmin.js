import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import User from "../src/models/User.js";
import Role, { ROLES } from "../src/models/Role.js";

async function seed() {
  console.log("Connecting to database...");
  await connectDatabase();

  console.log("Seeding Roles...");
  const roleDefinitions = [
    { name: "SUPER_ADMIN", displayName: "Super Administrator", description: "Full system administration" },
    { name: "HOSPITAL_ADMIN", displayName: "Hospital Administrator", description: "Hospital operational management" },
    { name: "DOCTOR", displayName: "Doctor / Clinician", description: "Clinical encounters and prescriptions" },
    { name: "NURSE", displayName: "Nurse", description: "Ward and patient monitoring" },
    { name: "RECEPTIONIST", displayName: "Receptionist", description: "Front desk and appointments" },
    { name: "PHARMACIST", displayName: "Pharmacist", description: "Dispensary and medicines" },
    { name: "LAB_TECHNICIAN", displayName: "Lab Technician", description: "Diagnostics and investigations" },
    { name: "PATIENT", displayName: "Patient", description: "Self service portal" },
  ];

  for (const r of roleDefinitions) {
    await Role.findOneAndUpdate(
      { name: r.name },
      { $set: r },
      { upsert: true, new: true }
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@hospital.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

  console.log(`Checking Super Admin user (${adminEmail})...`);
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (!existingAdmin) {
    const passwordHash = await User.hashPassword(adminPassword);
    const superAdmin = await User.create({
      name: "Dr. System Administrator",
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    });
    console.log("✔ Super Admin created successfully:");
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  Password: ${adminPassword}`);
  } else {
    console.log("✔ Super Admin already exists.");
  }

  await mongoose.disconnect();
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

