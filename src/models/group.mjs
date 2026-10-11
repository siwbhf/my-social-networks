import mongoose from 'mongoose';
import { removeThreads } from '../helpers/cascade.mjs';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000 },
  icon: String,
  coverPhoto: String,
  type: { type: String, enum: ['public', 'private', 'secret'], default: 'public' },
  membersCanPost: { type: Boolean, default: true },
  membersCanCreateEvents: { type: Boolean, default: false },
  admins: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    validate: {
      validator: (v) => v.length >= 1,
      message: 'Un groupe doit avoir au moins un administrateur'
    }
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  collection: 'groups',
  versionKey: false,
  timestamps: true
});

groupSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await removeThreads({ group: this._id });
  await mongoose.model('Event').updateMany({ group: this._id }, { $unset: { group: 1 } });
});

const GroupModel = mongoose.model('Group', groupSchema);

export default GroupModel;