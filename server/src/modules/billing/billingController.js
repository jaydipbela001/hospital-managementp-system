import { Invoice } from "../../models/Invoice.js";
import { Payment } from "../../models/Payment.js";
import { ApiError } from "../../utils/ApiError.js";

// Generates sequential invoice code e.g. INV-2026-0001
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await Invoice.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("invoiceNumber");

  if (!latest) return `${prefix}0001`;
  const parts = latest.invoiceNumber.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// Generates sequential receipt code e.g. REC-2026-0001
const generateReceiptNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;
  const latest = await Payment.findOne({ receiptNumber: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("receiptNumber");

  if (!latest) return `${prefix}0001`;
  const parts = latest.receiptNumber.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// GET /api/billing/invoices
export const getInvoices = async (req, res, next) => {
  try {
    const { patientId, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate("patientId", "name patientCode phone")
        .populate("issuedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Invoice.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/billing/invoices
export const createInvoice = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      ipdAdmissionId,
      items,
      discount = 0,
      tax = 0,
      notes = "",
    } = req.body;

    if (!patientId) {
      throw new ApiError(400, "Patient ID is required");
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "At least one line item is required");
    }

    // Calculate totals server-side
    const subtotal = items.reduce((acc, item) => {
      const lineSubtotal = Number(item.unitPrice || 0) * Number(item.quantity || 1);
      item.subtotal = lineSubtotal;
      return acc + lineSubtotal;
    }, 0);

    const totalAmount = Math.max(0, subtotal - Number(discount) + Number(tax));
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      appointmentId: appointmentId || null,
      ipdAdmissionId: ipdAdmissionId || null,
      items,
      subtotal,
      discount: Number(discount),
      tax: Number(tax),
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: totalAmount === 0 ? "PAID" : "PENDING",
      issuedBy: req.user?._id || null,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/billing/invoices/:id
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("patientId", "name patientCode phone email")
      .populate("issuedBy", "name");

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const payments = await Payment.find({ invoiceId: invoice._id })
      .populate("receivedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        invoice,
        payments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/billing/invoices/:id/payments
export const recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionReference = "", notes = "" } = req.body;

    if (!amount || Number(amount) <= 0) {
      throw new ApiError(400, "Payment amount must be greater than zero");
    }

    const validMethods = ["CASH", "CARD", "UPI", "INSURANCE", "STRIPE"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      throw new ApiError(400, `Payment method must be one of: ${validMethods.join(", ")}`);
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new ApiError(400, "Invoice is already fully paid");
    }

    const payAmount = Number(amount);
    if (payAmount > invoice.balanceAmount) {
      throw new ApiError(400, `Amount exceeds remaining balance of ${invoice.balanceAmount}`);
    }

    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      receiptNumber,
      invoiceId: invoice._id,
      patientId: invoice.patientId,
      amount: payAmount,
      paymentMethod,
      transactionReference,
      status: "SUCCESS",
      receivedBy: req.user?._id || null,
      notes,
    });

    // Update invoice paid and balance amounts
    invoice.paidAmount += payAmount;
    invoice.balanceAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    invoice.status = invoice.balanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";
    await invoice.save();

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

