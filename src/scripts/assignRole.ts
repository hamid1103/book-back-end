import {sequelize} from "../Data/DB";
import {User, Role, UserRole} from "../Model/associations";
import {RoleTitle} from "../Services/RoleService";

// Usage: npm run assign:role -- <username or email> <student|teacher>
// There is no admin endpoint for roles yet, so teachers are made with this script.
async function main() {
    const [login, title] = process.argv.slice(2);
    const titles = Object.values(RoleTitle) as string[];
    if (!login || !titles.includes(title)) {
        throw new Error(`Usage: npm run assign:role -- <username or email> <${titles.join("|")}>`);
    }

    await sequelize.sync({alter: true});
    const user = await User.findOne({where: login.includes("@") ? {email: login} : {userName: login}});
    if (!user) throw new Error(`User ${login} not found`);

    const [role] = await Role.findOrCreate({where: {title}});
    //Re-assigning bumps the assignmentDate, which makes it the user's active role
    await UserRole.upsert({userId: user.id, roleId: role.id, assignmentDate: new Date()});
    console.log(`${user.userName} is now a ${title}`);
}

main()
    .catch(err => {
        console.error(err.message ?? err);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
