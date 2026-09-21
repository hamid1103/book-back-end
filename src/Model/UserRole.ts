import {DataTypes, Model} from "sequelize";
import {sequelize} from "../Data/DB";
import User from "./User";
import Role from "./Role";

class UserRole extends Model {
    declare userId: number;
    declare roleId: number;
    declare assignmentDate: Date;
}

UserRole.init({
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Role,
            key: 'id'
        },
    },
    assignmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {sequelize, modelName: 'UserRole'});

export default UserRole;