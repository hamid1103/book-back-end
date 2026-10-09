import {sequelize} from "../Data/DB";
import {User} from "../Model/associations";
import {assignRole, parseRoleTitle, RoleTitle, seedRoles} from "../Services/RoleService";

// Usage: npm run assign:role -- <username or email> <Student|Teacher|Admin>
// Same as PUT /users/:userId/role, but works without an admin account (e.g. to make the first admin).
async function main() {
    const [login, input] = process.argv.slice(2);
    //Case-insensitive, so "teacher" works too
    const title = parseRoleTitle(input);
    if (!login || !title) {
        throw new Error(`Usage: npm run assign:role -- <username or email> <${Object.values(RoleTitle).join("|")}>`);
    }

    await sequelize.sync({alter: true});
    await seedRoles();
    const user = await User.findOne({where: login.includes("@") ? {email: login} : {userName: login}});
    if (!user) throw new Error(`User ${login} not found`);

    await assignRole(user.id, title);
    console.log(`${user.userName} is now a ${title}`);
}

main()
    .catch(err => {
        console.error(err.message ?? err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
