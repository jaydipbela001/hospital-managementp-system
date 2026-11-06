import { ApiError } from "../utils/ApiError.js";

/**
 * Authorize allows access if the authenticated user's role is in the allowedRoles list.
 * Super Admin always has full access.
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (req.user.role === "SUPER_ADMIN" || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return next(new ApiError(403, `Access forbidden. Role '${req.user.role}' is not authorized.`));
  };
};

