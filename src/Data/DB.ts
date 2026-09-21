import {Sequelize} from "sequelize";
import {loadEnvFile} from "node:process";

loadEnvFile();


const DBUSER = process.env.DBUSER;
const DBNAME = process.env.DBNAME;
const DBPASSWORD = process.env.DBPASSWORD;
const DBURL = process.env.DBURL;
const DBPORT = process.env.DBPORT;
if (!DBUSER || !DBNAME || !DBPASSWORD || !DBURL || !DBPORT) throw new Error("ENV File incomplete.");

let DBURI = `${DBURL}:${(DBPORT || 5432)}`;

console.log(`postgres://${DBUSER}:${DBPASSWORD}@${DBURI}/${DBNAME}`)

export const sequelize = new Sequelize(`postgres://${DBUSER}:${DBPASSWORD}@${DBURI}/${DBNAME}`);