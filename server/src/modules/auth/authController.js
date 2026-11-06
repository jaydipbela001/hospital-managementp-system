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

  // 2. Find user in database
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
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
