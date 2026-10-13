import express, { type Express } from 'express';
import cors from 'cors';

import { env } from './config/env';
import { errorHandler } from './lib/error-handler';
import chatRouter from './modules/chat/chat.routes';
import modelsRouter from './modules/models/models.routes';

const app: Express = express();

app.use(
  cors({
    origin: env.frontendOrigin,
  }),
);
app.use(express.json());
app.use(chatRouter);
app.use(modelsRouter);

app.use(errorHandler);

export default app;
