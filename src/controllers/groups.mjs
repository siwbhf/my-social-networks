import mongoose from 'mongoose';
import GroupModel from '../models/group.mjs';
import UserModel from '../models/user.mjs';
import requireUser from '../middlewares/requireUser.mjs';

const isAdmin = (group, user) => group.admins.some((a) => a.equals(user._id));
const isMember = (group, user) => group.members.some((m) => m.equals(user._id));

const Groups = class Groups {
  constructor(app) {
    this.app = app;
    this.run();
  }

  createGroup() {
    this.app.post('/groups', requireUser, async (req, res) => {
      try {
        const { name, description, icon, coverPhoto, type,
                membersCanPost, membersCanCreateEvents } = req.body;

        const group = new GroupModel({
          name, description, icon, coverPhoto, type,
          membersCanPost, membersCanCreateEvents,
          admins: [req.user._id],
          members: [req.user._id]
        });
        await group.save();

        res.status(201).json(group);
      } catch (error) {
        if (error.name === 'ValidationError') {
          return res.status(400).json({ code: 400, message: error.message });
        }
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  getGroups() {
    this.app.get('/groups', requireUser, async (req, res) => {
      try {
        // Un groupe secret n'est visible que par ses membres
        const groups = await GroupModel.find({
          $or: [
            { type: { $in: ['public', 'private'] } },
            { members: req.user._id }
          ]
        });
        res.status(200).json(groups);
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  getGroupById() {
    this.app.get('/groups/:id', requireUser, async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return res.status(400).json({ code: 400, message: 'Id invalide' });
        }

        const group = await GroupModel.findById(req.params.id)
          .populate('admins', 'firstname lastname')
          .populate('members', 'firstname lastname');

        const hidden = group && group.type === 'secret'
          && !group.members.some((m) => m._id.equals(req.user._id));

        if (!group || hidden) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }

        res.status(200).json(group);
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  updateGroup() {
    this.app.put('/groups/:id', requireUser, async (req, res) => {
      try {
        const group = await GroupModel.findById(req.params.id);
        if (!group) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }
        if (!isAdmin(group, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });
        }

        const fields = ['name', 'description', 'icon', 'coverPhoto', 'type',
                        'membersCanPost', 'membersCanCreateEvents'];
        fields.forEach((f) => {
          if (req.body[f] !== undefined) group[f] = req.body[f];
        });

        await group.save();
        res.status(200).json(group);
      } catch (error) {
        if (error.name === 'ValidationError') {
          return res.status(400).json({ code: 400, message: error.message });
        }
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  deleteGroup() {
    this.app.delete('/groups/:id', requireUser, async (req, res) => {
      try {
        const group = await GroupModel.findById(req.params.id);
        if (!group) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }
        if (!isAdmin(group, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });
        }

        await group.deleteOne();
        res.status(200).json({ code: 200, message: 'Groupe supprimé' });
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  addMember() {
    this.app.post('/groups/:id/members', requireUser, async (req, res) => {
      try {
        const group = await GroupModel.findById(req.params.id);
        if (!group) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }
        if (!isAdmin(group, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });
        }

        const { userId } = req.body;
        if (!userId || !mongoose.isValidObjectId(userId) || !(await UserModel.exists({ _id: userId }))) {
          return res.status(400).json({ code: 400, message: 'userId invalide ou inconnu' });
        }

        if (group.members.some((m) => m.equals(userId))) {
          return res.status(409).json({ code: 409, message: 'Déjà membre du groupe' });
        }

        group.members.push(userId);
        await group.save();
        res.status(200).json(group);
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  removeMember() {
    this.app.delete('/groups/:id/members/:userId', requireUser, async (req, res) => {
      try {
        const group = await GroupModel.findById(req.params.id);
        if (!group) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }

        // Un admin retire n'importe qui, un membre peut se retirer lui-même
        const self = req.user._id.equals(req.params.userId);
        if (!isAdmin(group, req.user) && !self) {
          return res.status(403).json({ code: 403, message: 'Action non autorisée' });
        }

        const remainingAdmins = group.admins.filter((a) => !a.equals(req.params.userId));
        if (remainingAdmins.length === 0) {
          return res.status(400).json({ code: 400, message: 'Impossible de retirer le dernier administrateur' });
        }

        group.admins = remainingAdmins;
        group.members = group.members.filter((m) => !m.equals(req.params.userId));
        await group.save();

        res.status(200).json(group);
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  addAdmin() {
    this.app.post('/groups/:id/admins', requireUser, async (req, res) => {
      try {
        const group = await GroupModel.findById(req.params.id);
        if (!group) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }
        if (!isAdmin(group, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux administrateurs' });
        }

        const { userId } = req.body;
        if (!userId || !group.members.some((m) => m.equals(userId))) {
          return res.status(400).json({ code: 400, message: "L'utilisateur doit déjà être membre" });
        }
        if (group.admins.some((a) => a.equals(userId))) {
          return res.status(409).json({ code: 409, message: 'Déjà administrateur' });
        }

        group.admins.push(userId);
        await group.save();
        res.status(200).json(group);
      } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }

  run() {
    this.createGroup();
    this.getGroups();
    this.getGroupById();
    this.updateGroup();
    this.deleteGroup();
    this.addMember();
    this.removeMember();
    this.addAdmin();
  }
};

export default Groups;
export { isAdmin, isMember };