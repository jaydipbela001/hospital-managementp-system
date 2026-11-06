import { Medicine } from "../../models/Medicine.js";
import { PharmacyDispense } from "../../models/PharmacyDispense.js";
import { Patient } from "../../models/Patient.js";
import { ApiError } from "../../utils/ApiError.js";

const generateDispenseCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `PHARM-${year}-`;
  const latest = await PharmacyDispense.findOne({ dispenseCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("dispenseCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.dispenseCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// --- MEDICINES CATALOGUE & INVENTORY ---
export const getMedicines = async (req, res, next) => {
  try {
    let medicines = await Medicine.find().sort({ name: 1 });

    // Seed default common medications if inventory is empty
    if (medicines.length === 0) {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

      const standardMedicines = [
        {
          medicineCode: "MED-001",
          name: "Paracetamol 500mg",
          genericName: "Acetaminophen",
          category: "Antipyretic / Analgesic",
          unit: "Tablet",
          unitPrice: 3.5,
          stockQuantity: 500,
          reorderLevel: 100,
          batches: [{ batchNumber: "B-PCM-01", expiryDate: oneYearLater, quantity: 500, purchasePrice: 2.0 }],
        },
        {
          medicineCode: "MED-002",
          name: "Amoxicillin 500mg",
          genericName: "Amoxicillin Trihydrate",
          category: "Antibiotic",
          unit: "Capsule",
          unitPrice: 12.0,
          stockQuantity: 250,
          reorderLevel: 50,
          batches: [{ batchNumber: "B-AMX-01", expiryDate: oneYearLater, quantity: 250, purchasePrice: 8.5 }],
        },
        {
          medicineCode: "MED-003",
          name: "Azithromycin 500mg",
          genericName: "Azithromycin",
          category: "Antibiotic",
          unit: "Tablet",
          unitPrice: 25.0,
          stockQuantity: 180,
          reorderLevel: 40,
          batches: [{ batchNumber: "B-AZI-01", expiryDate: oneYearLater, quantity: 180, purchasePrice: 18.0 }],
        },
        {
          medicineCode: "MED-004",
          name: "Pantoprazole 40mg",
          genericName: "Pantoprazole Sodium",
          category: "Antacid / PPI",
          unit: "Tablet",
          unitPrice: 9.0,
          stockQuantity: 320,
          reorderLevel: 60,
          batches: [{ batchNumber: "B-PAN-01", expiryDate: oneYearLater, quantity: 320, purchasePrice: 6.0 }],
        },
        {
          medicineCode: "MED-005",
          name: "Cetirizine 10mg",
          genericName: "Cetirizine Hydrochloride",
          category: "Antihistamine",
          unit: "Tablet",
          unitPrice: 4.0,
          stockQuantity: 400,
          reorderLevel: 80,
          batches: [{ batchNumber: "B-CET-01", expiryDate: oneYearLater, quantity: 400, purchasePrice: 2.5 }],
        },
      ];
      await Medicine.insertMany(standardMedicines);
      medicines = await Medicine.find().sort({ name: 1 });
    }

    res.status(200).json({ success: true, data: medicines });
  } catch (err) {
    next(err);
  }
};

export const createMedicine = async (req, res, next) => {
  try {
    const { medicineCode, name, genericName, category, unit, unitPrice, reorderLevel, batchNumber, expiryDate, quantity } = req.body;

    if (!medicineCode || !name || !category || unitPrice === undefined) {
      throw new ApiError(400, "medicineCode, name, category, and unitPrice are required.");
    }

    const exists = await Medicine.findOne({ medicineCode: medicineCode.toUpperCase() });
    if (exists) throw new ApiError(409, "Medicine code already exists.");

    const initialQuantity = parseInt(quantity, 10) || 0;
    const batches = [];
    if (batchNumber && expiryDate && initialQuantity > 0) {
      batches.push({
        batchNumber,
        expiryDate: new Date(expiryDate),
        quantity: initialQuantity,
        purchasePrice: req.body.purchasePrice || 0,
      });
    }

    const med = await Medicine.create({
      medicineCode: medicineCode.toUpperCase(),
      name,
      genericName: genericName || "",
      category,
      unit: unit || "Tablet",
      unitPrice,
      reorderLevel: reorderLevel || 50,
      stockQuantity: initialQuantity,
      batches,
    });

    res.status(201).json({ success: true, message: "Medicine added to inventory.", data: med });
  } catch (err) {
    next(err);
  }
};

export const addStockBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { batchNumber, expiryDate, quantity, purchasePrice } = req.body;

    const qty = parseInt(quantity, 10);
    if (!batchNumber || !expiryDate || !qty || qty <= 0) {
      throw new ApiError(400, "batchNumber, valid expiryDate, and positive quantity are required.");
    }

    const med = await Medicine.findById(id);
    if (!med) throw new ApiError(404, "Medicine not found.");

    med.batches.push({
      batchNumber,
      expiryDate: new Date(expiryDate),
      quantity: qty,
      purchasePrice: purchasePrice || 0,
    });
    med.stockQuantity += qty;

    await med.save();

    res.status(200).json({
      success: true,
      message: `Added batch ${batchNumber} with ${qty} units to inventory.`,
      data: med,
    });
  } catch (err) {
    next(err);
  }
};

// --- DISPENSING WORKFLOW ---
export const getDispenses = async (req, res, next) => {
  try {
    const { patientId, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;

    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
      filter.patientId = patient._id;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [dispenses, total] = await Promise.all([
      PharmacyDispense.find(filter)
        .populate("patientId", "name patientCode phone gender")
        .populate("prescribedBy", "name")
        .populate("dispensedBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      PharmacyDispense.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: dispenses,
      meta: { page: parseInt(page, 10), limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
};

export const dispenseMedicines = async (req, res, next) => {
  try {
    const { patientId, prescribedBy, items, remarks } = req.body;

    if (!patientId || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, "patientId and at least one item to dispense are required.");
    }

    const patient = await Patient.findById(patientId);
    if (!patient) throw new ApiError(404, "Patient not found.");

    const now = new Date();
    const processedItems = [];
    let grandTotal = 0;

    // Validate inventory and deduct stock per item
    for (const item of items) {
      const { medicineId, quantity } = item;
      const qty = parseInt(quantity, 10);

      if (!medicineId || !qty || qty <= 0) {
        throw new ApiError(400, "Invalid medicine selection or quantity.");
      }

      const medicine = await Medicine.findById(medicineId);
      if (!medicine) throw new ApiError(404, `Medicine ID ${medicineId} not found.`);

      if (medicine.stockQuantity < qty) {
        throw new ApiError(400, `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}, Requested: ${qty}`);
      }

      // Check available non-expired batch (FIFO by earliest expiry)
      const validBatches = medicine.batches
        .filter((b) => new Date(b.expiryDate).getTime() > now.getTime() && b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      if (validBatches.length === 0) {
        throw new ApiError(400, `All current stock batches for ${medicine.name} are expired or depleted.`);
      }

      let remainingToDeduct = qty;
      let usedBatch = "";

      for (const batch of validBatches) {
        if (remainingToDeduct === 0) break;
        const take = Math.min(batch.quantity, remainingToDeduct);
        batch.quantity -= take;
        remainingToDeduct -= take;
        usedBatch = batch.batchNumber;
      }

      if (remainingToDeduct > 0) {
        throw new ApiError(400, `Not enough non-expired units available for ${medicine.name}.`);
      }

      medicine.stockQuantity -= qty;
      await medicine.save();

      const subtotal = qty * medicine.unitPrice;
      grandTotal += subtotal;

      processedItems.push({
        medicineId: medicine._id,
        medicineName: medicine.name,
        batchNumber: usedBatch,
        quantity: qty,
        unitPrice: medicine.unitPrice,
        subtotal,
      });
    }

    const dispenseCode = await generateDispenseCode();

    const dispense = await PharmacyDispense.create({
      dispenseCode,
      patientId,
      prescribedBy: prescribedBy || null,
      dispensedBy: req.user.id || req.user._id,
      items: processedItems,
      totalAmount: grandTotal,
      remarks: remarks || "",
      status: "DISPENSED",
    });

    const populated = await PharmacyDispense.findById(dispense._id)
      .populate("patientId", "name patientCode phone")
      .populate("dispensedBy", "name");

    res.status(201).json({
      success: true,
      message: "Medicines dispensed and inventory updated successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

