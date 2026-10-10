import Fastify, {FastifyInstance} from "fastify";
import * as jwt from "jsonwebtoken";
import authPlugin from "../Plugins/Auth";

//Signs a token the same way AuthService does, so the auth plugin accepts it
export function tokenFor(userId: number, username = "user" + userId): string {
    return jwt.sign({sub: String(userId), username}, process.env.SECRETKEY!, {expiresIn: "1h"});
}

export function authHeader(userId: number): {authorization: string} {
    return {authorization: `Bearer ${tokenFor(userId)}`};
}

//A Fastify app with the auth plugin and the given controllers, without swagger or database connections
export async function buildApp(...controllers: ((fastify: FastifyInstance) => void)[]): Promise<FastifyInstance> {
    const app = Fastify();
    app.register(authPlugin);
    app.register(async (instance) => {
        controllers.forEach(controller => controller(instance));
    });
    await app.ready();
    return app;
}
