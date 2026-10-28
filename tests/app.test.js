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
  const queries = [];
  const database = {
    query: async (sql) => {
      queries.push(sql);
      return { rows: [{ id: 8, email: "nageur@example.test" }] };
    },
  };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "ligne_eau_session=valid-test-token",
      },
      body: JSON.stringify({ level: "expert", goal: "endurance", duration: 45, stroke: "crawl" }),
    });
    assert.equal(response.status, 400);
    assert.equal(queries.length, 1);
  });
});

test("session history is unavailable without an account session", async () => {
  const database = { query: async () => { throw new Error("No database query expected"); } };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions`);
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /Connecte-toi/);
  });
});

test("session history queries are scoped to the authenticated user", async () => {
  const queries = [];
  const database = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      return queries.length === 1
        ? { rows: [{ id: 27, email: "nageur@example.test" }] }
        : { rows: [] };
    },
  };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions`, {
      headers: { Cookie: "ligne_eau_session=valid-test-token" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    assert.match(queries[1].sql, /WHERE user_id = \$1/);
    assert.deepEqual(queries[1].values, [27]);
  });
});

test("registration creates a hashed-password account and an HttpOnly session cookie", async () => {
  const queries = [];
  const database = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      if (sql.startsWith("INSERT INTO swim_users")) {
        return { rows: [{ id: 12, email: values[0] }] };
      }
      return { rows: [] };
    },
  };

  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: " Nageur@Example.test ", password: "motdepasse-securise" }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual((await response.json()).user, { id: 12, email: "nageur@example.test" });
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
    assert.equal(queries.length, 2);
    assert.match(queries[0].values[1], /^scrypt\$/);
    assert.notEqual(queries[0].values[1], "motdepasse-securise");
  });
});