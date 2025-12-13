import { TransactionManager } from '../managers/transactionManager';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  BulkTransactionRequest,
  BulkTransactionResponse,
} from '../types';

export class TransactionModel {
  private manager: TransactionManager;

  constructor() {
    this.manager = new TransactionManager();
  }

  async create(transaction: Omit<Transaction, 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    return await this.manager.createTransaction(transaction);
  }

  async findById(idempotentKey: string): Promise<Transaction | null> {
    return await this.manager.getTransaction(idempotentKey);
  }

  async updateStatus(
    idempotentKey: string,
    status: TransactionStatus,
    errorMessage?: string
  ): Promise<Transaction | null> {
    return await this.manager.updateTransactionStatus(idempotentKey, status, errorMessage);
  }

  async execute(
    idempotentKey: string,
    userId: string,
    type: TransactionType,
    amount: number
  ): Promise<{ transaction: Transaction; accountAmount: number }> {
    return await this.manager.executeTransaction(idempotentKey, userId, type, amount);
  }

  async executeBulk(request: BulkTransactionRequest): Promise<BulkTransactionResponse> {
    return await this.manager.executeBulkTransactions(request);
  }

  async findByAccount(userId: string): Promise<Transaction[]> {
    return await this.manager.getTransactionsByAccount(userId);
  }
}
