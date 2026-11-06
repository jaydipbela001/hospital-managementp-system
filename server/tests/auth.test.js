import test from "node:test";
import assert from "node:assert/strict";
import { generateTokens, verifyAccessToken, verifyRefreshToken } from "../src/utils/token.js";
import { authorize } from "../src/middleware/authorize.js";
import ApiError from "../src/utils/ApiError.js";

test("Token utility: generates valid access and refresh tokens", () => {
  const payload = { id: "user123", role: "DOCTOR", email: "doc@hospital.local" };
  const { accessToken, refreshToken } = generateTokens(payload);

  assert.ok(accessToken);
  assert.ok(refreshToken);

  const decodedAccess = verifyAccessToken(accessToken);
  assert.equal(decodedAccess.id, "user123");
  assert.equal(decodedAccess.role, "DOCTOR");

  const decodedRefresh = verifyRefreshToken(refreshToken);
  assert.equal(decodedRefresh.id, "user123");
});

test("Authorize middleware: allows matching role and blocks forbidden role", () => {
  const doctorMiddleware = authorize("DOCTOR");

  // 1. Unauthenticated request
  doctorMiddleware({}, {}, (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.statusCode, 401);
  });

  // 2. Super Admin always allowed
  let calledNext = false;
  doctorMiddleware({ user: { role: "SUPER_ADMIN" } }, {}, (err) => {
    assert.equal(err, undefined);
    calledNext = true;
  });
  assert.equal(calledNext, true);

  // 3. Authorized matching role allowed
  let docCalledNext = false;
  doctorMiddleware({ user: { role: "DOCTOR" } }, {}, (err) => {
    assert.equal(err, undefined);
    docCalledNext = true;
  });
  assert.equal(docCalledNext, true);

  // 4. Forbidden role returns 403
  doctorMiddleware({ user: { role: "PATIENT" } }, {}, (err) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.statusCode, 403);
  });
});

