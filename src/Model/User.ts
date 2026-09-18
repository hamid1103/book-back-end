import {DataTypes, Model} from "sequelize";
import {sequelize} from "../Data/DB";

class User extends Model {
    declare id: string;
    declare userName: string;
    declare email: string;
    declare password: string;
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