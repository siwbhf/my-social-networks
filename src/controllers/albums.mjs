import mongoose from 'mongoose';
import AlbumModel from '../models/album.mjs';
import requireUser from '../middlewares/requireUser.mjs';
import { removeAlbumData } from '../helpers/cascade.mjs';
import {
  isOrganizer, fail, handleError, loadParticipantEvent
} from '../helpers/access.mjs';

//charge un album et vérifie que l'utilisateur participe à levenement associé
export async function loadAlbum(res, id, user) {
  if (!mongoose.isValidObjectId(id)) {
    fail(res, 400, 'Id invalide');
    return {};
  }
  const album = await AlbumModel.findById(id);
  if (!album) {
    fail(res, 404, 'Album not found');
    return {};
  }
  const event = await loadParticipantEvent(res, album.event, user);
  if (!event) return {};
  return { album, event };
}

const Albums = class Albums {
  constructor(app) {
    this.app = app;
    this.run();
  }

  createAlbum() {
    this.app.post('/events/:id/albums', requireUser, async (req, res) => {
      try {
        const event = await loadParticipantEvent(res, req.params.id, req.user);
        if (!event) return;

        const { title, description } = req.body;
        const album = await AlbumModel.create({
          event: event._id,
          title,
          description,
          createdBy: req.user._id
        });
        res.status(201).json(album);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getAlbums() {
    this.app.get('/events/:id/albums', requireUser, async (req, res) => {
      try {
        const event = await loadParticipantEvent(res, req.params.id, req.user);
        if (!event) return;

        const albums = await AlbumModel.find({ event: event._id }).sort({ createdAt: 1 });
        res.status(200).json(albums);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  getAlbumById() {
    this.app.get('/albums/:id', requireUser, async (req, res) => {
      try {
        const { album } = await loadAlbum(res, req.params.id, req.user);
        if (!album) return;
        res.status(200).json(album);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  updateAlbum() {
    this.app.put('/albums/:id', requireUser, async (req, res) => {
      try {
        const { album, event } = await loadAlbum(res, req.params.id, req.user);
        if (!album) return;
        if (!album.createdBy.equals(req.user._id) && !isOrganizer(event, req.user)) {
          return fail(res, 403, "Réservé à l'auteur de l'album ou aux organisateurs");
        }

        if (req.body.title !== undefined) album.title = req.body.title;
        if (req.body.description !== undefined) album.description = req.body.description;
        await album.save();
        res.status(200).json(album);
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  deleteAlbum() {
    this.app.delete('/albums/:id', requireUser, async (req, res) => {
      try {
        const { album, event } = await loadAlbum(res, req.params.id, req.user);
        if (!album) return;
        if (!album.createdBy.equals(req.user._id) && !isOrganizer(event, req.user)) {
          return fail(res, 403, "Réservé à l'auteur de l'album ou aux organisateurs");
        }

        await removeAlbumData({ _id: album._id });
        res.status(200).json({ code: 200, message: 'Album supprimé' });
      } catch (error) {
        handleError(res, error);
      }
    });
  }

  run() {
    this.createAlbum();
    this.getAlbums();
    this.getAlbumById();
    this.updateAlbum();
    this.deleteAlbum();
  }
};

export default Albums;