import { docClient, TABLES, generateLockToken } from '../config/dynamodb';
import { Transaction, TransactionType, TransactionStatus, BulkTransactionRequest, BulkTransactionResponse } from '../types';
import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AccountManager } from './accountManager';

export class TransactionManager {
  private accountManager: AccountManager;

  constructor() {
    this.accountManager = new AccountManager();
  }

  /**
   * Create a transaction record
   */
  async createTransaction(transaction: Omit<Transaction, 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const timestamp = new Date().toISOString();
    const transactionRecord: Transaction = {
      ...transaction,
      lockToken: transaction.lockToken || generateLockToken(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Use transaction ID as key and check for idempotency
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TRANSACTIONS,
        Item: transactionRecord,
        ConditionExpression: 'attribute_not_exists(id)', // Idempotency check
      })
    );

    return transactionRecord;
  }

  /**
   * Get a transaction by ID
   */
  async getTransaction(idempotentKey: string): Promise<Transaction | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.TRANSACTIONS,
        Key: { id: idempotentKey },
      })
    );

    return (result.Item as Transaction) || null;
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    idempotentKey: string,
    status: TransactionStatus,
    errorMessage?: string
  ): Promise<Transaction | null> {
    const timestamp = new Date().toISOString();
    const updateExpression: string[] = [
      '#status = :status',
      '#updatedAt = :updatedAt',
    ];

    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
      '#updatedAt': 'updatedAt',
    };

    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': timestamp,
    };

    if (errorMessage) {
      updateExpression.push('#errorMessage = :errorMessage');
      expressionAttributeNames['#errorMessage'] = 'errorMessage';
      expressionAttributeValues[':errorMessage'] = errorMessage;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TRANSACTIONS,
        Key: { id: idempotentKey },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return (result.Attributes as Transaction) || null;
  }

  /**
   * Execute a single transaction with idempotency and locking
   */
  async executeTransaction(
    idempotentKey: string,
    userId: string,
    type: TransactionType,
    amount: number
  ): Promise<{ transaction: Transaction; accountAmount: number }> {
    // Check for idempotency - if transaction already exists and is successful, return it
    const existingTransaction = await this.getTransaction(idempotentKey);
    if (existingTransaction) {
      if (existingTransaction.status === 'SUCCESS') {
        const account = await this.accountManager.getAccount(userId);
        return {
          transaction: existingTransaction,
          accountAmount: account?.amount || 0,
        };
      }
      if (existingTransaction.status === 'IN_PROGRESS') {
        throw new Error(`Transaction ${idempotentKey} is already in progress`);
      }
    }

    // Create transaction record with IN_PROGRESS status
    const transaction = await this.createTransaction({
      id: idempotentKey,
      type,
      userId,
      amount,
      status: 'IN_PROGRESS',
    });

    try {
      // Get current account with lock token
      const account = await this.accountManager.getAccount(userId);
      if (!account) {
        throw new Error(`Account ${userId} not found`);
      }

      // Calculate new amount
      const delta = type === 'credit' ? amount : -amount;
      const newAmount = account.amount + delta;

      // Check if amount would go below 0
      if (newAmount < 0) {
        await this.updateTransactionStatus(
          idempotentKey,
          'FAILED',
          `Insufficient balance. Current: ${account.amount}, Requested: ${amount}`
        );
        throw new Error(`Insufficient balance. Current: ${account.amount}, Requested: ${amount}`);
      }

      // Update account with optimistic locking
      const updatedAccount = await this.accountManager.updateAmount(
        userId,
        newAmount,
        account.lockToken
      );

      // Update transaction to SUCCESS
      const successTransaction = await this.updateTransactionStatus(idempotentKey, 'SUCCESS');

      return {
        transaction: successTransaction || transaction,
        accountAmount: updatedAccount.amount,
      };
    } catch (error: any) {
      // Update transaction to FAILED if not already updated
      const currentTransaction = await this.getTransaction(idempotentKey);
      if (currentTransaction?.status === 'IN_PROGRESS') {
        await this.updateTransactionStatus(
          idempotentKey,
          'FAILED',
          error.message || 'Transaction failed'
        );
      }
      throw error;
    }
  }

  /**
   * Execute bulk transactions
   * Processes transactions sequentially, continuing even if one fails
   */
  async executeBulkTransactions(request: BulkTransactionRequest): Promise<BulkTransactionResponse> {
    const { userId, transactions } = request;
    const results: BulkTransactionResponse['transactions'] = [];
    let currentAccount = await this.accountManager.getAccount(userId);

    if (!currentAccount) {
      throw new Error(`Account ${userId} not found`);
    }

    // Process each transaction sequentially
    for (const txn of transactions) {
      const idempotentKey = txn.idempotentKey;
      const amount = Number(txn.amount)
      
      // Check for idempotency
      const existingTransaction = await this.getTransaction(idempotentKey);
      if (existingTransaction) {
        if (existingTransaction.status === 'SUCCESS') {
          // Already processed successfully, skip
          results.push({
            id: idempotentKey,
            status: 'SUCCESS',
          });
          // Refresh account to get latest amount
          currentAccount = await this.accountManager.getAccount(userId);
          if (!currentAccount) {
            throw new Error(`Account ${userId} not found during bulk transaction processing`);
          }
          continue;
        } else if (existingTransaction.status === 'IN_PROGRESS') {
          // Mark as discarded and continue
          await this.updateTransactionStatus(idempotentKey, 'DISCARDED', 'Transaction was in progress during bulk operation');
          results.push({
            id: idempotentKey,
            status: 'DISCARDED',
            errorMessage: 'Transaction was in progress during bulk operation',
          });
          continue;
        }
      }

      // Ensure currentAccount is not null before processing
      if (!currentAccount) {
        currentAccount = await this.accountManager.getAccount(userId);
        if (!currentAccount) {
          throw new Error(`Account ${userId} not found during bulk transaction processing`);
        }
      }

      // Create transaction record
      const transaction = await this.createTransaction({
        id: idempotentKey,
        type: txn.type,
        userId,
        amount: amount,
        status: 'IN_PROGRESS',
      });

      try {
        // Calculate new amount
        const delta = txn.type === 'credit' ? amount : -amount;
        const newAmount = currentAccount.amount + delta;

        // Check if amount would go below 0
        if (newAmount < 0) {
          await this.updateTransactionStatus(
            idempotentKey,
            'FAILED',
            `Insufficient balance. Current: ${currentAccount.amount}, Requested: ${txn.amount}`
          );
          results.push({
            id: idempotentKey,
            status: 'FAILED',
            errorMessage: `Insufficient balance. Current: ${currentAccount.amount}, Requested: ${txn.amount}`,
          });
          // Continue with next transaction
          continue;
        }

        // Update account with optimistic locking
        const updatedAccount = await this.accountManager.updateAmount(
          userId,
          newAmount,
          currentAccount.lockToken
        );
        currentAccount = updatedAccount;

        // Update transaction to SUCCESS
        await this.updateTransactionStatus(idempotentKey, 'SUCCESS');
        results.push({
          id: idempotentKey,
          status: 'SUCCESS',
        });
      } catch (error: any) {
        // Update transaction to FAILED
        await this.updateTransactionStatus(
          idempotentKey,
          'FAILED',
          error.message || 'Transaction failed'
        );
        results.push({
          id: idempotentKey,
          status: 'FAILED',
          errorMessage: error.message || 'Transaction failed',
        });
        // Continue with next transaction
      }
    }

    // Get final account amount
    const finalAccount = await this.accountManager.getAccount(userId);

    return {
      userId,
      finalAmount: finalAccount?.amount || 0,
      transactions: results,
    };
  }

  /**
   * Get all transactions for an account
   */
  async getTransactionsByAccount(userId: string): Promise<Transaction[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TRANSACTIONS,
        IndexName: 'userId-index', // Assuming GSI on userId
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    return (result.Items as Transaction[]) || [];
  }
}
