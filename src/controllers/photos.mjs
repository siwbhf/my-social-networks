import mongoose from 'mongoose';
import PhotoModel from '../models/photo.mjs';
import CommentModel from '../models/comment.mjs';
import requireUser from '../middlewares/requireUser.mjs';
import { loadAlbum } from './albums.mjs';
import { isOrganizer, fail, handleError, loadParticipantEvent } from '../helpers/access.mjs';

async function loadPhoto(res, id, user) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return {};
  }
  const photo = await PhotoModel.findById(id);
  if (!photo) {
    fail(res, 404, 'Photo not found');
    return {};
  }
  const event = await loadParticipantEvent(res, photo.event, user);
  if (!event) return {};
  return { photo, event };
}

const Photos = class Photos {
  constructor(app) {
    this.app = app;
    this.run();
  }

  addPhoto() {
    this.app.post('/albums/:id/photos', requireUser, async (req, res) => {
      try {
        const { album, event } = await loadAlbum(res, req.params.id, req.user);
        if (!album) return;

        const { url, caption } = req.body;
        const photo = await PhotoModel.create({
          album: album._id,
          event: event._id,
          author: req.user._id,
          url,
          caption
        });
        res.status(201).json(photo);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getPhotos() {
    this.app.get('/albums/:id/photos', requireUser, async (req, res) => {
      try {
        const { album } = await loadAlbum(res, req.params.id, req.user);
        if (!album) return;

        const photos = await PhotoModel.find({ album: album._id })
          .sort({ createdAt: 1 })
          .populate('author', 'firstname lastname');
        res.status(200).json(photos);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getPhotoById() {
    this.app.get('/photos/:id', requireUser, async (req, res) => {
      try {
        const { photo } = await loadPhoto(res, req.params.id, req.user);
        if (!photo) return;
        res.status(200).json(photo);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deletePhoto() {
    this.app.delete('/photos/:id', requireUser, async (req, res) => {
      try {
        const { photo, event } = await loadPhoto(res, req.params.id, req.user);
        if (!photo) return;
        if (!photo.author.equals(req.user._id) && !isOrganizer(event, req.user)) {
          return fail(res, 403, "Réservé à l'auteur de la photo ou aux organisateurs");
        }

        await CommentModel.deleteMany({ photo: photo._id });
        await photo.deleteOne();
        res.status(200).json({ code: 200, message: 'Photo supprimée' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  addComment() {
    this.app.post('/photos/:id/comments', requireUser, async (req, res) => {
      try {
        const { photo, event } = await loadPhoto(res, req.params.id, req.user);
        if (!photo) return;

        const comment = await CommentModel.create({
          photo: photo._id,
          event: event._id,
          author: req.user._id,
          text: req.body.text
        });
        res.status(201).json(comment);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getComments() {
    this.app.get('/photos/:id/comments', requireUser, async (req, res) => {
      try {
        const { photo } = await loadPhoto(res, req.params.id, req.user);
        if (!photo) return;

        const comments = await CommentModel.find({ photo: photo._id })
          .sort({ createdAt: 1 })
          .populate('author', 'firstname lastname');
        res.status(200).json(comments);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deleteComment() {
    this.app.delete('/comments/:id', requireUser, async (req, res) => {
      try {
        if (!mongoose.isValidObjectId(req.params.id)) {
          return fail(res, 400, 'Id invalide');
        }
        const comment = await CommentModel.findById(req.params.id);
        if (!comment) return fail(res, 404, 'Comment not found');

        const event = await loadParticipantEvent(res, comment.event, req.user);
        if (!event) return;
        if (!comment.author.equals(req.user._id) && !isOrganizer(event, req.user)) {
          return fail(res, 403, "Réservé à l'auteur du commentaire ou aux organisateurs");
        }

        await comment.deleteOne();
        res.status(200).json({ code: 200, message: 'Commentaire supprimé' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  run() {
    this.addPhoto();
    this.getPhotos();
    this.getPhotoById();
    this.deletePhoto();
    this.addComment();
    this.getComments();
    this.deleteComment();
  }
};

export default Photos;