# Entity Relationship Diagram

The backend uses two databases:

- **PostgreSQL** (Sequelize): `Users`, `Roles`, `UserRoles`, `StudentTeacher`
- **MongoDB** (Mongoose): `books`, `readinglists`, `readingprofiles`

Solid lines are foreign keys enforced by PostgreSQL. Dashed lines are references stored by the
application: MongoDB does not enforce them, and the `userID` links cross from MongoDB to PostgreSQL.

```mermaid
erDiagram
    Users ||--o{ UserRoles : "has"
    Roles ||--o{ UserRoles : "assigned in"
    Users ||--o{ StudentTeacher : "teacher (UserId)"
    Users ||--o{ StudentTeacher : "student (StudentId)"
    Users ||..o| readingprofiles : "userID"
    Users ||..o| readinglists : "userID"
    readinglists }o..o{ books : "book[]"

    Users["Users (PostgreSQL)"] {
        INTEGER id PK "auto increment"
        VARCHAR(255) userName "NOT NULL"
        VARCHAR(255) email "NOT NULL"
        VARCHAR(255) password "NOT NULL, bcrypt hash"
        TIMESTAMPTZ createdAt "NOT NULL"
        TIMESTAMPTZ updatedAt "NOT NULL"
    }
    Roles["Roles (PostgreSQL)"] {
        INTEGER id PK "auto increment"
        VARCHAR(255) title "NOT NULL"
        TIMESTAMPTZ createdAt "NOT NULL"
        TIMESTAMPTZ updatedAt "NOT NULL"
    }
    UserRoles["UserRoles (PostgreSQL)"] {
        INTEGER userId PK, FK "references Users.id, ON DELETE CASCADE"
        INTEGER roleId PK, FK "references Roles.id, ON DELETE CASCADE"
        TIMESTAMPTZ assignmentDate "NOT NULL, default NOW"
        TIMESTAMPTZ createdAt "NOT NULL"
        TIMESTAMPTZ updatedAt "NOT NULL"
    }
    StudentTeacher["StudentTeacher (PostgreSQL)"] {
        INTEGER UserId PK, FK "references Users.id (teacher), ON DELETE CASCADE"
        INTEGER StudentId PK, FK "references Users.id (student), ON DELETE CASCADE"
        TIMESTAMPTZ createdAt "NOT NULL"
        TIMESTAMPTZ updatedAt "NOT NULL"
    }
    books["books (MongoDB)"] {
        ObjectId _id PK
        String title
        String author
        String[] genre
        String description
        String imageUrl
        String[] readingLevel "2F, 3F, 3F+"
        String[] tags "indexed"
        String materialType "Book, NewspaperArticle, Magazine, OnlineArticle, PoetryBundle, BlogPost"
        String sourceUrl
    }
    readinglists["readinglists (MongoDB)"] {
        ObjectId _id PK
        Number userID FK "Users.id (PostgreSQL)"
        ObjectId[] book FK "books._id (ref: Book)"
    }
    readingprofiles["readingprofiles (MongoDB)"] {
        ObjectId _id PK
        Number userID FK "Users.id (PostgreSQL)"
        String languageLevel "A2, B1, B2, C1"
        String[] genre "indexed"
        String length "Short, Medium, Long"
        String ReadingMotivation "ForSchool, ForPleasure, LanguageDevelopment"
    }
```

## Notes

- `UserRoles` is the join table for the many-to-many relation between `Users` and `Roles`. Sequelize
  gives it a composite primary key (`userId`, `roleId`), so a user can have each role only once.
- `StudentTeacher` links teachers to students. It is a many-to-many from `Users` to itself;
  `UserId` is the teacher and `StudentId` the student (Sequelize's default names for
  `User.belongsToMany(User, {as: "Students", through: "StudentTeacher"})`).
- Mongoose adds a `__v` version key to every document; it is left out of the diagram.
- One reading list and one reading profile per user is the intended design (the API looks them up
  with `findOne`), but no unique index on `userID` enforces it yet.
