import AlbumModel from "../models/album.mjs";
import PhotoModel from "../models/photo.mjs";

const Albums = class Albums {
  constructor(app) {
    this.app = app;
    this.run();
  }

createAlbum() {
  this.app.post('/album', async (req, res) => {
    try {
      const { title, description} = req.body;
      
      if (!title) {
        return res.status(400).json({
          code: 400,
          message: 'Le champs title est obligatoire'
        });
      }

      const newAlbum = new AlbumModel({title, description});
      await newAlbum.save();

      res.status(201).json(newAlbum);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}

getAlbumById() {
  this.app.get('/album/:id', async (req, res) => {
    try {
      const album = await AlbumModel.findById(req.params.id).populate('photos');
      if(!album) {
        return res.status(404).json({code: 404, message: 'Album not found'});
      }

      res.status(200).json(album);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}

updateAlbum() {
  this.app.put('/album/:id', async(req, res) => {
    try {
      const {title, description} = req.body;

      const updatedAlbum = await AlbumModel.findByIdAndUpdate(
        req.params.id,
        {title, description},
        {new: true}
      );

      if (!updatedAlbum) {
        return res.status(404).json({code: 404, message: 'Album not found'});
      }
      res.status(200).json(updatedAlbum);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}

deleteAlbum() {
  this.app.delete('/album/:id', async (req, res) => {
    try {
      const deletedAlbum = await AlbumModel.findByIdAndDelete(req.params.id);
      if (!deletedAlbum) {
        return res.status(404).json({code: 404, message: 'Album not found'});
      }

      await PhotoModel.deleteMany({album: req.params.id});

      res.status(200).json({code: 200, message: 'Album supprimé'});
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}

getAlbums() {
  this.app.get('/albums', async (req, res) => {
    try {
      const {name} = req.query;
      const filter = name ? {title: new RegExp(name, 'i')} : {};

      const albums = await AlbumModel.find(filter).populate('photos');

      res.status(200).json(albums);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}








getPhotosByAlbum() {
  this.app.get('/album/:idalbum/photos', async (req, res) => {
    try {
      const photos = await PhotoModel.find({album : req.params.idalbum});
      res.status(200).json(photos);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}

getPhotoById() {
    this.app.get('/album/:idalbum/photo/:idphoto', async (req, res) => {
      try {
        const photo = await PhotoModel.findOne({
          _id: req.params.idphoto,
          album: req.params.idalbum
        }).populate('album');

        if (!photo) {
          return res.status(404).json({ code: 404, message: 'Photo not found' });
        }

        res.status(200).json(photo);
      } catch (error) {
        console.log(error);
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }


createPhoto() {
  this.app.post('/album/:idalbum/photo', async (req, res) => {
    try {
      const album = await AlbumModel.findById(req.params.idalbum);
      
      if (!album) {
        return res.status(400).json({
          code: 400,
          message: 'Album not found'
        });
      }
      const { title, url, description } = req.body;

      if (!title || !url) {
        return res.status(400).json({
          code: 400,
          message: 'Les champs title et url sont requis'
        });
      }

      const newPhoto = new PhotoModel({title, url, description, album: req.params.idalbum});
      await newPhoto.save();

      album.photos.push(newPhoto._id);
      await album.save();

      res.status(201).json(newPhoto);
    } catch (error) {
      console.log(error);
      res.status(500).json({code: 500, message: error.message});
    }
  });
}


  updatePhoto() {
    this.app.put('/album/:idalbum/photo/:idphoto', async (req, res) => {
      try {
        const { title, url, description } = req.body;

        const updatedPhoto = await PhotoModel.findOneAndUpdate(
          { _id: req.params.idphoto, album: req.params.idalbum },
          { title, url, description },
          { new: true }
        );

        if (!updatedPhoto) {
          return res.status(404).json({ code: 404, message: 'Photo not found' });
        }

        res.status(200).json(updatedPhoto);
      } catch (error) {
        console.log(error);
        res.status(500).json({ code: 500, message: error.message });
      }
    });
  }


  deletePhoto() {
    this.app.delete('/album/:idalbum/photo/:idphoto', async (req, res) => {
      try {
        const deletedPhoto = await PhotoModel.findOneAndDelete({_id: req.params.idphoto, album: req.params.idalbum});
        if (!deletedPhoto) {
          return res.status(404).json({code: 404, message: 'Photo not found'});
        }

        await AlbumModel.findByIdAndUpdate(req.params.idalbum, {$pull: {photos: req.params.idphoto}});

        res.status(200).json({code: 200, message: 'Photo supprimé'});
      } catch (error) {
        console.log(error);
        res.status(500).json({code: 500, message: error.message});
      }
    });
  }

  run() {
    this.createAlbum();
    this.getAlbumById();
    this.updateAlbum();
    this.deleteAlbum();
    this.getAlbums();

    this.getPhotosByAlbum();
    this.getPhotoById();
    this.createPhoto();
    this.updatePhoto();
    this.deletePhoto();
  }

};

export default Albums;