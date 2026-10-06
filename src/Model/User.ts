import {
    BelongsToManyAddAssociationMixin,
    BelongsToManyGetAssociationsMixin,
    BelongsToManyHasAssociationMixin,
    BelongsToManyRemoveAssociationMixin,
    DataTypes,
    Model
} from "sequelize";
import {sequelize} from "../Data/DB";
import type Role from "./Role";

class User extends Model {
    declare id: number;
    declare userName: string;
    declare email: string;
    declare password: string;
    //Only populated when Role is included in the query
    declare Roles?: Role[];

    //StudentTeacher mixins, added by the associations in associations.ts
    declare getStudents: BelongsToManyGetAssociationsMixin<User>;
    declare hasStudent: BelongsToManyHasAssociationMixin<User, number>;
    declare getTeachers: BelongsToManyGetAssociationsMixin<User>;
    declare addTeacher: BelongsToManyAddAssociationMixin<User, number>;
    declare removeTeacher: BelongsToManyRemoveAssociationMixin<User, number>;
}

User.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {sequelize, modelName: 'User'});

export default User;