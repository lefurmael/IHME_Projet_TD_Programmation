import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

import { createApp } from "../server/app.js";

async function withServer(database, callback) {
  const server = createServer(createApp(database));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("health endpoint checks the configured database", async () => {
  const database = { query: async () => ({ rows: [{ result: 1 }] }) };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("invalid session criteria are rejected without database writes", async () => {
  let writeCount = 0;
  const database = { query: async () => { writeCount += 1; return { rows: [] }; } };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: "expert", goal: "endurance", duration: 45, stroke: "crawl" }),
    });
    assert.equal(response.status, 400);
    assert.equal(writeCount, 0);
  });
});