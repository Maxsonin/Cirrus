import express, { type Express } from 'express';
import cors from 'cors';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth/auth';
import { env } from './config/env';
import { errorHandler } from './http/error-handler';
import chatRouter from './modules/chat/chat.routes';
import modelsRouter from './modules/models/models.routes';

const app: Express = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());
app.use(chatRouter);
app.use(modelsRouter);

app.use(errorHandler);

export default app;
