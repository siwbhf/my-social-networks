import mongoose from 'mongoose';
import UserModel from '../models/user.mjs';

export default async function requireUser(req, res, next) {
  try {
    const userId = req.header('x-user-id');

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ code: 401, message: 'Header x-user-id manquant ou invalide' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(401).json({ code: 401, message: 'Utilisateur inconnu' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
}