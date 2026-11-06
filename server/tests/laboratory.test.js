import { describe, it } from "node:test";
import assert from "node:assert";
import { LabTest } from "../src/models/LabTest.js";
import { LabOrder } from "../src/models/LabOrder.js";

describe("Phase 8 - Laboratory Models", () => {
  it("creates valid LabTest with standard defaults", () => {
    const test = new LabTest({
      testCode: "CBC",
      testName: "Complete Blood Count",
      category: "Hematology",
      price: 350,
    });
    assert.strictEqual(test.testCode, "CBC");
    assert.strictEqual(test.sampleType, "Blood");
    assert.strictEqual(test.status, "ACTIVE");
  });

  it("validates LabOrder lifecycle states", () => {
    const order = new LabOrder({
      orderCode: "LAB-2026-0001",
      patientId: "507f1f77bcf86cd799439011",
      doctorId: "507f1f77bcf86cd799439012",
      testId: "507f1f77bcf86cd799439013",
    });
    assert.strictEqual(order.status, "ORDERED");
    assert.strictEqual(order.priority, "ROUTINE");
  });
});

