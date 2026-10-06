import User from "./User";
import Role from "./Role";
import UserRole from "./UserRole"

// Associations live here so the model files don't import each other (circular imports leave them undefined)
User.belongsToMany(Role, {through: UserRole, foreignKey: 'userId', otherKey: 'roleId'});
Role.belongsToMany(User, {through: UserRole, foreignKey: 'roleId', otherKey: 'userId'});
//UserId is the teacher, StudentId the student. The keys are Sequelize's defaults, spelled out so the inverse matches
User.belongsToMany(User, {as: "Students", through: "StudentTeacher", foreignKey: "UserId", otherKey: "StudentId"});
User.belongsToMany(User, {as: "Teachers", through: "StudentTeacher", foreignKey: "StudentId", otherKey: "UserId"});

export {User, Role, UserRole};
