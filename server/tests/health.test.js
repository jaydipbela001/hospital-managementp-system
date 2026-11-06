import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("GET /api/health returns 200 and success status", async () => {
  const server = app.listen(0);
  const address = server.address();
  const port = address.port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.message, "API is healthy");
  } finally {
    server.close();
  }
});

