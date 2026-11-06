import { LabTest } from "../../models/LabTest.js";
import { LabOrder } from "../../models/LabOrder.js";
import { Patient } from "../../models/Patient.js";
import { ApiError } from "../../utils/ApiError.js";

const generateLabOrderCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `LAB-${year}-`;
  const latest = await LabOrder.findOne({ orderCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("orderCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.orderCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// --- TEST CATALOGUE ---
export const getLabTests = async (req, res, next) => {
  try {
    let tests = await LabTest.find({ status: "ACTIVE" }).sort({ category: 1, testName: 1 });

    // Seed default standard tests if catalogue is empty
    if (tests.length === 0) {
      const standardTests = [
        { testCode: "CBC", testName: "Complete Blood Count (CBC)", category: "Hematology", price: 350, sampleType: "Blood", normalRange: "Reference range varies", unit: "" },
        { testCode: "FBS", testName: "Fasting Blood Sugar", category: "Biochemistry", price: 120, sampleType: "Blood", normalRange: "70-100", unit: "mg/dL" },
        { testCode: "LIPID", testName: "Lipid Profile", category: "Biochemistry", price: 650, sampleType: "Blood", normalRange: "Desirable < 200", unit: "mg/dL" },
        { testCode: "LFT", testName: "Liver Function Test", category: "Biochemistry", price: 700, sampleType: "Blood", normalRange: "Standard Panel", unit: "U/L" },
        { testCode: "KFT", testName: "Kidney Function Test / Creatinine", category: "Biochemistry", price: 500, sampleType: "Blood", normalRange: "0.7 - 1.3", unit: "mg/dL" },
        { testCode: "URINE", testName: "Urine Routine & Microscopic", category: "Clinical Pathology", price: 180, sampleType: "Urine", normalRange: "Clear / Normal", unit: "" },
        { testCode: "THYROID", testName: "Thyroid Profile (T3, T4, TSH)", category: "Biochemistry", price: 550, sampleType: "Blood", normalRange: "0.4 - 4.0", unit: "mIU/L" },
      ];
      await LabTest.insertMany(standardTests);
      tests = await LabTest.find({ status: "ACTIVE" }).sort({ category: 1, testName: 1 });
    }

    res.status(200).json({ success: true, data: tests });
  } catch (err) {
    next(err);
  }
};

export const createLabTest = async (req, res, next) => {
  try {
    const { testCode, testName, category, price, sampleType, normalRange, unit } = req.body;
    if (!testCode || !testName || !category || price === undefined) {
      throw new ApiError(400, "testCode, testName, category, and price are required.");
    }

    const exists = await LabTest.findOne({ testCode: testCode.toUpperCase() });
    if (exists) throw new ApiError(409, "A test with this code already exists.");

    const test = await LabTest.create({
      testCode: testCode.toUpperCase(),
      testName,
      category,
      price,
      sampleType: sampleType || "Blood",
      normalRange: normalRange || "",
      unit: unit || "",
    });

    res.status(201).json({ success: true, message: "Lab test created successfully.", data: test });
  } catch (err) {
    next(err);
  }
};

// --- LAB ORDERS WORKFLOW ---
export const getLabOrders = async (req, res, next) => {
  try {
    const { status, patientId, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== "ALL") filter.status = status;
    if (patientId) filter.patientId = patientId;

    if (req.user.role === "DOCTOR") {
      filter.doctorId = req.user.id || req.user._id;
    }
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
      filter.patientId = patient._id;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [orders, total] = await Promise.all([
      LabOrder.find(filter)
        .populate("patientId", "name patientCode phone gender bloodGroup dateOfBirth")
        .populate("doctorId", "name email")
        .populate("testId", "testCode testName category price sampleType normalRange unit")
        .populate("result.enteredBy", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      LabOrder.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      meta: { page: parseInt(page, 10), limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
};

export const createLabOrder = async (req, res, next) => {
  try {
    const { patientId, testId, priority, clinicalNotes } = req.body;
    if (!patientId || !testId) {
      throw new ApiError(400, "patientId and testId are required.");
    }

    const doctorId = req.user.role === "DOCTOR" ? (req.user.id || req.user._id) : req.body.doctorId;
    if (!doctorId) {
      throw new ApiError(400, "doctorId is required.");
    }

    const test = await LabTest.findById(testId);
    if (!test) throw new ApiError(404, "Lab test not found.");

    const orderCode = await generateLabOrderCode();

    const order = await LabOrder.create({
      orderCode,
      patientId,
      doctorId,
      testId,
      priority: priority || "ROUTINE",
      clinicalNotes: clinicalNotes || "",
      status: "ORDERED",
    });

    const populated = await LabOrder.findById(order._id)
      .populate("patientId", "name patientCode phone gender")
      .populate("doctorId", "name")
      .populate("testId", "testCode testName price sampleType");

    res.status(201).json({
      success: true,
      message: "Diagnostic lab test ordered successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resultValue, interpretation } = req.body;

    const allowed = ["ORDERED", "SAMPLE_COLLECTED", "IN_ANALYSIS", "COMPLETED", "CANCELLED"];
    if (!allowed.includes(status)) {
      throw new ApiError(400, "Invalid lab order status.");
    }

    const order = await LabOrder.findById(id);
    if (!order) throw new ApiError(404, "Lab order not found.");

    // Only Lab Techs & Admins can enter results or collect samples
    if (["SAMPLE_COLLECTED", "IN_ANALYSIS", "COMPLETED"].includes(status)) {
      if (!["LAB_TECHNICIAN", "SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(req.user.role)) {
        throw new ApiError(403, "Only authorized laboratory personnel can process lab samples or enter results.");
      }
    }

    order.status = status;

    if (status === "SAMPLE_COLLECTED" && !order.sampleCollectedAt) {
      order.sampleCollectedAt = new Date();
    }

    if (status === "COMPLETED") {
      if (!resultValue && !order.result.resultValue) {
        throw new ApiError(400, "resultValue is required to complete and release lab report.");
      }
      order.result = {
        resultValue: resultValue || order.result.resultValue,
        interpretation: interpretation || order.result.interpretation || "Verified and Released",
        enteredBy: req.user.id || req.user._id,
        verifiedAt: new Date(),
      };
    }

    await order.save();

    const populated = await LabOrder.findById(order._id)
      .populate("patientId", "name patientCode phone gender bloodGroup")
      .populate("doctorId", "name")
      .populate("testId", "testCode testName price sampleType normalRange unit")
      .populate("result.enteredBy", "name role");

    res.status(200).json({
      success: true,
      message: `Lab order updated to ${status}.`,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

