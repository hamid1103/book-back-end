import {FastifyInstance} from "fastify";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import NotFoundError from "../Types/Errors/NotFoundError";
import ConflictError from "../Types/Errors/ConflictError";
import {LanguageLevel, ReadingLength, ReadingMotivation, ReadingProfile} from "../Model/ReadingProfile";

//The enums are numeric, so Object.values would also return the numbers. Only keep the names ("A2", "Short", ...)
const enumNames = (e: object) => Object.keys(e).filter(key => isNaN(Number(key)));

interface ReadingProfileBody {
    languageLevel: string;
    genre: string[];
    length: string;
    ReadingMotivation: string;
}

const readingProfileBodySchema = {
    type: "object",
    required: ["languageLevel", "genre", "length", "ReadingMotivation"],
    additionalProperties: false,
    properties: {
        languageLevel: {type: "string", enum: enumNames(LanguageLevel)},
        genre: {type: "array", items: {type: "string"}},
        length: {type: "string", enum: enumNames(ReadingLength)},
        ReadingMotivation: {type: "string", enum: enumNames(ReadingMotivation)},
    }
};

const errorSchema = {
    type: "object",
    properties: {
        statusCode: {type: "integer"},
        error: {type: "string"},
        message: {type: "string"},
    }
};

export default function ReadingProfileController(fastify: FastifyInstance) {
    fastify.get("/reading-profile", {
        schema: {
            summary: "Fetch User's reading profile",
            description: "Fetch the reading profile of the logged in user. Auth Required",
            tags: ["reading-profile"],
            response: {
                200: {$ref: "ReadingProfile#"},
                401: errorSchema,
                404: errorSchema,
            }
        }
    }, async (request, res) => {
        if (!request.user) throw new UnauthorizedError("Not logged in.");
        const userReadingProfile = await ReadingProfile.findOne({userID: Number(request.user.userid)});
        if (!userReadingProfile) {
            throw new NotFoundError("Reading Profile not Found");
        }
        await res.send(userReadingProfile);
    })

    fastify.post<{Body: ReadingProfileBody}>("/reading-profile", {
        schema: {
            summary: "Create reading profile",
            description: "Create a reading profile for the logged in user. A user can only have one reading profile. Auth Required",
            tags: ["reading-profile"],
            body: readingProfileBodySchema,
            response: {
                201: {$ref: "ReadingProfile#"},
                400: errorSchema,
                401: errorSchema,
                409: errorSchema,
            }
        }
    }, async (request, res) => {
        if (!request.user) throw new UnauthorizedError("Not logged in.");
        const userID = Number(request.user.userid);
        if (await ReadingProfile.exists({userID})) {
            throw new ConflictError("Reading Profile already exists, use PUT to update it");
        }
        const userReadingProfile = new ReadingProfile({...request.body, userID});
        await userReadingProfile.save();
        await res.code(201).send(userReadingProfile);
    })

    fastify.put<{Body: ReadingProfileBody}>("/reading-profile", {
        schema: {
            summary: "Update reading profile",
            description: "Replace the reading profile of the logged in user. Auth Required",
            tags: ["reading-profile"],
            body: readingProfileBodySchema,
            response: {
                200: {$ref: "ReadingProfile#"},
                400: errorSchema,
                401: errorSchema,
                404: errorSchema,
            }
        }
    }, async (request, res) => {
        if (!request.user) throw new UnauthorizedError("Not logged in.");
        const userReadingProfile = await ReadingProfile.findOneAndUpdate(
            {userID: Number(request.user.userid)},
            request.body,
            {new: true, runValidators: true}
        );
        if (!userReadingProfile) {
            throw new NotFoundError("Reading Profile not Found");
        }
        await res.send(userReadingProfile);
    })

    fastify.delete("/reading-profile", {
        schema: {
            summary: "Delete reading profile",
            description: "Delete the reading profile of the logged in user. Auth Required",
            tags: ["reading-profile"],
            response: {
                204: {type: "null", description: "Reading Profile deleted"},
                401: errorSchema,
                404: errorSchema,
            }
        }
    }, async (request, res) => {
        if (!request.user) throw new UnauthorizedError("Not logged in.");
        const deleted = await ReadingProfile.findOneAndDelete({userID: Number(request.user.userid)});
        if (!deleted) {
            throw new NotFoundError("Reading Profile not Found");
        }
        await res.code(204).send();
    })
}
