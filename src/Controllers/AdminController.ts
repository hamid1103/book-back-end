import {FastifyInstance} from "fastify";
import {Op} from "sequelize";
import {User, Role, UserRole} from "../Model/associations";
import {assignRole, DEFAULT_ROLE, getUserRole, parseRoleTitle, requireRole, RoleTitle} from "../Services/RoleService";
import BadRequestError from "../Types/Errors/BadRequestError";
import NotFoundError from "../Types/Errors/NotFoundError";

const errorSchema = {
    type: "object",
    properties: {
        statusCode: {type: "integer"},
        error: {type: "string"},
        message: {type: "string"},
    }
} as const;

//The API uses lowercase role names, the DB stores them capitalized
const apiRoleNames = Object.values(RoleTitle).map(t => t.toLowerCase());

export default function AdminController(fastify: FastifyInstance) {
    fastify.get<{Querystring: {q?: string}}>("/users", {
        preHandler: requireRole(RoleTitle.Admin),
        schema: {
            summary: "Fetch all users",
            description: "Fetch every user with their active role. Use ?q= to search on username or email (case insensitive). Admin role required",
            tags: ['admin'],
            querystring: {
                type: "object",
                properties: {
                    q: {type: "string"},
                }
            },
            response: {
                200: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: {type: "integer"},
                            userName: {type: "string"},
                            email: {type: "string"},
                            role: {type: "string"},
                        }
                    }
                },
                401: errorSchema,
                403: errorSchema,
            }
        }
    }, async (req) => {
        const q = req.query.q?.trim();
        //Same ordering as getUserRole, so Roles[0] is the active role, without a query per user
        const users = await User.findAll({
            attributes: ['id', 'userName', 'email'],
            where: q ? {[Op.or]: [{userName: {[Op.iLike]: `%${q}%`}}, {email: {[Op.iLike]: `%${q}%`}}]} : undefined,
            include: {model: Role, attributes: ['title'], through: {attributes: ['assignmentDate']}},
            order: [['userName', 'ASC'], [Role, UserRole, 'assignmentDate', 'DESC']],
        });
        return users.map(u => ({
            id: u.id,
            userName: u.userName,
            email: u.email,
            role: (u.Roles?.[0]?.title ?? DEFAULT_ROLE).toLowerCase(),
        }));
    })

    fastify.put<{Params: {userId: number}, Body: {role: string}}>("/users/:userId/role", {
        preHandler: requireRole(RoleTitle.Admin),
        schema: {
            summary: "Assign a role to a user",
            description: "Make the given role the user's active role. Admins can't change their own role, so they can't lock themselves out. Admin role required",
            tags: ['admin'],
            params: {
                type: "object",
                required: ["userId"],
                properties: {
                    userId: {type: "integer", minimum: 1},
                }
            },
            body: {
                type: "object",
                required: ["role"],
                properties: {
                    role: {type: "string", enum: apiRoleNames},
                }
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: {type: "integer"},
                        userName: {type: "string"},
                        role: {type: "string"},
                    }
                },
                400: errorSchema,
                401: errorSchema,
                403: errorSchema,
                404: errorSchema,
            }
        }
    }, async (req) => {
        const {userId} = req.params;
        if (userId === Number(req.user!.userid)) {
            throw new BadRequestError("You can't change your own role");
        }
        const user = await User.findByPk(userId, {attributes: ['id', 'userName']});
        if (!user) {
            throw new NotFoundError("User not found");
        }
        //The schema enum already guarantees a valid role
        await assignRole(user.id, parseRoleTitle(req.body.role)!);
        return {id: user.id, userName: user.userName, role: (await getUserRole(user.id))?.toLowerCase()};
    })
}
