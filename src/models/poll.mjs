import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const optionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 200 }
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true, maxlength: 300 },
  options: {
    type: [optionSchema],
    validate: {
      validator: (v) => v.length >= 2,
      message: 'Une question doit proposer au moins 2 réponses'
    }
  }
});

const pollSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true, index: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  questions: {
    type: [questionSchema],
    validate: {
      validator: (v) => v.length >= 1,
      message: 'Un sondage doit contenir au moins une question'
    }
  }
}, {
  collection: 'polls',
  versionKey: false,
  timestamps: true
});

const PollModel = mongoose.model('Poll', pollSchema);

export default PollModel;