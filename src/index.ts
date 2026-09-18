import Fastify from 'fastify'

//Need to import for sequelize to register
import {sequelize} from "./Data/DB";
import "./Model/User";
import User from "./Model/User";
import AuthController from "./Controllers/AuthController";
import authPlugin from "./Plugins/Auth";
import fastifyApiReference from "@scalar/fastify-api-reference";
import fastifySwagger from "@fastify/swagger";

//Setup everything
(async () => {
    console.log("Starting Setup");
    await sequelize.sync({ alter: true });
})()


//Fastify Server Starts loading here
const fastify = Fastify({
    logger: true
})

fastify.register(authPlugin);
fastify.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'fastify-backend',
            version: '1.0.0',
        },
    },
})
fastify.register(fastifyApiReference, {
    routePrefix: '/reference',
})

// Routes are registered inside a plugin so they boot (and fire the
// swagger `onRoute` hook) after fastifySwagger/fastifyApiReference are
// ready. Plain fastify.get/post calls at the top level run immediately,
// before those plugins have booted, so swagger would never see them.
fastify.register(async (instance) => {
    instance.get('/', (req, res) => {
        if (req.user)
        {
            res.send({hello: req.user.username})
        }else {
            res.send({hello: 'world'})
        }
    })

    instance.get('/health', {
        schema: {
            description: 'Health check',
            tags: ['system'],
            response: {
                200: { type: 'object', properties: { status: { type: 'string' } } }
            }
        }
    }, async () => ({ status: 'ok' }))

    //Register Custom Controller (JUST A TS FILE FUNCTION TO SPLIT STUFF UP)
    AuthController(instance);
})

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    // Server is now listening on ${address}
})