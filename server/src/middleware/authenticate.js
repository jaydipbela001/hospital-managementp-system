import { verifyAccessToken } from "../utils/token.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/User.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  let token = null;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Authentication required. No token provided.");
  }

  try {
    const decoded = verifyAccessToken(token);
    
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      throw new ApiError(401, "User session invalid or user deleted.");
    }

    if (user.status !== "ACTIVE") {
      throw new ApiError(403, `Account is ${user.status.toLowerCase()}. Access denied.`);
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired authentication token.");
  }
});

