import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
    {ignores: ["dist/", "node_modules/"]},
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        languageOptions: {globals: globals.node},
        rules: {
            //Allow unused args/vars when prefixed with _, e.g. (_req, reply) => ...
            "@typescript-eslint/no-unused-vars": ["error", {argsIgnorePattern: "^_", varsIgnorePattern: "^_"}],
        },
    },
    //Migrations, the sequelize-cli config and .sequelizerc are plain CommonJS
    {
        files: ["**/*.js", ".sequelizerc"],
        languageOptions: {sourceType: "commonjs"},
        rules: {"@typescript-eslint/no-require-imports": "off"},
    },
);
