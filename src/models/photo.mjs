import mongoose from 'mongoose';
import validator from 'validator';

const ObjectId = mongoose.Schema.Types.ObjectId;

const photoSchema = new mongoose.Schema({
  album: { type: ObjectId, ref: 'Album', required: true, index: true },
  event: { type: ObjectId, ref: 'Event', required: true },
  author: { type: ObjectId, ref: 'User', required: true },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (v) => validator.isURL(v, { protocols: ['http', 'https'], require_protocol: true }),
      message: 'URL de photo invalide'
    }
  },
  caption: { type: String, trim: true, maxlength: 300 }
}, {
  collection: 'photos',
  versionKey: false,
  timestamps: true
});

const PhotoModel = mongoose.model('Photo', photoSchema);

export default PhotoModel;