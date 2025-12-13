import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB client configuration
const getDynamoDBConfig = () => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const endpoint = process.env.DYNAMODB_ENDPOINT; // For local DynamoDB

  const config: any = {
    region,
  };

  // Use local DynamoDB if endpoint is provided
  if (endpoint) {
    config.endpoint = endpoint;
    config.credentials = {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    };
  }

  return config;
};

// Create DynamoDB client
const dynamoDBClient = new DynamoDBClient(getDynamoDBConfig());

// Create DynamoDB Document Client for easier operations
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table names
export const TABLES = {
  USERS: process.env.USERS_TABLE || 'Users',
  ACCOUNTS: process.env.ACCOUNTS_TABLE || 'Accounts',
  TRANSACTIONS: process.env.TRANSACTIONS_TABLE || 'Transactions',
} as const;

// Helper to generate lock token for optimistic locking
export function generateLockToken(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Helper to check if DynamoDB is available
export async function checkDynamoDBConnection(): Promise<boolean> {
  try {
    // Try to list tables to check connection
    await dynamoDBClient.send(new ListTablesCommand({}));
    return true;
  } catch (error) {
    console.error('❌ DynamoDB connection error:', error);
    return false;
  }
}

export default { docClient, TABLES, generateLockToken, checkDynamoDBConnection };
