import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'node:fs';

import config from './config.mjs';
import routes from './controllers/routes.mjs';

const openapi = JSON.parse(
  readFileSync(new URL('../docs/openapi.json', import.meta.url), 'utf-8')
);

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
    this.app.use((req, res, next) => {
      if (req.body === undefined) req.body = {};
      next();
    });
  }

  routes() {
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

    new routes.Users(this.app);
    new routes.Albums(this.app);
    new routes.Photos(this.app);
    new routes.Groups(this.app);
    new routes.Events(this.app);
    new routes.Threads(this.app);
    new routes.Polls(this.app);
    new routes.Tickets(this.app);

    this.app.use((req, res) => {
      res.status(404).json({ code: 404, message: 'Not found' });
    });

    this.app.use((err, req, res, next) => {
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ code: 400, message: 'JSON invalide' });
      }
      console.error(err);
      return res.status(500).json({ code: 500, message: err.message });
    });
  }

  async run() {
    await this.dbConnect();
    this.middleware();
    this.routes();
    this.app.listen(this.config.port, () => {
      console.log(`[OK] API sur http://localhost:${this.config.port}`);
      console.log(`[OK] Documentation sur http://localhost:${this.config.port}/docs`);
    });
  }
};

export default Server;