import { docClient, TABLES, generateLockToken } from '../config/dynamodb';
import { Account } from '../types';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export class AccountManager {
  /**
   * Create a new account
   */
  async createAccount(userId: string, initialAmount: number = 0): Promise<Account> {
    const timestamp = new Date().toISOString();
    const account: Account = {
      id: userId,
      amount: initialAmount,
      lockToken: generateLockToken(),
      createdAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.ACCOUNTS,
        Item: account,
        ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrite
      })
    );

    return account;
  }

  /**
   * Get an account by ID
   */
  async getAccount(userId: string): Promise<Account | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.ACCOUNTS,
        Key: { id: userId },
      })
    );

    return (result.Item as Account) || null;
  }

  /**
   * Get account amount
   */
  async getAmount(userId: string): Promise<number> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error(`Account ${userId} not found`);
    }
    return account.amount;
  }

  /**
   * Update account amount with optimistic locking
   * This ensures no race conditions
   */
  async updateAmount(
    userId: string,
    newAmount: number,
    expectedLockToken?: string
  ): Promise<Account> {
    if (newAmount < 0) {
      throw new Error('Amount cannot be negative');
    }

    const timestamp = new Date().toISOString();
    const newLockToken = generateLockToken();

    const updateExpression: string[] = [
      '#amount = :amount',
      '#lockToken = :lockToken',
      '#updatedAt = :updatedAt',
    ];

    const expressionAttributeNames: Record<string, string> = {
      '#amount': 'amount',
      '#lockToken': 'lockToken',
      '#updatedAt': 'updatedAt',
    };

    const expressionAttributeValues: Record<string, any> = {
      ':amount': newAmount,
      ':lockToken': newLockToken,
      ':updatedAt': timestamp,
    };

    // Add condition for optimistic locking if lockToken is provided
    let conditionExpression = 'attribute_exists(id)';
    if (expectedLockToken) {
      conditionExpression += ' AND #lockToken = :expectedLockToken';
      expressionAttributeNames['#lockToken'] = 'lockToken';
      expressionAttributeValues[':expectedLockToken'] = expectedLockToken;
    }

    try {
      const result = await docClient.send(
        new UpdateCommand({
          TableName: TABLES.ACCOUNTS,
          Key: { id: userId },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: conditionExpression,
          ReturnValues: 'ALL_NEW',
        })
      );

      return result.Attributes as Account;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Account was modified by another transaction. Please retry.');
      }
      throw error;
    }
  }

  /**
   * Increment or decrement account amount atomically
   * Uses optimistic locking to prevent race conditions
   */
  async adjustAmount(
    userId: string,
    delta: number,
    expectedLockToken?: string
  ): Promise<Account> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error(`Account ${userId} not found`);
    }

    const newAmount = account.amount + delta;
    if (newAmount < 0) {
      throw new Error(`Insufficient balance. Current: ${account.amount}, Requested: ${Math.abs(delta)}`);
    }

    return await this.updateAmount(userId, newAmount, expectedLockToken || account.lockToken);
  }

  /**
   * Delete an account
   */
  async deleteAccount(userId: string): Promise<boolean> {
    const result = await docClient.send(
      new DeleteCommand({
        TableName: TABLES.ACCOUNTS,
        Key: { id: userId },
        ReturnValues: 'ALL_OLD',
      })
    );

    return !!result.Attributes;
  }

  /**
   * Check if account exists
   */
  async accountExists(userId: string): Promise<boolean> {
    const account = await this.getAccount(userId);
    return !!account;
  }
}
