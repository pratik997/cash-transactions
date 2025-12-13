import { Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';
import { AccountModel } from '../models/Account';
import { DoTransactionRequest, BulkTransactionRequest } from '../types';
import { message } from 'antd';

export class TransactionController {
  private transactionModel: TransactionModel;
  private accountModel: AccountModel;

  constructor() {
    this.transactionModel = new TransactionModel();
    this.accountModel = new AccountModel();
  }

  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { idempotentKey, userId, type } = req.body;
      let { amount } = req.body
      let amountConverted = 0;

      // Validation
      if (!idempotentKey || typeof idempotentKey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'idempotentKey is required and must be a string',
        });
        return;
      }

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'userId is required and must be a string',
        });
        return;
      }

      if (!type || !['credit', 'debit'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'type is required and must be either credit or debit',
        });
        return;
      }

      if (!amount || typeof amount !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'amount is required and must be a string',
        });
        return;
      } else {
        amountConverted = Number(amount)
        if(!amountConverted || amountConverted <= 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid request',
            message: 'amount must be a positive number in string'
          })
          return;
        }
        amount = amountConverted
      }

      // Validate account exists
      const account = await this.accountModel.findById(userId);
      if (!account) {
        res.status(404).json({
          success: false,
          error: `User ${userId}'s account not found`,
        });
        return;
      }

      // For single debit that would go below 0, throw error immediately
      if (type === 'debit') {
        const currentAmount = account.amount;
        if (currentAmount < amount) {
          res.status(400).json({
            success: false,
            error: `Insufficient balance. Current: ${currentAmount}, Requested: ${amount}`,
          });
          return;
        }
      }

      const request: DoTransactionRequest = {
        idempotentKey,
        userId,
        type,
        amount
      };

      const result = await this.transactionModel.execute(
        request.idempotentKey,
        request.userId,
        request.type,
        amount
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message?.includes('Insufficient balance') || error.message?.includes('not found')) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute transaction',
      });
    }
  }

  async createBulkTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { userId, transactions } = req.body;

      // Validation
      if (!userId || typeof userId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'userId is required and must be a string',
        });
        return;
      }

      if (!Array.isArray(transactions) || transactions.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'transactions is required and must be a non-empty array',
        });
        return;
      }

      // Validate each transaction
      for (const txn of transactions) {
        let amountConverted = 0;
        if (!txn.idempotentKey || typeof txn.idempotentKey !== 'string') {
          res.status(400).json({
            success: false,
            error: 'Invalid request',
            message: 'Each transaction must have an id (string)',
          });
          return;
        }

        if (!txn.type || !['credit', 'debit'].includes(txn.type)) {
          res.status(400).json({
            success: false,
            error: 'Invalid request',
            message: 'Each transaction must have a type (credit or debit)',
          });
          return;
        }

        if (!txn.amount || typeof txn.amount !== 'string') {
          res.status(400).json({
            success: false,
            error: 'Invalid request',
            message: 'Each transaction must have string formatted amount',
          });
          return;
        } else {
          amountConverted = Number(txn.amount)
          if(!amountConverted || amountConverted <= 0) {
            res.status(400).json({
              success: false,
              error: 'Invalid request',
              message: 'Each transaction must have a positive amount in string'
            });
            return;
          }
          txn.amount = amountConverted
        }
      }

      // Validate account exists
      const account = await this.accountModel.findById(userId);
      if (!account) {
        res.status(404).json({
          success: false,
          error: `Account ${userId} not found`,
        });
        return;
      }

      // If only one transaction and it's a debit that would fail, throw error immediately
      if (transactions.length === 1) {
        const txn = transactions[0];
        if (txn.type === 'debit') {
          const currentAmount = account.amount;
          if (currentAmount < txn.amount) {
            res.status(400).json({
              success: false,
              error: `Insufficient balance. Current: ${currentAmount}, Requested: ${txn.amount}`,
            });
            return;
          }
        }
      }

      const request: BulkTransactionRequest = {
        userId,
        transactions,
      };

      const result = await this.transactionModel.executeBulk(request);

      res.status(200).json({
        success: true,
        data: result,
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
        error: error.message || 'Failed to execute bulk transactions',
      });
    }
  }
}
