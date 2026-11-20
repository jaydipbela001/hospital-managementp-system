import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import { generateTokens } from "../../utils/token.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// Cookie options for secure production and development environments
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = asyncHandler(async (req, res) => {
  // 1. Destructure values from req.body
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required.");
  }

  // 2. Find user in database (supporting common aliases e.g. receptionist@, doctor@, patient@)
  let normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail === "receptionist@hospital.local") {
    normalizedEmail = "reception@hospital.local";
  } else if (normalizedEmail === "doctor@hospital.local") {
    normalizedEmail = "doctor1@hospital.local";
  } else if (normalizedEmail === "patient@hospital.local") {
    normalizedEmail = "patient1@hospital.local";
  }
  const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  // 3. Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  // 4. Validate user status
  if (user.status !== "ACTIVE") {
    throw new ApiError(403, `Account is ${user.status.toLowerCase()}. Contact administration.`);
  }

  // 5. Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  // 6. Generate session tokens
  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  };

  const { accessToken, refreshToken } = generateTokens(payload);

  // 7. Set HTTP-only cookie
  res.cookie("token", accessToken, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token: accessToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  // 1. Check if user identifier exists from authenticated session or request body/params
  const userId = req.user?.id || req.body?.userId;

  if (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }
  }

  // 2. Clear cookie
  res.clearCookie("token", cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

export const registerPatient = asyncHandler(async (req, res) => {
  const { name, email, password, phone, gender, bloodGroup, dateOfBirth, address } = req.body;

  if (!name || !email || !password || !phone) {
    throw new ApiError(400, "Name, email, password, and phone number are required.");
  }

  // Check existing user
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create User with PATIENT role
  const newUser = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    passwordHash,
    role: "PATIENT",
    status: "ACTIVE",
  });

  // Generate unique patient code
  const year = new Date().getFullYear();
  const prefix = `PAT-${year}-`;
  const latestPatient = await mongoose.model("Patient").findOne({ patientCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("patientCode");
  let nextCode = `${prefix}0001`;
  if (latestPatient) {
    const parts = latestPatient.patientCode.split("-");
    const nextNum = parseInt(parts[2], 10) + 1;
    nextCode = `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  // Create linked Patient profile
  const patientProfile = await mongoose.model("Patient").create({
    patientCode: nextCode,
    userId: newUser._id,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    gender: gender || "OTHER",
    bloodGroup: bloodGroup || "UNKNOWN",
    dateOfBirth: dateOfBirth || null,
    address: address || "",
  });

  // Generate tokens for immediate login
  const payload = {
    id: newUser._id.toString(),
    role: newUser.role,
    email: newUser.email,
  };
  const { accessToken } = generateTokens(payload);
  res.cookie("token", accessToken, cookieOptions);

  return res.status(201).json({
    success: true,
    message: "Patient account registered successfully",
    data: {
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        patientId: patientProfile._id.toString(),
        patientCode: patientProfile.patientCode,
      },
      token: accessToken,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  // 1. Destructure user identifier from authenticated request (or body/query fallback)
  const userId = req.user?.id || req.body?.userId || req.query?.userId;

  if (!userId) {
    throw new ApiError(401, "Unauthorized. User ID is required.");
  }

  // 2. Find user inside database
  const user = await User.findById(userId).select("-passwordHash").lean();

  // 3. If user not found, throw error
  if (!user) {
    throw new ApiError(404, "User not found in system.");
  }

  // 4. Return clean structured response
  return res.status(200).json({
    success: true,
    message: "Current user profile fetched successfully",
    data: {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    },
  });
});
