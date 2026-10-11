import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const messageSchema = new mongoose.Schema({
  thread: { type: ObjectId, ref: 'Thread', required: true, index: true },
  author: { type: ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  parentMessage: { type: ObjectId, ref: 'Message', default: null }
}, {
  collection: 'messages',
  versionKey: false,
  timestamps: true
});

const MessageModel = mongoose.model('Message', messageSchema);

export default MessageModel;