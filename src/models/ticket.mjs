import mongoose from 'mongoose';
import validator from 'validator';

const ObjectId = mongoose.Schema.Types.ObjectId;

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true }
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true },
  ticketType: { type: ObjectId, ref: 'TicketType', required: true },
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: { validator: validator.isEmail, message: 'Email invalide' }
  },
  address: { type: addressSchema, required: true },
  purchaseDate: { type: Date, default: Date.now }
}, {
  collection: 'tickets',
  versionKey: false
});

//unepersonne ne peut obtenir qu'un seul billet par evenement
ticketSchema.index({ event: 1, email: 1 }, { unique: true });

const TicketModel = mongoose.model('Ticket', ticketSchema);

export default TicketModel;