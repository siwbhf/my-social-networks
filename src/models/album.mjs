import mongoose from "mongoose";

const albumSchema = new mongoose.Schema({
  title: {type: String, required: true},
  description: {type: String},
  photos: [{type: mongoose.Schema.Types.ObjectId, ref: 'Photo'}],
  created_at: {type: Date, default: Date.now},
}, {
  collection: 'albums',
  versionKey: false
});

const AlbumModel = mongoose.model('Album', albumSchema);

export default AlbumModel;