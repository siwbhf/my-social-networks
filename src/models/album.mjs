import mongoose from 'mongoose';

const ObjectId = mongoose.Schema.Types.ObjectId;

const albumSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: 'Event', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: ObjectId, ref: 'User', required: true }
}, {
  collection: 'albums',
  versionKey: false,
  timestamps: true
});

const AlbumModel = mongoose.model('Album', albumSchema);

export default AlbumModel;