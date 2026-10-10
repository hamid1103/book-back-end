//sequelize-cli config. Reads the same .env variables as src/Data/DB.ts
process.loadEnvFile();

const config = {
    username: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DBNAME,
    host: process.env.DBURL,
    port: Number(process.env.DBPORT || 5432),
    dialect: "postgres",
};

module.exports = {
    development: config,
    test: config,
    production: config,
};
