import mongoose from 'mongoose';
import EventModel from '../models/event.mjs';
import GroupModel from '../models/group.mjs';
import UserModel from '../models/user.mjs';
import requireUser from '../middlewares/requireUser.mjs';

const has = (list, userId) => list.some((id) => id.equals(userId));
const isOrganizer = (event, user) => has(event.organizers, user._id);
const isParticipant = (event, user) => has(event.participants, user._id);
const canSee = (event, user) =>
  event.isPublic || isOrganizer(event, user) || isParticipant(event, user);

const EVENT_FIELDS = ['name', 'description', 'startDate', 'endDate', 'location',
  'coverPhoto', 'isPublic', 'shoppingListEnabled', 'carpoolEnabled'];

async function validUserIds(ids = []) {
  const clean = ids.filter((id) => mongoose.isValidObjectId(id));
  const found = await UserModel.find({ _id: { $in: clean } }, '_id');
  return found.map((u) => u._id);
}

const Events = class Events {
  constructor(app) {
    this.app = app;
    this.run();
  }

  async loadEvent(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).json({ code: 400, message: 'Id invalide' });
      return null;
    }
    const event = await EventModel.findById(req.params.id);
    if (!event || !canSee(event, req.user)) {
      res.status(404).json({ code: 404, message: 'Event not found' });
      return null;
    }
    return event;
  }

  handleError(res, error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ code: 400, message: error.message });
    }
    console.log(error);
    return res.status(500).json({ code: 500, message: error.message });
  }

  createEvent() {
    this.app.post('/events', requireUser, async (req, res) => {
      try {
        const data = {};
        EVENT_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

        const extraOrganizers = await validUserIds(req.body.organizers);
        const extraParticipants = await validUserIds(req.body.participants);

        const event = new EventModel({
          ...data,
          organizers: [...new Set([req.user._id, ...extraOrganizers].map(String))],
          participants: [...new Set([req.user._id, ...extraOrganizers, ...extraParticipants].map(String))]
        });
        await event.save();

        res.status(201).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  createEventInGroup() {
    this.app.post('/groups/:groupId/events', requireUser, async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.groupId)) {
          return res.status(400).json({ code: 400, message: 'Id invalide' });
        }
        const group = await GroupModel.findById(req.params.groupId);
        if (!group || !has(group.members, req.user._id)) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }

        const admin = has(group.admins, req.user._id);
        if (!admin && !group.membersCanCreateEvents) {
          return res.status(403).json({ code: 403, message: "Les membres ne peuvent pas créer d'événements dans ce groupe" });
        }

        const data = {};
        EVENT_FIELDS.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f]; });

        const inviteAll = req.body.inviteAll !== false;
        const participants = inviteAll ? group.members : [req.user._id];

        const event = new EventModel({
          ...data,
          group: group._id,
          organizers: [req.user._id],
          participants: [...new Set([req.user._id, ...participants].map(String))]
        });
        await event.save();

        res.status(201).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  getEvents() {
    this.app.get('/events', requireUser, async (req, res) => {
      try {
        const events = await EventModel.find({
          $or: [
            { isPublic: true },
            { organizers: req.user._id },
            { participants: req.user._id }
          ]
        }).sort({ startDate: 1 });
        res.status(200).json(events);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  getEventById() {
    this.app.get('/events/:id', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;

        await event.populate([
          { path: 'organizers', select: 'firstname lastname' },
          { path: 'participants', select: 'firstname lastname' }
        ]);
        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  updateEvent() {
    this.app.put('/events/:id', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!isOrganizer(event, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        }

        EVENT_FIELDS.forEach((f) => { if (req.body[f] !== undefined) event[f] = req.body[f]; });
        await event.save();

        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  deleteEvent() {
    this.app.delete('/events/:id', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!isOrganizer(event, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        }

        await event.deleteOne();
        res.status(200).json({ code: 200, message: 'Événement supprimé' });
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  addParticipant() {
    this.app.post('/events/:id/participants', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!isOrganizer(event, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        }

        const [userId] = await validUserIds([req.body.userId]);
        if (!userId) {
          return res.status(400).json({ code: 400, message: 'userId invalide ou inconnu' });
        }
        if (has(event.participants, userId)) {
          return res.status(409).json({ code: 409, message: 'Déjà participant' });
        }

        event.participants.push(userId);
        await event.save();
        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  joinEvent() {
    this.app.post('/events/:id/join', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!event.isPublic) {
          return res.status(403).json({ code: 403, message: 'Événement privé : invitation requise' });
        }
        if (isParticipant(event, req.user)) {
          return res.status(409).json({ code: 409, message: 'Déjà participant' });
        }

        event.participants.push(req.user._id);
        await event.save();
        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  removeParticipant() {
    this.app.delete('/events/:id/participants/:userId', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;

        const self = req.user._id.equals(req.params.userId);
        if (!isOrganizer(event, req.user) && !self) {
          return res.status(403).json({ code: 403, message: 'Action non autorisée' });
        }

        const remainingOrganizers = event.organizers.filter((o) => !o.equals(req.params.userId));
        if (remainingOrganizers.length === 0) {
          return res.status(400).json({ code: 400, message: 'Impossible de retirer le dernier organisateur' });
        }

        event.organizers = remainingOrganizers;
        event.participants = event.participants.filter((p) => !p.equals(req.params.userId));
        await event.save();
        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  addOrganizer() {
    this.app.post('/events/:id/organizers', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!isOrganizer(event, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        }

        const [userId] = await validUserIds([req.body.userId]);
        if (!userId) {
          return res.status(400).json({ code: 400, message: 'userId invalide ou inconnu' });
        }
        if (has(event.organizers, userId)) {
          return res.status(409).json({ code: 409, message: 'Déjà organisateur' });
        }

        event.organizers.push(userId);
        if (!has(event.participants, userId)) event.participants.push(userId);
        await event.save();
        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  inviteGroup() {
    this.app.post('/events/:id/invite-group', requireUser, async (req, res) => {
      try {
        const event = await this.loadEvent(req, res);
        if (!event) return;
        if (!isOrganizer(event, req.user)) {
          return res.status(403).json({ code: 403, message: 'Réservé aux organisateurs' });
        }

        const { groupId } = req.body;
        if (!groupId || !mongoose.isValidObjectId(groupId)) {
          return res.status(400).json({ code: 400, message: 'groupId invalide' });
        }
        const group = await GroupModel.findById(groupId);
        if (!group || !has(group.members, req.user._id)) {
          return res.status(404).json({ code: 404, message: 'Group not found' });
        }

        const merged = new Set([...event.participants, ...group.members].map(String));
        event.participants = [...merged];
        await event.save();

        res.status(200).json(event);
      } catch (error) {
        this.handleError(res, error);
      }
    });
  }

  run() {
    this.createEvent();
    this.createEventInGroup();
    this.getEvents();
    this.getEventById();
    this.updateEvent();
    this.deleteEvent();
    this.addParticipant();
    this.joinEvent();
    this.removeParticipant();
    this.addOrganizer();
    this.inviteGroup();
  }
};

export default Events;
export { isOrganizer, isParticipant, canSee };