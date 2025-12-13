#!/bin/bash

# Helper script to run AWS CLI commands against DynamoDB Local
# Usage: ./scripts/dynamodb-cli.sh <aws-cli-command>
# Example: ./scripts/dynamodb-cli.sh list-tables

DYNAMODB_ENDPOINT="${DYNAMODB_ENDPOINT:-http://localhost:8000}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <aws-cli-command> [options]"
    echo ""
    echo "Examples:"
    echo "  $0 list-tables"
    echo "  $0 describe-table --table-name Users"
    echo "  $0 scan --table-name Users"
    echo "  $0 query --table-name Transactions --key-condition-expression 'id = :id' --expression-attribute-values '{':id':{'S':'txn-1'}}'"
    echo ""
    echo "Environment variables:"
    echo "  DYNAMODB_ENDPOINT=${DYNAMODB_ENDPOINT}"
    echo "  AWS_REGION=${AWS_REGION}"
    exit 1
fi

aws dynamodb "$@" \
    --endpoint-url "$DYNAMODB_ENDPOINT" \
    --region "$AWS_REGION"
