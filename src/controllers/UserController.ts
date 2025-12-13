import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AccountModel } from '../models/Account';

export class UserController {
  private userModel: UserModel;
  private accountModel: AccountModel;

  constructor() {
    this.userModel = new UserModel();
    this.accountModel = new AccountModel();
  }

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'User ID is required and must be a string',
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.userModel.findById(userId);
      if (existingUser) {
        const account = await this.accountModel.findById(existingUser.userId);
        if (!account) {
          res.status(500).json({
            success: false,
            error: 'User exists but account not found',
          });
          return;
        }
        res.status(200).json({
          success: true,
          data: {
            user: existingUser,
            account,
          },
        });
        return;
      }

      // Create user
      const user = await this.userModel.create(userId);

      // Create associated account
      const account = await this.accountModel.create(user.userId, 0);

      res.status(201).json({
        success: true,
        data: {
          user,
          account,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create user',
      });
    }
  }

  async getAmount(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'User ID is required',
        });
        return;
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: `User ${userId} not found`,
        });
        return;
      }

      const amount = await this.accountModel.getAmount(user.userId);

      res.status(200).json({
        success: true,
        data: {
          userId,
          amount,
        },
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch amount',
      });
    }
  }
}
