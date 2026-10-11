import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const threadSchema = new mongoose.Schema({
  group: { type: ObjectId, ref: 'Group' },
  event: { type: ObjectId, ref: 'Event' }
}, {
  collection: 'threads',
  versionKey: false,
  timestamps: true
});

threadSchema.pre('validate', function (next) {
  if (Boolean(this.group) === Boolean(this.event)) {
    this.invalidate('group', 'Un fil de discussion doit être lié à un groupe ou à un evenement');
  }
  next();
});

threadSchema.index({ group: 1 }, { unique: true, partialFilterExpression: { group: { $exists: true } } });
threadSchema.index({ event: 1 }, { unique: true, partialFilterExpression: { event: { $exists: true } } });

const ThreadModel = mongoose.model('Thread', threadSchema);

export default ThreadModel;