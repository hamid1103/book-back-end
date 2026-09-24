import {DataTypes, Model} from "sequelize";
import {sequelize} from "../Data/DB";

class UserRole extends Model {
    declare userId: number;
    declare roleId: number;
    declare assignmentDate: Date;
}

UserRole.init({
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    assignmentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {sequelize, modelName: 'UserRole'});

export default UserRole;