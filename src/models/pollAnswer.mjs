import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const answerSchema = new mongoose.Schema({
  question: { type: ObjectId, required: true },
  option: { type: ObjectId, required: true }
}, { _id: false });

const pollAnswerSchema = new mongoose.Schema({
  poll: { type: ObjectId, ref: 'Poll', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  answers: { type: [answerSchema], required: true }
}, {
  collection: 'poll_answers',
  versionKey: false,
  timestamps: true
});

//un participant ne répond qu'une fois a un sondage
pollAnswerSchema.index({ poll: 1, user: 1 }, { unique: true });

const PollAnswerModel = mongoose.model('PollAnswer', pollAnswerSchema);

export default PollAnswerModel;