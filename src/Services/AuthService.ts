import {loadEnvFile} from "node:process";
loadEnvFile();
import User from "../Model/User";
import Role from "../Model/Role";
import UserRole from "../Model/UserRole";
import {sequelize} from "../Data/DB";
import {RoleTitle} from "./RoleService";
import bcrypt from "bcrypt";
import * as jwt from 'jsonwebtoken';
import {Op} from "sequelize";
import BadRequestError from "../Types/Errors/BadRequestError";
import UnauthorizedError from "../Types/Errors/UnauthorizedError";

const SECRET_KEY = process.env.SECRETKEY;
const TOKEN_EXPIRY = "1d";

//returns the JWT for signing in or throws an error.
export async function signIn(username: string | null | undefined, password: string, email?: string | null): Promise<{ access_token: string }> {
    let user: User | null;
    if (!username) {
        if (!email) {
            throw new BadRequestError("Email or Username is required");
        }
        user = await User.findOne({where: {email: email}})
    }else{
        user = email ? await User.findOne({ where: {
                [Op.or]: [{ userName: username}, {email: email}]
            }}) : await User.findOne({ where: { userName: username } });
    }

    if(!user) {
        throw new UnauthorizedError("Details don't match.");
    }
    const compareResult = await bcrypt.compare(password, user!.password);
    if (!compareResult) {
        throw new UnauthorizedError("Details don't match.");
    }
    const payload = {sub: user.id, username: user.userName}
    if(!SECRET_KEY){
        throw new Error("Secret key is missing");
    }
    return {
        access_token: jwt.sign(payload, SECRET_KEY, {expiresIn: TOKEN_EXPIRY})
    }
}

export async function InterceptUser(token: string): Promise<{ userid: string, username: string }> {
    if(!SECRET_KEY){
        throw new Error("Secret key is missing");
    }
    const decoded = jwt.verify(token, SECRET_KEY);
    if (typeof decoded === 'string' || !decoded.sub || !decoded.username) {
        throw new Error("Invalid token payload");
    }
    return {userid: decoded.sub, username: decoded.username}
}

export async function signUp(username: string, password: string, email:string): Promise<{ access_token: string }> {
    if(password == null) {
        throw new Error("Passwords don't match");
    }

    const existingUser = await User.findOne({ where: { userName: username } });
    if (existingUser) {
        throw new BadRequestError("Username already exists");
    }

    const existingEmail = await User.findOne({ where: { email: email } });
    if (existingEmail) {
        throw new BadRequestError("Email already exists");
    }

    const hash = bcrypt.hashSync(password, 10);
    //One transaction, so a failed role assignment doesn't leave a user without a role behind
    const newUser = await sequelize.transaction(async (transaction) => {
        const user = await User.create({
            userName: username,
            password: hash,
            email: email,
        }, {transaction});
        const studentRole = await Role.findOne({where: {title: RoleTitle.Student}, transaction});
        if (!studentRole) {
            throw new Error("Student role is missing, roles have not been seeded");
        }
        await UserRole.create({userId: user.id, roleId: studentRole.id}, {transaction});
        return user;
    });
    if(!SECRET_KEY){
        throw new Error("Secret key is missing");
    }

    const payload = {sub: newUser.id, username: newUser.userName}

    return {
        access_token: jwt.sign(payload, SECRET_KEY, {expiresIn: TOKEN_EXPIRY})
    }
}