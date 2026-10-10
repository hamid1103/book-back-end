# fastify-backend

## requirements
To run the server locally, you need:  
- A mongoDB server
- A postgres server

## .env setup

Copy `.env` to `.env` and fill in real values before running the app:

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

## Known issues

Found while working on type-safety for `request.user`, not yet fixed:

- ***Update by Corvo (Hamid): This is not 'unused'. It needs to be there for sequelize to initialize the model.*** **Unused import in `src/index.ts`.** `import "./Model/associations";` (line 6) is dead code — harmless, but worth removing.