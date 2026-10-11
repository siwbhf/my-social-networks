import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const commentSchema = new mongoose.Schema({
  photo: { type: ObjectId, ref: 'Photo', required: true, index: true },
  event: { type: ObjectId, ref: 'Event', required: true },
  author: { type: ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 }
}, {
  collection: 'comments',
  versionKey: false,
  timestamps: true
});

const CommentModel = mongoose.model('Comment', commentSchema);

export default CommentModel;