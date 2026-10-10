"use strict";

//Initial schema, matching what sequelize.sync() used to create.
//Tables that already exist are skipped, so databases created by sync() can run this migration too.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const tables = (await queryInterface.showAllTables()).map(t => typeof t === "string" ? t : t.tableName);
        const timestamps = {
            createdAt: {type: Sequelize.DATE, allowNull: false},
            updatedAt: {type: Sequelize.DATE, allowNull: false},
        };
        const userReference = {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            references: {model: "Users", key: "id"},
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        };

        if (!tables.includes("Users")) {
            await queryInterface.createTable("Users", {
                id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
                userName: {type: Sequelize.STRING, allowNull: false},
                email: {type: Sequelize.STRING, allowNull: false},
                password: {type: Sequelize.STRING, allowNull: false},
                ...timestamps,
            });
        }

        if (!tables.includes("Roles")) {
            await queryInterface.createTable("Roles", {
                id: {type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true},
                title: {type: Sequelize.STRING, allowNull: false, unique: true},
                ...timestamps,
            });
        }

        if (!tables.includes("UserRoles")) {
            await queryInterface.createTable("UserRoles", {
                userId: userReference,
                roleId: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    primaryKey: true,
                    references: {model: "Roles", key: "id"},
                    onUpdate: "CASCADE",
                    onDelete: "CASCADE",
                },
                assignmentDate: {type: Sequelize.DATE, allowNull: false},
                ...timestamps,
            });
        }

        //UserId is the teacher, StudentId the student (see src/Model/associations.ts)
        if (!tables.includes("StudentTeacher")) {
            await queryInterface.createTable("StudentTeacher", {
                UserId: userReference,
                StudentId: userReference,
                ...timestamps,
            });
        }
    },

    async down(queryInterface) {
        await queryInterface.dropTable("StudentTeacher");
        await queryInterface.dropTable("UserRoles");
        await queryInterface.dropTable("Roles");
        await queryInterface.dropTable("Users");
    },
};
