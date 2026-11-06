import { describe, it } from "node:test";
import assert from "node:assert";
import { Bed } from "../src/models/Bed.js";
import { IpdAdmission } from "../src/models/IpdAdmission.js";

describe("Phase 7 - IPD Models", () => {
  it("validates Bed creation and default status", () => {
    const bed = new Bed({
      bedNumber: "B1",
      ward: "General",
      roomNumber: "101",
    });
    assert.strictEqual(bed.status, "AVAILABLE");
    assert.strictEqual(bed.dailyRate, 500);
  });

  it("validates IpdAdmission status and careNotes", () => {
    const adm = new IpdAdmission({
      admissionCode: "IPD-2026-0001",
      patientId: "507f1f77bcf86cd799439011",
      doctorId: "507f1f77bcf86cd799439012",
      bedId: "507f1f77bcf86cd799439013",
      admissionReason: "Severe Bronchitis",
    });
    assert.strictEqual(adm.status, "ADMITTED");
    assert.strictEqual(Array.isArray(adm.careNotes), true);
  });
});

