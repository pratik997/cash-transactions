import { docClient, TABLES } from '../config/dynamodb';
import { User } from '../types';
import { PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export class UserManager {
  /**
   * Create a new user
   */
  async createUser(userId: string): Promise<User> {
    const timestamp = new Date().toISOString();
    const user: User = {
      userId: userId,
      accountId: `account-${userId}`, // Account ID derived from user ID
      createdAt: timestamp,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: {
          id: userId, // Partition key - required by table schema
          ...user,
        },
        ConditionExpression: 'attribute_not_exists(id)', // Prevent overwrite
      })
    );

    return user;
  }

  /**
   * Get a user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { id: userId },
      })
    );

    if (!result.Item) {
      return null;
    }

    // Extract the user data (excluding the 'id' key used for DynamoDB)
    const { id, ...userData } = result.Item;
    return userData as User;
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const timestamp = new Date().toISOString();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.userId !== undefined) {
      updateExpression.push('#userId = :userId');
      expressionAttributeNames['#userId'] = 'userId';
      expressionAttributeValues[':userId'] = updates.userId;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;

    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return null;
    }

    // Extract the user data (excluding the 'id' key used for DynamoDB)
    const { id, ...userData } = result.Attributes;
    return userData as User;
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<boolean> {
    const result = await docClient.send(
      new DeleteCommand({
        TableName: TABLES.USERS,
        Key: { id: userId },
        ReturnValues: 'ALL_OLD',
      })
    );

    return !!result.Attributes;
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return !!user;
  }
}
