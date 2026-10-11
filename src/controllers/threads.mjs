import mongoose from 'mongoose';
import ThreadModel from '../models/thread.mjs';
import MessageModel from '../models/message.mjs';
import requireUser from '../middlewares/requireUser.mjs';
import {
  has, isOrganizer, isParticipant, fail, handleError, loadEvent, loadGroup
} from '../helpers/access.mjs';

async function getOrCreateThread(filter) {
  const existing = await ThreadModel.findOne(filter);
  if (existing) return existing;
  try {
    return await ThreadModel.create(filter);
  } catch (error) {
    if (error.code === 11000) return ThreadModel.findOne(filter);
    throw error;
  }
}

// droits de l'utilisateur dans le fil (groupe ou evenement)
async function getRights(res, thread, user) {
  if (thread.group) {
    const group = await loadGroup(res, thread.group, user);
    if (!group) return null;
    const admin = has(group.admins, user._id);
    return { moderator: admin, canPost: admin || group.membersCanPost };
  }

  const event = await loadEvent(res, thread.event, user);
  if (!event) return null;
  if (!isParticipant(event, user)) {
    fail(res, 403, "Réservé aux participants de l'événement");
    return null;
  }
  return { moderator: isOrganizer(event, user), canPost: true };
}

async function loadThread(res, id) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return null;
  }
  const thread = await ThreadModel.findById(id);
  if (!thread) {
    fail(res, 404, 'Thread not found');
    return null;
  }
  return thread;
}

const Threads = class Threads {
  constructor(app) {
    this.app = app;
    this.run();
  }

  getGroupThread() {
    this.app.get('/groups/:id/thread', requireUser, async (req, res) => {
      try {
        const group = await loadGroup(res, req.params.id, req.user);
        if (!group) return;
        res.status(200).json(await getOrCreateThread({ group: group._id }));
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getEventThread() {
    this.app.get('/events/:id/thread', requireUser, async (req, res) => {
      try {
        const event = await loadEvent(res, req.params.id, req.user);
        if (!event) return;
        if (!isParticipant(event, req.user)) {
          return fail(res, 403, "Réservé aux participants de l'événement");
        }
        res.status(200).json(await getOrCreateThread({ event: event._id }));
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getMessages() {
    this.app.get('/threads/:id/messages', requireUser, async (req, res) => {
      try {
        const thread = await loadThread(res, req.params.id);
        if (!thread) return;
        if (!(await getRights(res, thread, req.user))) return;

        const messages = await MessageModel.find({ thread: thread._id })
          .sort({ createdAt: 1 })
          .populate('author', 'firstname lastname');
        res.status(200).json(messages);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  postMessage() {
    this.app.post('/threads/:id/messages', requireUser, async (req, res) => {
      try {
        const thread = await loadThread(res, req.params.id);
        if (!thread) return;
        const rights = await getRights(res, thread, req.user);
        if (!rights) return;

        const { content, parentMessage } = req.body;

        if (parentMessage) {
          if (!mongoose.isValidObjectId(parentMessage)) {
            return fail(res, 400, 'parentMessage invalide');
          }
          const parent = await MessageModel.findOne({ _id: parentMessage, thread: thread._id });
          if (!parent) {
            return fail(res, 404, 'Message parent introuvable dans ce fil');
          }
        } else if (!rights.canPost) {
          return fail(res, 403, 'Les membres ne peuvent pas publier dans ce groupe (réponses uniquement)');
        }

        const message = await MessageModel.create({
          thread: thread._id,
          author: req.user._id,
          content,
          parentMessage: parentMessage || null
        });
        res.status(201).json(message);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getReplies() {
    this.app.get('/messages/:id/replies', requireUser, async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return fail(res, 400, 'Id invalide');
        }
        const message = await MessageModel.findById(req.params.id);
        if (!message) return fail(res, 404, 'Message not found');

        const thread = await ThreadModel.findById(message.thread);
        if (!(await getRights(res, thread, req.user))) return;

        const replies = await MessageModel.find({ parentMessage: message._id })
          .sort({ createdAt: 1 })
          .populate('author', 'firstname lastname');
        res.status(200).json(replies);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deleteMessage() {
    this.app.delete('/messages/:id', requireUser, async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return fail(res, 400, 'Id invalide');
        }
        const message = await MessageModel.findById(req.params.id);
        if (!message) return fail(res, 404, 'Message not found');

        const thread = await ThreadModel.findById(message.thread);
        const rights = await getRights(res, thread, req.user);
        if (!rights) return;

        if (!message.author.equals(req.user._id) && !rights.moderator) {
          return fail(res, 403, 'Action non autorisée');
        }

        //supprime le message et toutes ses réponses
        const ids = [message._id];
        let frontier = [message._id];
        while (frontier.length > 0) {
          const children = await MessageModel.find({ parentMessage: { $in: frontier } }, '_id');
          frontier = children.map((c) => c._id);
          ids.push(...frontier);
        }
        await MessageModel.deleteMany({ _id: { $in: ids } });

        res.status(200).json({ code: 200, message: 'Message supprimé' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  run() {
    this.getGroupThread();
    this.getEventThread();
    this.getMessages();
    this.postMessage();
    this.getReplies();
    this.deleteMessage();
  }
};

export default Threads;