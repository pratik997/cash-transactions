import 'dotenv/config';
import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { TABLES } from '../config/dynamodb';

const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
  }),
});

async function tableExists(tableName: string): Promise<boolean> {
  try {
    await dynamoDBClient.send(
      new DescribeTableCommand({
        TableName: tableName,
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createUsersTable() {
  const tableName = TABLES.USERS;
  
  if (await tableExists(tableName)) {
    console.log(`✅ Table ${tableName} already exists`);
    return;
  }

  await dynamoDBClient.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );

  console.log(`✅ Created table ${tableName}`);
}

async function createAccountsTable() {
  const tableName = TABLES.ACCOUNTS;
  
  if (await tableExists(tableName)) {
    console.log(`✅ Table ${tableName} already exists`);
    return;
  }

  await dynamoDBClient.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );

  console.log(`✅ Created table ${tableName}`);
}

async function createTransactionsTable() {
  const tableName = TABLES.TRANSACTIONS;
  
  if (await tableExists(tableName)) {
    console.log(`✅ Table ${tableName} already exists`);
    return;
  }

  await dynamoDBClient.send(
    new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S',
        },
        {
          AttributeName: 'userId',
          AttributeType: 'S',
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'userId-index',
          KeySchema: [
            {
              AttributeName: 'userId',
              KeyType: 'HASH',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    })
  );

  console.log(`✅ Created table ${tableName} with GSI`);
}

async function setupTables() {
  try {
    console.log('🚀 Setting up DynamoDB tables...\n');

    await createUsersTable();
    await createAccountsTable();
    await createTransactionsTable();

    console.log('\n✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupTables();
}

export { setupTables };
