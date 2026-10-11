import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const ticketTypeSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  price: { type: Number, required: true, min: 0 },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: 'quantity doit être un entier' }
  },
  sold: { type: Number, default: 0, min: 0 }
}, {
  collection: 'ticket_types',
  versionKey: false,
  timestamps: true
});

ticketTypeSchema.index({ event: 1, name: 1 }, { unique: true });

const TicketTypeModel = mongoose.model('TicketType', ticketTypeSchema);

export default TicketTypeModel;