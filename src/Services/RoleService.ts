import {FastifyRequest} from "fastify";
import {User, Role, UserRole} from "../Model/associations";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import ForbiddenError from "../Types/Errors/ForbiddenError";

export enum RoleTitle {
    Student = "student",
    Teacher = "teacher",
}

//Returned when a user has no role assigned
export const DEFAULT_ROLE = RoleTitle.Student;

//A user can have multiple roles, the most recently assigned one wins. Returns null if the user doesn't exist
export async function getUserRole(userId: number | string): Promise<string | null> {
    const user = await User.findByPk(userId, {
        attributes: ['id'],
        include: {model: Role, attributes: ['title'], through: {attributes: ['assignmentDate']}},
        order: [[Role, UserRole, 'assignmentDate', 'DESC']],
    });
    if (!user) return null;
    return user.Roles?.[0]?.title ?? DEFAULT_ROLE;
}

//Route preHandler: the logged in user must have one of the given roles.
//Runs after the global auth preHandler, so req.user is already filled in
export function requireRole(...roles: RoleTitle[]) {
    return async (req: FastifyRequest) => {
        if (!req.user) throw new UnauthorizedError("You are not logged in");
        const role = await getUserRole(req.user.userid);
        if (!role) throw new UnauthorizedError("You are not logged in");
        if (!roles.includes(role as RoleTitle)) {
            throw new ForbiddenError(`This action requires one of these roles: ${roles.join(", ")}`);
        }
    };
}
