import {FastifyInstance} from "fastify";
import {signIn, signUp} from "../Services/AuthService";

// Kept in sync with RegOps.schema.body below manually — not derived automatically.
interface RegisterBody {
    username: string;
    password: string;
    email: string;
}

// Kept in sync with SignOps.schema.body below manually — not derived automatically.
interface LoginBody {
    username?: string | null;
    password: string;
    email?: string | null;
}

/**
 * @type {import('fastify').RouteShorthandOptions}
 * @const
 */
const SignOps = {
    schema: {
        body: {
            type: 'object',
            properties: {
                username: {type: ['string', 'null']},
                password: {type: 'string'},
                email: {
                    type: ['string', 'null'],
                }
            }
        }
    }
}

/**
 * @type {import('fastify').RouteShorthandOptions}
 * @const
 */
const RegOps = {
    schema: {
        body: {
            type: 'object',
            properties: {
                username: {type: 'string'},
                password: {type: 'string'},
                email: {
                    type: 'string',
                }
            }
        }
    }
}

export default function AuthController(fastify: FastifyInstance) {

    fastify.post<{ Body: RegisterBody }>("/register", RegOps, async (request, reply) => {
        return await signUp(request.body.username, request.body.password, request.body.email)
    })

    fastify.post<{ Body: LoginBody }>("/login", SignOps, async (request, reply) => {
        if(!request.body.username && !request.body.email) {
            throw new Error("Need at least one username or email");
        }
        return await signIn(request.body.username, request.body.password, request.body.email)
    })
}