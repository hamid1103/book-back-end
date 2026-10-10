import {describe, it} from "node:test";
import assert from "node:assert/strict";
import BadRequestError from "./BadRequestError";
import UnauthorizedError from "./UnauthorizedError";
import ForbiddenError from "./ForbiddenError";
import NotFoundError from "./NotFoundError";
import ConflictError from "./ConflictError";

describe("error classes", () => {
    //Fastify uses statusCode as the response status, so these must stay correct
    const cases = [
        [BadRequestError, 400, "BadRequestError"],
        [UnauthorizedError, 401, "UnauthorizedError"],
        [ForbiddenError, 403, "ForbiddenError"],
        [NotFoundError, 404, "NotFoundError"],
        [ConflictError, 409, "ConflictError"],
    ] as const;

    for (const [ErrorClass, statusCode, name] of cases) {
        it(`${name} has status ${statusCode}`, () => {
            const error = new ErrorClass("message");

            assert.ok(error instanceof Error);
            assert.equal(error.statusCode, statusCode);
            assert.equal(error.name, name);
            assert.equal(error.message, "message");
        });
    }
});
