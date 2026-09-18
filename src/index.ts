import Fastify from 'fastify'

//Need to import for sequelize to register
import {sequelize} from "./Data/DB";
import "./Model/User";
import User from "./Model/User";
import AuthController from "./Controllers/AuthController";
import authPlugin from "./Plugins/Auth";

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

// Declare a route
// Todo: Add an API documentation here or similair
fastify.get('/', function (request, reply) {
    if(request.user)
    {
        reply.send({hello: `${request.user.username}`})
    }else {
        reply.send({ hello: 'world' })
    }
})

//Register Custom Controller (JUST A TS FILE FUNCTION TO SPLIT STUFF UP)
AuthController(fastify);

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    // Server is now listening on ${address}
})