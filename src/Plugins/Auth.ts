import fp from 'fastify-plugin';
import {FastifyInstance} from 'fastify';
import {InterceptUser} from '../Services/AuthService';

const BEARER_PREFIX = 'Bearer ';

async function authPlugin(fastify: FastifyInstance) {
    fastify.decorateRequest('user');

    fastify.addHook('preHandler', async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return;
        }

        const token = authHeader.startsWith(BEARER_PREFIX)
            ? authHeader.slice(BEARER_PREFIX.length)
            : authHeader;

        try {
            req.user = await InterceptUser(token);
        } catch (err) {
            req.log.warn({err}, 'Ignoring request Authorization header: token verification failed');
        }
    });
}

export default fp(authPlugin, {name: 'auth-plugin'});
