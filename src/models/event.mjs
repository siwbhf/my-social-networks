import mongoose from 'mongoose';
import { removeEventData } from '../helpers/cascade.mjs';

const ObjectId = mongoose.Schema.Types.ObjectId;

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, trim: true, maxlength: 2000 },
  startDate: { type: Date, required: true },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v) {
        return !this.startDate || v > this.startDate;
      },
      message: 'endDate doit être postérieure à startDate'
    }
  },
  location: { type: String, required: true, trim: true },
  coverPhoto: String,
  isPublic: { type: Boolean, default: false },
  organizers: {
    type: [{ type: ObjectId, ref: 'User' }],
    validate: {
      validator: (v) => v.length >= 1,
      message: 'Un événement doit avoir au moins un organisateur'
    }
  },
  participants: [{ type: ObjectId, ref: 'User' }],
  group: { type: ObjectId, ref: 'Group' },
  shoppingListEnabled: { type: Boolean, default: false },
  carpoolEnabled: { type: Boolean, default: false }
}, {
  collection: 'events',
  versionKey: false,
  timestamps: true
});

eventSchema.pre('deleteOne', { document: true, query: false }, async function () {
  await removeEventData(this._id);
});

const EventModel = mongoose.model('Event', eventSchema);

export default EventModel;