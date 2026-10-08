import mongoose from "mongoose";

const photoSchema = new mongoose.Schema({
  title: {type: String, required: true},
  url: {type: String, required: true},
  description: {type: String},
  created_at: {type: Date, default: Date.now},
  album: {type: mongoose.Schema.Types.ObjectId, ref: 'Album', required: true}
}, {
  collection: 'photos',
  versionKey: false
});

const PhotoModel = mongoose.model('Photo', photoSchema);

export default PhotoModel;