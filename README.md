> AI Generated Documentation made in conversation with user Hamid (Corvo). Used for tracking project progress and documentation purposses.

# fastify-backend

## requirements
To run the server locally, you need:  
- A mongoDB server
- A postgres server

## Running locally

```
npm install
cp .env.example .env    # then fill it in, see below
npm run db:migrate      # create the Postgres tables
npm run import:books    # first time only: loads the .xlsx catalogue into MongoDB
npm run dev             # http://localhost:3000, rebuilds on every change
```

The API reference (OpenAPI, rendered by Scalar) is at `http://localhost:3000/reference`. New accounts are students; make the first admin with `npm run assign:role -- <username or email> Admin`.

| Command | Description |
| --- | --- |
| `npm run dev` | Build and start, restart on changes in `src/` (nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start the compiled server |
| `npm test` | Run the tests (see [Tests](#tests)) |
| `npm run lint` | Lint the code (see [Linting](#linting)) |
| `npm run import:books` | Replace the MongoDB catalogue with the contents of the .xlsx |
| `npm run assign:role -- <user> <role>` | Give a user the Student, Teacher or Admin role |

## .env setup

Copy `.env.example` to `.env` and fill in real values before running the app:

```
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `SECRETKEY` | Secret used to sign JWTs |
| `DBPASSWORD` | Postgres user password |
| `DBUSER` | Postgres user name |
| `DBNAME` | Postgres database name |
| `DBURL` | Postgres host |
| `DBPORT` | Postgres port |
| `MONGOSTRING` | MongoDB connection String |

`.env` is gitignored — never commit real secrets.

## Project structure

```
fastify-backend/
├── src/
│   ├── index.ts                  # Entry point: Fastify setup, OpenAPI docs, route registration
│   ├── Controllers/              # Route handlers, one file per resource (+ *.test.ts route tests)
│   │   ├── AdminController.ts
│   │   ├── AuthController.ts
│   │   ├── BookAdviceController.ts
│   │   ├── BookController.ts
│   │   ├── ReadingListController.ts
│   │   ├── ReadingProfileController.ts
│   │   └── StudentTeacherController.ts
│   ├── Services/                 # Business logic used by the controllers (+ *.test.ts unit tests)
│   │   ├── AdviceService.ts
│   │   ├── AuthService.ts
│   │   └── RoleService.ts
│   ├── Model/                    # Data models
│   │   ├── associations.ts       # Sequelize model relations (must be imported for the models to initialize)
│   │   ├── User.ts, Role.ts, UserRole.ts          # Postgres (Sequelize); StudentTeacher is the join table defined in associations.ts
│   │   └── Book.ts, ReadingList.ts, ReadingProfile.ts  # MongoDB (Mongoose)
│   ├── Data/
│   │   └── DB.ts                 # Postgres/Sequelize connection
│   ├── test/
│   │   └── helpers.ts            # Test helpers: buildApp() and test JWTs
│   ├── Plugins/
│   │   └── Auth.ts               # JWT auth hook, sets request.user
│   ├── Types/
│   │   ├── fastify.d.ts          # Type extension for request.user
│   │   └── Errors/               # Custom HTTP error classes (400, 401, 403, 404, 409)
│   └── scripts/
│       ├── assignRole.ts         # npm run assign:role -- <username or email> <role>
│       └── importBooks.ts        # npm run import:books (imports the .xlsx catalogue into MongoDB)
├── db/
│   ├── config.js                 # sequelize-cli config (reads .env)
│   ├── migrations/               # Postgres migrations
│   └── seeders/                  # Postgres seeders (currently empty)
├── docs/
│   ├── DatabaseArchitecture.md
│   └── ERD.md
├── dist/                         # Compiled JavaScript output of `npm run build` (generated)
├── .sequelizerc                  # Points sequelize-cli at db/
├── .env.example                  # Template for .env
├── VrijLezenOpMaat Leescatalogus 1.0.xlsx  # Book catalogue used by import:books
├── package.json
└── tsconfig.json
```

## Database migrations

The Postgres schema is managed with [sequelize-cli](https://sequelize.org/docs/v6/other-topics/migrations/) migrations. The server no longer calls `sequelize.sync()`, so run the migrations before starting the server the first time, and again after pulling new ones:

```
npm run db:migrate
```

The CLI reads the same `.env` variables as the server (see `db/config.js`). Migrations live in `db/migrations/`, seeders in `db/seeders/`.

| Command | Description |
| --- | --- |
| `npm run db:migrate` | Run all pending migrations |
| `npm run db:migrate:undo` | Revert the most recent migration |
| `npm run db:migrate:status` | Show which migrations have run |
| `npm run migration:generate -- <name>` | Create a new, empty migration file in `db/migrations/` |

Notes:
- **Existing databases** (created by the old `sync()`) can run `db:migrate` as normal: the initial migration skips tables that already exist, and the second one removes the duplicate `UNIQUE (title)` constraints that `sync({alter: true})` kept adding to `Roles`.
- **Changing a model?** Also add a migration for it, otherwise the database won't match the model. Never edit a migration that has already been run; add a new one instead.
- Migrations are plain JavaScript (not TypeScript), because sequelize-cli runs them directly.
- The roles (`Student`, `Teacher`, `Admin`) are still seeded by the server on startup, not by a seeder.
- MongoDB (books, reading lists, reading profiles) doesn't use migrations.

## Tests

```
npm test
```

Tests use Node's built-in test runner (`node:test`) and live next to the code they test (`*.test.ts`). They don't need a running database: Sequelize model calls are mocked with `t.mock.method(...)`, and routes are tested with Fastify's `app.inject()` (see `src/test/helpers.ts`). The `.env` file must exist, because the code under test reads it on import.

| File | What it covers |
| --- | --- |
| `src/Services/AdviceService.test.ts` | Book scoring and advice selection |
| `src/Services/AuthService.test.ts` | Sign in, sign up and JWT checks |
| `src/Services/RoleService.test.ts` | Role lookup, `requireRole`, seeding and assigning roles |
| `src/Controllers/AuthController.test.ts` | `/login`, `/register`, `/me` and the auth plugin |
| `src/Controllers/AdminController.test.ts` | `/users` and `/users/:userId/role`, including role checks |
| `src/Types/Errors/Errors.test.ts` | Status codes of the error classes |

## Linting

The code is linted with [ESLint](https://eslint.org/) and [typescript-eslint](https://typescript-eslint.io/), using their recommended rules. The config is in `eslint.config.mjs`.

| Command | Description |
| --- | --- |
| `npm run lint` | Check the code for lint errors |
| `npm run lint:fix` | Fix what can be fixed automatically |

Unused function parameters are allowed when they start with `_` (e.g. `(_req, reply) => ...`).

## Known issues

Checked on 2026-10-10, not yet fixed:

- **The database password is logged.** `src/Data/DB.ts` prints the full Postgres connection string, including the password, on startup.
- **Startup race.** The MongoDB connection and `seedRoles()` in `src/index.ts` run in an async function that isn't awaited before `fastify.listen`, so the first requests can arrive before MongoDB is connected.
- **`GET /` schema mismatch.** The route declares a `string` response but sends an object.
- **No unique index on `userID`** in `readinglists` and `readingprofiles`, so nothing in the database enforces one list and one profile per user.
- **`import:books` breaks reading lists.** It runs `Book.deleteMany({})` and re-inserts the catalogue, so every book gets a new `_id` and existing reading lists point to books that no longer exist.

Note: `import "./Model/associations";` in `src/index.ts` looks unused, but it is required: importing it sets up the Sequelize associations.
