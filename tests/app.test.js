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

test("private session and test routes are unavailable without an account session", async () => {
  const database = { query: async () => { throw new Error("No database query expected"); } };
  await withServer(database, async (baseUrl) => {
    for (const route of ["/api/sessions", "/api/tests"]) {
      const response = await fetch(`${baseUrl}${route}`);
      assert.equal(response.status, 401);
      assert.match((await response.json()).error, /Connecte-toi/);
    }
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

test("a session can only be deleted from the authenticated user's history", async () => {
  const queries = [];
  const database = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      return queries.length === 1
        ? { rows: [{ id: 27, email: "nageur@example.test" }] }
        : { rows: [{ id: "91" }], rowCount: 1 };
    },
  };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/sessions/91`, {
      method: "DELETE",
      headers: { Cookie: "ligne_eau_session=valid-test-token" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { deleted: true });
    assert.match(queries[1].sql, /WHERE id = \$1 AND user_id = \$2/);
    assert.deepEqual(queries[1].values, ["91", 27]);
  });
});

test("swim test history is scoped to the authenticated user", async () => {
  const queries = [];
  const database = {
    query: async (sql, values) => {
      queries.push({ sql, values });
      return queries.length === 1
        ? { rows: [{ id: 27, email: "nageur@example.test" }] }
        : { rows: [{ id: "5", distance: 200, elapsed_seconds: 135 }] };
    },
  };
  await withServer(database, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tests`, {
      headers: { Cookie: "ligne_eau_session=valid-test-token" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [{ id: "5", distance: 200, elapsed_seconds: 135 }]);
    assert.match(queries[1].sql, /FROM swim_tests WHERE user_id = \$1/);
    assert.deepEqual(queries[1].values, [27]);
  });
});

test("swim tests validate input and save the user's timed result", async () => {
  let writeQuery = null;
  const database = {
    query: async (sql, values) => {
      if (sql.includes("FROM auth_sessions")) {
        return { rows: [{ id: 27, email: "nageur@example.test" }] };
      }
      writeQuery = { sql, values };
      return { rows: [{ id: "6", user_id: 27, distance: 400, elapsed_seconds: 365 }] };
    },
  };
  await withServer(database, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "ligne_eau_session=valid-test-token",
      },
      body: JSON.stringify({ distance: 100, elapsedSeconds: 100 }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(writeQuery, null);

    const response = await fetch(`${baseUrl}/api/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "ligne_eau_session=valid-test-token",
      },
      body: JSON.stringify({ distance: 400, elapsedSeconds: 365 }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: "6", user_id: 27, distance: 400, elapsed_seconds: 365 });
    assert.match(writeQuery.sql, /INSERT INTO swim_tests \(user_id, distance, elapsed_seconds\)/);
    assert.deepEqual(writeQuery.values, [27, 400, 365]);
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