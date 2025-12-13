import express from 'express';
import userRoutes from './routes/userRoutes';
import transactionRoutes from './routes/transactionRoutes';
import healthRoutes from './routes/healthRoutes';
import { HealthController } from './controllers/HealthController';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/users', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/health', healthRoutes);

// Root endpoint
const healthController = new HealthController();
app.get('/', (req, res) => healthController.info(req, res));

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
export function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 Cash Transaction API Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health\n`);
  });
}

export default app;
