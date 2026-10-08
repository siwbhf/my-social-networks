import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
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

const GroupModel = mongoose.model('Group', groupSchema);

export default GroupModel;