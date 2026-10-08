import mongoose from "mongoose";
import validator from 'validator'; 

const Schema = new mongoose.Schema({
  firstname: {type: String, required: true, trim: true},
  lastname: {type: String, required: true, trim: true},
  email: {
    type: String,
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
    validate: {validator: validator.isEmail, message: 'Email invalide'}
  },
  age: Number
}, {
  collection: 'users',
  minimize: false,
  versionKey: false
});

const UserModel = mongoose.model('User', Schema);

export default UserModel;