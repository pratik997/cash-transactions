import { Request, Response } from 'express';
import { checkDynamoDBConnection } from '../config/dynamodb';

export class HealthController {
  async check(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await checkDynamoDBConnection();
      res.status(200).json({
        status: 'ok',
        dynamodb: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  async info(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      name: 'Cash Transaction API',
      version: '1.0.0',
      endpoints: {
        'POST /users': 'Create a new user',
        'GET /users/:userId/amount': 'Get account balance for a user',
        'POST /transactions': 'Execute a single transaction',
        'POST /transactions/bulk': 'Execute multiple transactions',
        'GET /health': 'Health check endpoint',
      },
      documentation: 'See README.md for detailed API documentation',
    });
  }
}
