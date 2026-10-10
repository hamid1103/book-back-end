"use strict";

//sync({alter: true}) added a new UNIQUE (title) constraint on Roles every time the server started
//(Roles_title_key1, Roles_title_key2, ...). This drops the copies and keeps the original Roles_title_key.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const [duplicates] = await queryInterface.sequelize.query(
            `SELECT conname FROM pg_constraint
             WHERE conrelid = '"Roles"'::regclass AND contype = 'u' AND conname ~ '^Roles_title_key[0-9]+$'`
        );
        for (const {conname} of duplicates) {
            await queryInterface.removeConstraint("Roles", conname);
        }
    },

    //The duplicates never did anything, so there is nothing to restore
    async down() {},
};
