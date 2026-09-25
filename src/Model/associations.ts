import User from "./User";
import Role from "./Role";
import UserRole from "./UserRole"

// Associations live here so the model files don't import each other (circular imports leave them undefined)
User.belongsToMany(Role, {through: UserRole, foreignKey: 'userId', otherKey: 'roleId'});
Role.belongsToMany(User, {through: UserRole, foreignKey: 'roleId', otherKey: 'userId'});
User.belongsToMany(User, {as: "Students", through: "StudentTeacher"});

export {User, Role, UserRole};
