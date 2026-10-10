# Database Architecture

The backend uses two databases (see [ERD.md](ERD.md) for the full diagram):

- **PostgreSQL** (Sequelize): `Users`, `Roles`, `UserRoles`, `StudentTeacher`
- **MongoDB** (Mongoose): `books`, `readinglists`, `readingprofiles`

This document explains why each kind of data lives where it does, and what the trade-offs of that
split are.

## Summary

We split our data by its nature. User accounts, roles and teacher–student links are strongly
relational, security-sensitive and have a fixed structure, so they live in PostgreSQL, where
foreign keys, unique constraints and transactions guarantee consistency (for example, a user is
created and given a role in one transaction). Reading material, reading lists and reading profiles
are document-shaped: the catalogue mixes several material types with different fields, uses many
array fields (genres, tags, levels), and the reading features are still changing. MongoDB lets us
store each list or profile as a single document, index array fields directly, and add fields like
reading status without migrations. The trade-off is that the two databases can't enforce
references or transactions between them, so the application is responsible for keeping `userID`
consistent across the two, and combining data from both (such as students with their profiles)
needs two queries merged in code.

---

## PostgreSQL (Users, Roles, UserRoles, StudentTeacher)

### Pros

1. **The data is relational, so a relational DB fits it.** `UserRoles` and `StudentTeacher` are
   many-to-many join tables, and `StudentTeacher` is self-referencing (User ↔ User). This is the
   classic case SQL was built for. In MongoDB we would need arrays of IDs on both sides and keep
   them in sync ourselves.
2. **The database enforces integrity, not our code.** Foreign keys with `ON DELETE CASCADE` mean
   that deleting a user can never leave a role assignment or a teacher link behind. The composite
   primary key (`userId`, `roleId`) makes it impossible for one user to get the same role twice.
   That holds even if someone edits the database by hand or a bug slips into the code.
3. **Transactions (ACID) for security-critical writes.** Registering a user
   (`src/Services/AuthService.ts`) creates the user and assigns the Student role in one
   transaction. Either both succeed or neither does, so a user without a role can never exist.
   For auth and authorization data, "half-written" is a security problem, not just a bug.
4. **Strict schema for data that must be correct.** Usernames, emails and password hashes are
   `NOT NULL` with fixed types. Auth data has a stable, well-known shape that rarely changes, so
   schema flexibility gains us nothing here and strictness protects us.
5. **Joins answer access-control questions in one query.** The admin `GET /users` endpoint gets
   every user with their active role in a single joined query, ordered by `assignmentDate`. "Is
   this teacher linked to this student?" is one indexed lookup on the join table.
6. **Built-in features we use:** case-insensitive search (`iLike` in `AdminController`) and unique
   constraints (role titles).

### Cons

1. **Schema changes need migrations.** We currently use `sequelize.sync({alter: true})`, which is
   fine for development but risky in production: it can drop or alter columns automatically. A
   real deployment would need proper migrations.
2. **Less flexible.** Adding a field means changing the schema, not just writing a new key.
3. **Harder to scale horizontally** than MongoDB. That doesn't matter at the scale of this project,
   but it is a general limitation.
4. **ORM overhead.** Sequelize adds conventions that aren't obvious, such as the default column
   names `UserId` / `StudentId` in `StudentTeacher`.

---

## MongoDB (books, readinglists, readingprofiles)

### Pros

1. **The catalogue is heterogeneous.** One collection holds Books, NewspaperArticles, Magazines,
   OnlineArticles, PoetryBundles and BlogPosts. Some have `tags` and some have a `sourceUrl`
   instead (see `src/scripts/importBooks.ts`). In SQL we would need nullable columns everywhere,
   or a table per material type. In MongoDB each document simply has the fields it needs.
2. **Arrays are first-class.** `genre`, `tags` and `readingLevel` on books, and `genre` on reading
   profiles, are all arrays, with **indexes on array fields** (multikey indexes on `tags` and
   `genre`). Filtering on them is a simple `$in` (`BookController`). In SQL each of these would be
   its own join table: `book_genres`, `book_tags`, `book_levels`, `profile_genres`…
3. **A reading list is one document.** The list, its book references and the per-book `status`
   map live together. Reading or updating "my reading list" is one document read or write, and it
   is atomic at the document level. `$addToSet` with `upsert` adds a book without duplicates and
   creates the list if it doesn't exist, all in one operation.
4. **Suited to the recommendation feature.** The aggregation pipeline gives us things like
   `$sample` for random advice for anonymous users (`BookAdviceController`), and filtering on
   overlapping arrays (genres, tags) is natural.
5. **The schema can evolve without migrations.** The `status` map on reading lists was added later,
   and old lists without it are still valid (a missing entry means `NotRead`). No migration, no
   downtime, no `ALTER TABLE`. This suits the reading features, which are still changing.
6. **Bulk import from a spreadsheet** maps naturally: each Excel row becomes a document, inserted
   with `insertMany`.

### Cons

1. **No enforced references.** `readinglists.book[]` points to `books._id`, but nothing enforces
   it. Concretely: `importBooks.ts` runs `Book.deleteMany({})` and re-inserts every book, and the
   new books get **new ObjectIds**. Every existing reading list then points to books that no
   longer exist.
2. **No unique constraints unless we add them.** One reading list and one reading profile per user
   is intended, but no unique index on `userID` enforces it. Two concurrent requests could create
   two lists.
3. **Weak typing by default.** `languageLevel`, `length` and `ReadingMotivation` are plain
   `String` in the schema, even though enums exist in TypeScript. MongoDB accepts any value unless
   we add `enum` validation.
4. **Weaker multi-document consistency.** MongoDB has transactions, but they are clunkier to use,
   and we don't use them.

---

## The two-database split itself

### Pros

1. **Each kind of data goes where it fits** (polyglot persistence). Data that is **strict,
   relational and security-sensitive** goes to PostgreSQL; data that is **varied, nested,
   array-heavy and evolving** goes to MongoDB.
2. **Separation of concerns.** Auth is isolated from content. A broken book import or a buggy
   reading-list update can't corrupt user accounts or permissions.
3. **Independent scaling and tuning.** The catalogue and recommendation queries are read-heavy,
   while auth is small and write-critical. Each database can be tuned, backed up or scaled for its
   own workload.
4. **Security boundary.** Password hashes live in a different system from public catalogue data.
   A leak or misconfigured access to the content database doesn't expose credentials.

### Cons

1. **No foreign keys between the databases.** `readinglists.userID` and `readingprofiles.userID`
   reference `Users.id` in PostgreSQL, and neither database can enforce that. If a user is deleted
   in PostgreSQL, their reading list and profile in MongoDB become **orphans**: the `CASCADE`
   doesn't reach MongoDB. (There is no delete-user endpoint yet, so this hasn't come up, but it
   would as soon as one is added.)
2. **No joins between the databases, so the application does the join.** `GET /students` in
   `StudentTeacherController` fetches the linked students from PostgreSQL, then queries MongoDB
   with `$in`, then merges the results in JavaScript with a `Map`. That's two round-trips and
   extra code for what would be one `JOIN` in a single database.
3. **No transactions between the databases.** We can't atomically "create user + create empty
   reading profile". If one write succeeds and the other fails, the data is inconsistent and there
   is no rollback.
4. **Twice the operational work:** two connections, two libraries with different APIs (Sequelize
   and Mongoose), two backup strategies, two things that can be down. The app connects to both on
   startup and is broken if either one fails.
5. **Mismatched ID types.** PostgreSQL uses integer IDs and MongoDB uses ObjectIds, so `userID` in
   MongoDB is a `Number` that has to be converted (`Number(req.user.userid)` appears throughout
   the code).
6. **More for developers to learn.** Contributors need to know SQL/Sequelize *and*
   MongoDB/Mongoose.

---

## Possible mitigations

Ways to reduce the cons above:

- Add a unique index on `userID` in `readinglists` and `readingprofiles`.
- When a user is deleted, also delete their reading list and reading profile in MongoDB.
- Make the book import upsert on a stable key instead of wiping and re-inserting the collection,
  so existing reading lists keep pointing to valid books.
- Add `enum` validation to the MongoDB schemas for `languageLevel`, `length` and
  `ReadingMotivation`.
- Replace `sequelize.sync({alter: true})` with migrations before running in production.
