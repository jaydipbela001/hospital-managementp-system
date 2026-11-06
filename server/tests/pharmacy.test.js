import { describe, it } from "node:test";
import assert from "node:assert";
import { Medicine } from "../src/models/Medicine.js";
import { PharmacyDispense } from "../src/models/PharmacyDispense.js";

describe("Phase 9 - Pharmacy Models", () => {
  it("validates Medicine creation and defaults", () => {
    const med = new Medicine({
      medicineCode: "MED-001",
      name: "Paracetamol",
      category: "Analgesic",
      unitPrice: 3.5,
    });
    assert.strictEqual(med.stockQuantity, 0);
    assert.strictEqual(med.unit, "Tablet");
    assert.strictEqual(med.reorderLevel, 50);
  });

  it("validates PharmacyDispense item structure", () => {
    const dispense = new PharmacyDispense({
      dispenseCode: "PHARM-2026-0001",
      patientId: "507f1f77bcf86cd799439011",
      dispensedBy: "507f1f77bcf86cd799439012",
      items: [
        {
          medicineId: "507f1f77bcf86cd799439013",
          medicineName: "Paracetamol",
          batchNumber: "B1",
          quantity: 10,
          unitPrice: 3.5,
          subtotal: 35,
        },
      ],
      totalAmount: 35,
    });
    assert.strictEqual(dispense.status, "DISPENSED");
    assert.strictEqual(dispense.items.length, 1);
    assert.strictEqual(dispense.totalAmount, 35);
  });
});

