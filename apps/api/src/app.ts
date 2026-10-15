import express, { type Express } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';

import { env } from './config/env';
import { auth } from './lib/auth';
import { errorHandler } from './lib/error-handler';
import chatRouter from './modules/chat/chat.routes';
import modelsRouter from './modules/models/models.routes';

const app: Express = express();

app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
);

app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());
app.use(chatRouter);
app.use(modelsRouter);

app.use(errorHandler);

export default app;
