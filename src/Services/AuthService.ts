import {loadEnvFile} from "node:process";
loadEnvFile();
import User from "../Model/User";
import bcrypt from "bcrypt";
import * as jwt from 'jsonwebtoken';
import {Op} from "sequelize";

const SECRET_KEY = process.env.SECRETKEY;

//returns the JWT for signing in or throws an error.
export async function signIn(username: string | null | undefined, password: string, email?: string | null): Promise<{ access_token: string }> {
    const user = await User.findOne({ where: {
        [Op.or]: [{ userName: username}, {email: email}]
        }});
    if(!user) {
        throw new Error(`User ${username} not found. ${(email ? `Email ${email} not found` : "")}`);
    }
    let compareResult = await bcrypt.compare(password, user!.password);
    if (!compareResult) {
        throw new Error("Passwords don't match");
    }
    const payload = {sub: user.id, username: user.userName}
    if(!SECRET_KEY){
        throw new Error("Secret key is missing");
    }
    console.log(payload);
    return {
        access_token: jwt.sign(payload, SECRET_KEY)
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

    const hash = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
        userName: username,
        password: hash,
        email: email,
    });
    if(!SECRET_KEY){
        throw new Error("Secret key is missing");
    }

    const payload = {sub: newUser.id, username: newUser.userName}

    return {
        access_token: jwt.sign(payload, SECRET_KEY)
    }
}