import {FastifyRequest} from "fastify";
import {Op} from "sequelize";
import {User, Role, UserRole} from "../Model/associations";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";
import ForbiddenError from "../Types/Errors/ForbiddenError";

//These are the role titles stored in the DB. /me sends them lowercased
export enum RoleTitle {
    Student = "Student",
    Teacher = "Teacher",
    Admin = "Admin",
}

//Returned when a user has no role assigned
export const DEFAULT_ROLE = RoleTitle.Student;

//Makes sure every RoleTitle exists in the DB. Safe to run on every start.
//A role stored with different casing (e.g. an older "teacher") is renamed, so its UserRoles stay linked
export async function seedRoles(): Promise<void> {
    for (const title of Object.values(RoleTitle)) {
        const existing = await Role.findOne({where: {title: {[Op.iLike]: title}}});
        if (!existing) {
            await Role.create({title});
        } else if (existing.title !== title) {
            await existing.update({title});
        }
    }
}

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

//Turns an API/CLI role name ("teacher", "Teacher", ...) into a RoleTitle, or undefined if it isn't one
export function parseRoleTitle(input: string | undefined): RoleTitle | undefined {
    return Object.values(RoleTitle).find(t => t.toLowerCase() === input?.toLowerCase());
}

//Makes the given role the user's active one.
//Re-assigning bumps the assignmentDate, which makes it the most recent and so the active role
export async function assignRole(userId: number, title: RoleTitle): Promise<void> {
    const role = await Role.findOne({where: {title}});
    if (!role) throw new Error(`${title} role is missing, roles have not been seeded`);
    await UserRole.upsert({userId, roleId: role.id, assignmentDate: new Date()});
}
