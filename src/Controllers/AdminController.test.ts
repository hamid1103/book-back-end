import {after, before, describe, it} from "node:test";
import assert from "node:assert/strict";
import {FastifyInstance} from "fastify";
import AdminController from "./AdminController";
import {User, Role, UserRole} from "../Model/associations";
import {authHeader, buildApp} from "../test/helpers";

const ADMIN_ID = 1;
const STUDENT_ID = 2;

//Fake users table. Roles are sorted newest first, like the real queries return them
const users: Record<number, {id: number, userName: string, email: string, Roles: {title: string}[]}> = {
    [ADMIN_ID]: {id: ADMIN_ID, userName: "admin", email: "admin@school.nl", Roles: [{title: "Admin"}]},
    [STUDENT_ID]: {id: STUDENT_ID, userName: "jan", email: "jan@school.nl", Roles: []},
};

describe("AdminController", () => {
    let app: FastifyInstance;
    before(async () => {
        app = await buildApp(AdminController);
    });
    after(() => app.close());

    function mockUsers(t: {mock: typeof import("node:test").mock}) {
        t.mock.method(User, "findByPk", async (id: number | string) => (users[Number(id)] ?? null) as never);
    }

    describe("GET /users", () => {
        it("returns 401 without a token", async () => {
            const res = await app.inject({method: "GET", url: "/users"});

            assert.equal(res.statusCode, 401);
        });

        it("returns 403 for a non-admin", async (t) => {
            mockUsers(t);

            const res = await app.inject({method: "GET", url: "/users", headers: authHeader(STUDENT_ID)});

            assert.equal(res.statusCode, 403);
        });

        it("returns every user with their active role, Student when they have none", async (t) => {
            mockUsers(t);
            t.mock.method(User, "findAll", async () => Object.values(users) as never);

            const res = await app.inject({method: "GET", url: "/users", headers: authHeader(ADMIN_ID)});

            assert.equal(res.statusCode, 200);
            assert.deepEqual(res.json(), [
                {id: ADMIN_ID, userName: "admin", email: "admin@school.nl", role: "admin"},
                {id: STUDENT_ID, userName: "jan", email: "jan@school.nl", role: "student"},
            ]);
        });

        it("only filters when ?q= is given", async (t) => {
            mockUsers(t);
            const findAll = t.mock.method(User, "findAll", async () => [] as never);

            await app.inject({method: "GET", url: "/users", headers: authHeader(ADMIN_ID)});
            await app.inject({method: "GET", url: "/users?q=jan", headers: authHeader(ADMIN_ID)});

            assert.equal(findAll.mock.calls[0].arguments[0]?.where, undefined);
            assert.notEqual(findAll.mock.calls[1].arguments[0]?.where, undefined);
        });
    });

    describe("PUT /users/:userId/role", () => {
        it("assigns the role", async (t) => {
            mockUsers(t);
            t.mock.method(Role, "findOne", async () => ({id: 2}) as never);
            const upsert = t.mock.method(UserRole, "upsert", async () => [{}, null] as never);

            const res = await app.inject({method: "PUT", url: `/users/${STUDENT_ID}/role`, headers: authHeader(ADMIN_ID), body: {role: "teacher"}});

            assert.equal(res.statusCode, 200);
            assert.equal((upsert.mock.calls[0].arguments[0] as {userId: number}).userId, STUDENT_ID);
        });

        it("doesn't let an admin change their own role", async (t) => {
            mockUsers(t);

            const res = await app.inject({method: "PUT", url: `/users/${ADMIN_ID}/role`, headers: authHeader(ADMIN_ID), body: {role: "student"}});

            assert.equal(res.statusCode, 400);
        });

        it("returns 404 for an unknown user", async (t) => {
            mockUsers(t);

            const res = await app.inject({method: "PUT", url: "/users/999/role", headers: authHeader(ADMIN_ID), body: {role: "teacher"}});

            assert.equal(res.statusCode, 404);
        });

        it("returns 400 for an unknown role", async (t) => {
            mockUsers(t);

            const res = await app.inject({method: "PUT", url: `/users/${STUDENT_ID}/role`, headers: authHeader(ADMIN_ID), body: {role: "principal"}});

            assert.equal(res.statusCode, 400);
        });

        it("returns 403 for a non-admin", async (t) => {
            mockUsers(t);

            const res = await app.inject({method: "PUT", url: `/users/${ADMIN_ID}/role`, headers: authHeader(STUDENT_ID), body: {role: "student"}});

            assert.equal(res.statusCode, 403);
        });
    });
});
