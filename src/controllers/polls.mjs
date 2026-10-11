import mongoose from 'mongoose';
import PollModel from '../models/poll.mjs';
import PollAnswerModel from '../models/pollAnswer.mjs';
import requireUser from '../middlewares/requireUser.mjs';
import { removePollData } from '../helpers/cascade.mjs';
import {
  isOrganizer, fail, handleError, loadParticipantEvent, loadOrganizerEvent
} from '../helpers/access.mjs';

async function loadPoll(res, id, user) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return {};
  }
  const poll = await PollModel.findById(id);
  if (!poll) {
    fail(res, 404, 'Poll not found');
    return {};
  }
  const event = await loadParticipantEvent(res, poll.event, user);
  if (!event) return {};
  return { poll, event };
}

//les options peuvent etre envoyées sous forme de texte ou d'objet label
function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => ({
    text: q && q.text,
    options: Array.isArray(q && q.options)
      ? q.options.map((o) => (typeof o === 'string' ? { label: o } : o))
      : []
  }));
}

// verifie qu'il y a exactement une réponse valide par question
export function checkAnswers(poll, answers) {
  if (!Array.isArray(answers) || answers.length !== poll.questions.length) {
    return 'Il faut répondre à chaque question du sondage';
  }
  const seen = new Set();
  for (const answer of answers) {
    const question = answer && mongoose.isValidObjectId(answer.question)
      ? poll.questions.id(answer.question)
      : null;
    if (!question) return 'Question inconnue dans ce sondage';
    if (seen.has(String(question._id))) return 'Une seule réponse par question';
    seen.add(String(question._id));

    const option = answer && mongoose.isValidObjectId(answer.option)
      ? question.options.id(answer.option)
      : null;
    if (!option) return `Réponse invalide pour la question "${question.text}"`;
  }
  return null;
}

const Polls = class Polls {
  constructor(app) {
    this.app = app;
    this.run();
  }

  createPoll() {
    this.app.post('/events/:id/polls', requireUser, async (req, res) => {
      try {
        const event = await loadOrganizerEvent(res, req.params.id, req.user);
        if (!event) return;

        const poll = await PollModel.create({
          event: event._id,
          createdBy: req.user._id,
          title: req.body.title,
          questions: normalizeQuestions(req.body.questions)
        });
        res.status(201).json(poll);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getPolls() {
    this.app.get('/events/:id/polls', requireUser, async (req, res) => {
      try {
        const event = await loadParticipantEvent(res, req.params.id, req.user);
        if (!event) return;

        const polls = await PollModel.find({ event: event._id }).sort({ createdAt: 1 });
        res.status(200).json(polls);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getPollById() {
    this.app.get('/polls/:id', requireUser, async (req, res) => {
      try {
        const { poll } = await loadPoll(res, req.params.id, req.user);
        if (!poll) return;
        res.status(200).json(poll);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deletePoll() {
    this.app.delete('/polls/:id', requireUser, async (req, res) => {
      try {
        const { poll, event } = await loadPoll(res, req.params.id, req.user);
        if (!poll) return;
        if (!isOrganizer(event, req.user)) {
          return fail(res, 403, 'Réservé aux organisateurs');
        }

        await removePollData({ _id: poll._id });
        res.status(200).json({ code: 200, message: 'Sondage supprimé' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  answerPoll() {
    this.app.post('/polls/:id/answers', requireUser, async (req, res) => {
      try {
        const { poll } = await loadPoll(res, req.params.id, req.user);
        if (!poll) return;

        const problem = checkAnswers(poll, req.body.answers);
        if (problem) return fail(res, 400, problem);

        const saved = await PollAnswerModel.create({
          poll: poll._id,
          user: req.user._id,
          answers: req.body.answers.map((a) => ({ question: a.question, option: a.option }))
        });
        res.status(201).json(saved);
      } catch (error) {
        if (error.code === 11000) {
          return fail(res, 409, 'Vous avez déjà répondu à ce sondage (utilisez PUT pour modifier)');
        }
        handleError(res, error);
      }
    });
  }

  updateAnswer() {
    this.app.put('/polls/:id/answers', requireUser, async (req, res) => {
      try {
        const { poll } = await loadPoll(res, req.params.id, req.user);
        if (!poll) return;

        const problem = checkAnswers(poll, req.body.answers);
        if (problem) return fail(res, 400, problem);

        const saved = await PollAnswerModel.findOneAndUpdate(
          { poll: poll._id, user: req.user._id },
          { answers: req.body.answers.map((a) => ({ question: a.question, option: a.option })) },
          { new: true }
        );
        if (!saved) return fail(res, 404, "Vous n'avez pas encore répondu à ce sondage");

        res.status(200).json(saved);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getResults() {
    this.app.get('/polls/:id/results', requireUser, async (req, res) => {
      try {
        const { poll } = await loadPoll(res, req.params.id, req.user);
        if (!poll) return;

        const all = await PollAnswerModel.find({ poll: poll._id });
        const counts = new Map();
        all.forEach((entry) => {
          entry.answers.forEach((a) => {
            const key = `${a.question}:${a.option}`;
            counts.set(key, (counts.get(key) || 0) + 1);
          });
        });

        res.status(200).json({
          poll: poll._id,
          title: poll.title,
          totalResponses: all.length,
          questions: poll.questions.map((q) => ({
            question: q._id,
            text: q.text,
            options: q.options.map((o) => ({
              option: o._id,
              label: o.label,
              votes: counts.get(`${q._id}:${o._id}`) || 0
            }))
          }))
        });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  run() {
    this.createPoll();
    this.getPolls();
    this.getPollById();
    this.deletePoll();
    this.answerPoll();
    this.updateAnswer();
    this.getResults();
  }
};

export default Polls;