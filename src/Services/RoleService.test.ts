import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {FastifyRequest} from "fastify";
import {assignRole, getUserRole, parseRoleTitle, requireRole, RoleTitle, seedRoles} from "./RoleService";
import {User, Role, UserRole} from "../Model/associations";
import ForbiddenError from "../Types/Errors/ForbiddenError";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";

//A user as getUserRole's query returns it: Roles are already sorted newest first
function userWithRoles(...titles: string[]) {
    return {id: 1, Roles: titles.map(title => ({title}))} as never;
}

function requestFrom(userid?: string) {
    return {user: userid ? {userid, username: "user"} : undefined} as FastifyRequest;
}

describe("parseRoleTitle", () => {
    it("ignores casing", () => {
        assert.equal(parseRoleTitle("teacher"), RoleTitle.Teacher);
        assert.equal(parseRoleTitle("ADMIN"), RoleTitle.Admin);
        assert.equal(parseRoleTitle("Student"), RoleTitle.Student);
    });

    it("returns undefined for unknown or missing input", () => {
        assert.equal(parseRoleTitle("principal"), undefined);
        assert.equal(parseRoleTitle(""), undefined);
        assert.equal(parseRoleTitle(undefined), undefined);
    });
});

describe("getUserRole", () => {
    it("returns null when the user doesn't exist", async (t) => {
        t.mock.method(User, "findByPk", async () => null);

        assert.equal(await getUserRole(1), null);
    });

    it("defaults to Student when the user has no role", async (t) => {
        t.mock.method(User, "findByPk", async () => userWithRoles());

        assert.equal(await getUserRole(1), RoleTitle.Student);
    });

    it("returns the most recently assigned role", async (t) => {
        t.mock.method(User, "findByPk", async () => userWithRoles("Teacher", "Student"));

        assert.equal(await getUserRole(1), RoleTitle.Teacher);
    });
});

describe("requireRole", () => {
    it("rejects anonymous requests", async () => {
        await assert.rejects(requireRole(RoleTitle.Admin)(requestFrom()), UnauthorizedError);
    });

    it("rejects a token for a user that no longer exists", async (t) => {
        t.mock.method(User, "findByPk", async () => null);

        await assert.rejects(requireRole(RoleTitle.Admin)(requestFrom("1")), UnauthorizedError);
    });

    it("rejects a user without one of the roles", async (t) => {
        t.mock.method(User, "findByPk", async () => userWithRoles("Student"));

        await assert.rejects(requireRole(RoleTitle.Teacher, RoleTitle.Admin)(requestFrom("1")), ForbiddenError);
    });

    it("lets a user with one of the roles through", async (t) => {
        t.mock.method(User, "findByPk", async () => userWithRoles("Admin"));

        await assert.doesNotReject(requireRole(RoleTitle.Teacher, RoleTitle.Admin)(requestFrom("1")));
    });
});

describe("seedRoles", () => {
    it("creates missing roles, fixes casing and leaves correct roles alone", async (t) => {
        const update = t.mock.fn(async () => undefined);
        const existing: Record<string, object> = {
            Student: {title: "Student", update},
            Teacher: {title: "teacher", update},
        };
        //The where clause is {title: {[Op.iLike]: title}}, so take the value of its only (symbol) key
        t.mock.method(Role, "findOne", async (options: {where: {title: Record<symbol, string>}}) => {
            const title = Object.getOwnPropertySymbols(options.where.title).map(key => options.where.title[key])[0];
            return (existing[title] ?? null) as never;
        });
        const create = t.mock.method(Role, "create", async () => ({}) as never);

        await seedRoles();

        assert.deepEqual(create.mock.calls.map(call => call.arguments[0]), [{title: "Admin"}]);
        assert.deepEqual(update.mock.calls.map(call => (call.arguments as unknown[])[0]), [{title: "Teacher"}]);
    });
});

describe("assignRole", () => {
    it("upserts the role with a new assignment date, so it becomes the active one", async (t) => {
        t.mock.method(Role, "findOne", async () => ({id: 2}) as never);
        const upsert = t.mock.method(UserRole, "upsert", async () => [{}, null] as never);
        const before = Date.now();

        await assignRole(5, RoleTitle.Teacher);

        const values = upsert.mock.calls[0].arguments[0] as {userId: number, roleId: number, assignmentDate: Date};
        assert.equal(values.userId, 5);
        assert.equal(values.roleId, 2);
        assert.ok(values.assignmentDate.getTime() >= before);
    });

    it("fails when the role hasn't been seeded", async (t) => {
        t.mock.method(Role, "findOne", async () => null);

        await assert.rejects(assignRole(5, RoleTitle.Teacher), /roles have not been seeded/);
    });
});
