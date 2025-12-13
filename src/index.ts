import 'dotenv/config'
import { startServer } from './server';
import { checkDynamoDBConnection } from './config/dynamodb';

async function main() {
  try {
    console.log('🚀 Starting Cash Transaction API Server...\n');

    // Check DynamoDB connection
    const isConnected = await checkDynamoDBConnection();
    if (!isConnected) {
      console.warn('⚠️  DynamoDB connection check failed. Make sure DynamoDB is running.');
      console.warn('   Set DYNAMODB_ENDPOINT=http://localhost:8000 if using local DynamoDB\n');
    } else {
      console.log('✅ DynamoDB connection ready\n');
    }

    // Start HTTP server
    startServer();
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

export default main;
