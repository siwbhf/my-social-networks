import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';

import config from './config.mjs';
import routes from './controllers/routes.mjs';

const Server = class Server {
  constructor() {
    this.app = express();
    this.config = config;
  }

  async dbConnect() {
    try {
      await mongoose.connect(this.config.mongodb);
      console.log('[OK] MongoDB connecté');

      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    } catch (err) {
      console.error(`[ERROR] dbConnect() -> ${err}`);
      process.exit(1);
    }
  }

  middleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  routes() {
    new routes.Users(this.app);
    new routes.Albums(this.app);
    new routes.Groups(this.app);

    this.app.use((req, res) => {
      res.status(404).json({ code: 404, message: 'Not found' });
    });
  }

  async run() {
    await this.dbConnect();
    this.middleware();
    this.routes();
    this.app.listen(this.config.port, () => {
      console.log(`[OK] API sur http://localhost:${this.config.port}`);
    });
  }
};

export default Server;