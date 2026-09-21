import {DataTypes, Model} from "sequelize";
import {sequelize} from "../Data/DB";
import User from "./User";
import UserRole from "./UserRole";

class Role extends Model {
    declare id: number;
    declare title: string;
}

Role.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    }
}, {sequelize, modelName: 'Role'});

Role.belongsToMany(User, {through: UserRole})

export default Role;