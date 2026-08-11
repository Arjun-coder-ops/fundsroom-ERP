import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import challanRoutes from './routes/challan.routes';
import dashboardRoutes from './routes/dashboard.routes';

export function createApp() {
  const app = express();

  if (env.nodeEnv !== 'production') {
    app.use(
      cors({
        origin: true,
        credentials: true,
      }),
    );
  } else {
    const allowedOrigins = new Set(env.clientUrl.split(',').map((origin) => origin.trim()));
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS origin denied: ${origin}`));
          }
        },
        credentials: true,
      }),
    );
  }
  app.use(express.json());

  app.get('/', (_req, res) => res.json({ success: true, data: { message: 'Fundsroom ERP API is running' } }));
  app.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/challans', challanRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
