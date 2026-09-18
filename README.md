# fastify-backend

## Known issues

Found while working on type-safety for `request.user`, not yet fixed:

- **`signIn` crashes on login without an email.** `src/Services/AuthService.ts`'s `where: { [Op.or]: [{ userName }, { email }] }` passes `email: undefined` straight to Sequelize/Postgres when the client doesn't send an email. Postgres rejects a literal `undefined` bind parameter, so `POST /login` with just `username`+`password` returns a 500. Fix: only include the `email` clause in the `Op.or` array when `email` is truthy.
- **`User.id` type mismatch.** `src/Model/User.ts` declares `id: string` but the DB column is `DataTypes.INTEGER`. Doesn't break anything today (IDs only ever pass through opaquely, into the JWT `sub` and back out as `userid`), but is incorrect and could cause bugs if `user.id` is ever compared numerically.
- **Unused import in `src/index.ts`.** `import User from "./Model/User"` (line 6) is dead code — harmless, but worth removing.
