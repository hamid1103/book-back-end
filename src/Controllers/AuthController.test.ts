import {after, before, describe, it} from "node:test";
import assert from "node:assert/strict";
import {FastifyInstance} from "fastify";
import bcrypt from "bcrypt";
import AuthController from "./AuthController";
import {User} from "../Model/associations";
import {authHeader, buildApp} from "../test/helpers";

const jan = {id: 7, userName: "jan", email: "jan@school.nl", password: bcrypt.hashSync("secret", 4), Roles: [{title: "Teacher"}]};

describe("AuthController", () => {
    let app: FastifyInstance;
    before(async () => {
        app = await buildApp(AuthController);
    });
    after(() => app.close());

    describe("POST /login", () => {
        it("returns a token for valid details", async (t) => {
            t.mock.method(User, "findOne", async () => jan as never);

            const res = await app.inject({method: "POST", url: "/login", body: {username: "jan", password: "secret"}});

            assert.equal(res.statusCode, 200);
            assert.equal(typeof res.json().access_token, "string");
        });

        it("returns 401 for a wrong password", async (t) => {
            t.mock.method(User, "findOne", async () => jan as never);

            const res = await app.inject({method: "POST", url: "/login", body: {username: "jan", password: "wrong"}});

            assert.equal(res.statusCode, 401);
        });

        it("returns 401, not 500, for an unknown user", async (t) => {
            t.mock.method(User, "findOne", async () => null);

            const res = await app.inject({method: "POST", url: "/login", body: {username: "nobody", password: "secret"}});

            assert.equal(res.statusCode, 401);
        });

        it("returns 400 without a username or email", async () => {
            const res = await app.inject({method: "POST", url: "/login", body: {password: "secret"}});

            assert.equal(res.statusCode, 400);
        });
    });

    describe("POST /register", () => {
        it("returns 400 when the username is taken", async (t) => {
            t.mock.method(User, "findOne", async () => jan as never);

            const res = await app.inject({method: "POST", url: "/register", body: {username: "jan", password: "secret", email: "x@school.nl"}});

            assert.equal(res.statusCode, 400);
            assert.equal(res.json().message, "Username already exists");
        });
    });

    describe("GET /me", () => {
        it("returns 401 without a token", async () => {
            const res = await app.inject({method: "GET", url: "/me"});

            assert.equal(res.statusCode, 401);
        });

        it("returns 401 with an invalid token", async () => {
            const res = await app.inject({method: "GET", url: "/me", headers: {authorization: "Bearer not.a.token"}});

            assert.equal(res.statusCode, 401);
        });

        it("returns 401 when the user no longer exists", async (t) => {
            t.mock.method(User, "findByPk", async () => null);

            const res = await app.inject({method: "GET", url: "/me", headers: authHeader(7)});

            assert.equal(res.statusCode, 401);
        });

        it("returns the logged in user with their role in lowercase, and no password", async (t) => {
            t.mock.method(User, "findByPk", async () => jan as never);

            const res = await app.inject({method: "GET", url: "/me", headers: authHeader(7)});

            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.json(), {id: 7, userName: "jan", email: "jan@school.nl", role: "teacher"});
        });

        it("also accepts a token without the Bearer prefix", async (t) => {
            t.mock.method(User, "findByPk", async () => jan as never);

            const res = await app.inject({method: "GET", url: "/me", headers: {authorization: authHeader(7).authorization.replace("Bearer ", "")}});

            assert.equal(res.statusCode, 200);
        });
    });
});
