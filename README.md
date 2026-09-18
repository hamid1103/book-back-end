# fastify-backend

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

`.env` is gitignored — never commit real secrets.

## Known issues

Found while working on type-safety for `request.user`, not yet fixed:

- **`User.id` type mismatch.** `src/Model/User.ts` declares `id: string` but the DB column is `DataTypes.INTEGER`. Doesn't break anything today (IDs only ever pass through opaquely, into the JWT `sub` and back out as `userid`), but is incorrect and could cause bugs if `user.id` is ever compared numerically.
- **Unused import in `src/index.ts`.** `import User from "./Model/User"` (line 6) is dead code — harmless, but worth removing.
