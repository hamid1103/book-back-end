import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Populated by the preHandler hook in src/Plugins/Auth.ts when the
     * Authorization header is present and the token verifies successfully.
     * Undefined for anonymous requests or invalid/expired tokens.
     */
    user?: {
      userid: string;
      username: string;
    };
  }
}
