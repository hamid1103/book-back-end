import {describe, it} from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import {InterceptUser, signIn, signUp} from "./AuthService";
import User from "../Model/User";
import Role from "../Model/Role";
import UserRole from "../Model/UserRole";
import {sequelize} from "../Data/DB";
import BadRequestError from "../Types/Errors/BadRequestError";

//Low cost so the tests stay fast
const password = "secret";
const hash = bcrypt.hashSync(password, 4);
const jan = {id: 7, userName: "jan", email: "jan@school.nl", password: hash};

describe("signIn", () => {
    it("requires a username or email", async () => {
        await assert.rejects(signIn(null, password, null), BadRequestError);
    });

    it("returns a token that InterceptUser accepts", async (t) => {
        t.mock.method(User, "findOne", async () => jan as never);

        const {access_token} = await signIn("jan", password);

        assert.deepEqual(await InterceptUser(access_token), {userid: 7, username: "jan"});
    });

    it("looks the user up by email when no username is given", async (t) => {
        const findOne = t.mock.method(User, "findOne", async () => jan as never);

        await signIn(undefined, password, "jan@school.nl");

        assert.deepEqual(findOne.mock.calls[0].arguments[0], {where: {email: "jan@school.nl"}});
    });

    it("gives the same error for an unknown user and a wrong password", async (t) => {
        const findOne = t.mock.method(User, "findOne", async () => null);
        await assert.rejects(signIn("nobody", password), {name: "UnauthorizedError", message: "Details don't match."});

        findOne.mock.mockImplementation(async () => jan as never);
        await assert.rejects(signIn("jan", "wrong"), {name: "UnauthorizedError", message: "Details don't match."});
    });
});

describe("InterceptUser", () => {
    it("rejects a token signed with another key", async () => {
        const token = jwt.sign({sub: "1", username: "jan"}, "not-the-real-key");

        await assert.rejects(InterceptUser(token), jwt.JsonWebTokenError);
    });

    it("rejects an expired token", async () => {
        const token = jwt.sign({sub: "1", username: "jan", exp: Math.floor(Date.now() / 1000) - 60}, process.env.SECRETKEY!);

        await assert.rejects(InterceptUser(token), jwt.TokenExpiredError);
    });

    it("rejects a token without a username", async () => {
        const token = jwt.sign({sub: "1"}, process.env.SECRETKEY!);

        await assert.rejects(InterceptUser(token), {message: "Invalid token payload"});
    });

    it("rejects garbage", async () => {
        await assert.rejects(InterceptUser("not.a.token"));
    });
});

describe("signUp", () => {
    //Runs the transaction callback straight away instead of opening a real transaction
    function mockTransaction(t: {mock: typeof import("node:test").mock}) {
        t.mock.method(sequelize, "transaction", (async (callback: (transaction: object) => unknown) => callback({})) as never);
    }

    it("rejects a username that is taken", async (t) => {
        t.mock.method(User, "findOne", async () => jan as never);

        await assert.rejects(signUp("jan", password, "new@school.nl"), {name: "BadRequestError", message: "Username already exists"});
    });

    it("rejects an email that is taken", async (t) => {
        //First lookup is by username (free), the second by email (taken)
        t.mock.method(User, "findOne", async (options: {where: object}) => ("email" in options.where ? jan : null) as never);

        await assert.rejects(signUp("piet", password, "jan@school.nl"), {name: "BadRequestError", message: "Email already exists"});
    });

    it("creates the user with a hashed password and gives them the Student role", async (t) => {
        t.mock.method(User, "findOne", async () => null);
        mockTransaction(t);
        const create = t.mock.method(User, "create", async (values: {userName: string}) => ({id: 12, ...values}) as never);
        const findRole = t.mock.method(Role, "findOne", async () => ({id: 3, title: "Student"}) as never);
        const createUserRole = t.mock.method(UserRole, "create", async () => ({}) as never);

        const {access_token} = await signUp("piet", password, "piet@school.nl");

        const created = create.mock.calls[0].arguments[0] as {password: string};
        assert.notEqual(created.password, password);
        assert.ok(await bcrypt.compare(password, created.password));
        assert.deepEqual(findRole.mock.calls[0].arguments[0]?.where, {title: "Student"});
        assert.deepEqual(createUserRole.mock.calls[0].arguments[0], {userId: 12, roleId: 3});
        assert.deepEqual(await InterceptUser(access_token), {userid: 12, username: "piet"});
    });

    it("fails when the roles have not been seeded", async (t) => {
        t.mock.method(User, "findOne", async () => null);
        mockTransaction(t);
        t.mock.method(User, "create", async () => ({id: 12}) as never);
        t.mock.method(Role, "findOne", async () => null);
        const createUserRole = t.mock.method(UserRole, "create", async () => ({}) as never);

        await assert.rejects(signUp("piet", password, "piet@school.nl"), /Student role is missing/);
        assert.equal(createUserRole.mock.callCount(), 0);
    });
});
