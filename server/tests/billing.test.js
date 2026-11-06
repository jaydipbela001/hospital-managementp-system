import { describe, it } from "node:test";
import assert from "node:assert";
import { Invoice } from "../src/models/Invoice.js";
import { Payment, PAYMENT_METHODS } from "../src/models/Payment.js";

describe("Phase 10 - Billing Models & Payment Methods", () => {
  it("validates Invoice creation, defaults, and line items", () => {
    const invoice = new Invoice({
      invoiceNumber: "INV-2026-0001",
      patientId: "507f1f77bcf86cd799439011",
      items: [
        {
          description: "General Consultation",
          category: "CONSULTATION",
          quantity: 1,
          unitPrice: 50,
          subtotal: 50,
        },
      ],
      subtotal: 50,
      totalAmount: 50,
      balanceAmount: 50,
    });

    assert.strictEqual(invoice.invoiceNumber, "INV-2026-0001");
    assert.strictEqual(invoice.status, "PENDING");
    assert.strictEqual(invoice.paidAmount, 0);
    assert.strictEqual(invoice.items.length, 1);
    assert.strictEqual(invoice.items[0].category, "CONSULTATION");
  });

  it("supports all requested payment methods [CASH, CARD, UPI, INSURANCE] and optional reference", () => {
    const requestedMethods = ["CASH", "CARD", "UPI", "INSURANCE"];
    for (const method of requestedMethods) {
      assert.ok(PAYMENT_METHODS.includes(method), `Method ${method} must be in PAYMENT_METHODS`);
    }

    // CASH payment with no reference
    const cashPayment = new Payment({
      receiptNumber: "REC-2026-0001",
      invoiceId: "507f1f77bcf86cd799439020",
      patientId: "507f1f77bcf86cd799439011",
      amount: 100,
      paymentMethod: "CASH",
    });
    assert.strictEqual(cashPayment.paymentMethod, "CASH");
    assert.strictEqual(cashPayment.transactionReference, "");

    // UPI payment with transaction reference
    const upiPayment = new Payment({
      receiptNumber: "REC-2026-0002",
      invoiceId: "507f1f77bcf86cd799439020",
      patientId: "507f1f77bcf86cd799439011",
      amount: 250,
      paymentMethod: "UPI",
      transactionReference: "UPI-REF-894723894",
    });
    assert.strictEqual(upiPayment.paymentMethod, "UPI");
    assert.strictEqual(upiPayment.transactionReference, "UPI-REF-894723894");
    assert.strictEqual(upiPayment.status, "SUCCESS");

    // CARD payment with POS approval code
    const cardPayment = new Payment({
      receiptNumber: "REC-2026-0003",
      invoiceId: "507f1f77bcf86cd799439020",
      patientId: "507f1f77bcf86cd799439011",
      amount: 500,
      paymentMethod: "CARD",
      transactionReference: "POS-AUTH-112233",
    });
    assert.strictEqual(cardPayment.paymentMethod, "CARD");
    assert.strictEqual(cardPayment.transactionReference, "POS-AUTH-112233");

    // INSURANCE claim payment
    const insPayment = new Payment({
      receiptNumber: "REC-2026-0004",
      invoiceId: "507f1f77bcf86cd799439020",
      patientId: "507f1f77bcf86cd799439011",
      amount: 1500,
      paymentMethod: "INSURANCE",
      transactionReference: "CLAIM-POL-554433",
    });
    assert.strictEqual(insPayment.paymentMethod, "INSURANCE");
    assert.strictEqual(insPayment.transactionReference, "CLAIM-POL-554433");
  });
});
