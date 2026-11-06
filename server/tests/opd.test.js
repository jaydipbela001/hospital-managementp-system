import { describe, it } from "node:test";
import assert from "node:assert";
import { OpdConsultation } from "../src/models/OpdConsultation.js";

describe("OPD Consultation Model", () => {
  it("requires diagnosis and patientId", () => {
    const invalidDoc = new OpdConsultation({});
    const err = invalidDoc.validateSync();
    assert.ok(err, "Validation error expected for missing fields");
    assert.ok(err.errors.diagnosis, "diagnosis should be required");
    assert.ok(err.errors.patientId, "patientId should be required");
  });

  it("creates valid schema instance with default vitals and prescriptions array", () => {
    const valid = new OpdConsultation({
      opdCode: "OPD-2026-0001",
      patientId: "507f1f77bcf86cd799439011",
      doctorId: "507f1f77bcf86cd799439012",
      diagnosis: "Common Cold",
      prescriptions: [
        {
          medicineName: "Paracetamol",
          dosage: "500mg",
          frequency: "1-0-1",
          duration: "3 days",
        },
      ],
    });
    assert.strictEqual(valid.status, "FINALIZED");
    assert.strictEqual(valid.prescriptions.length, 1);
    assert.strictEqual(valid.prescriptions[0].instructions, "After food");
  });
});

