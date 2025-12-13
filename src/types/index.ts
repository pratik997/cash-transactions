// Transaction types
export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'SUCCESS' | 'IN_PROGRESS' | 'FAILED' | 'DISCARDED';

// User entity
export interface User {
  userId: string;
  accountId: string;
  createdAt: string;
  updatedAt?: string;
}

// Account entity
export interface Account {
  id: string;
  amount: number;
  lockToken?: string; // For optimistic locking
  createdAt: string;
  updatedAt?: string;
}

// Transaction entity
export interface Transaction {
  id: string;
  type: TransactionType;
  userId: string;
  amount: number;
  status: TransactionStatus;
  lockToken?: string; // For idempotency and locking
  errorMessage?: string;
  createdAt: string;
  updatedAt?: string;
}

// Bulk transaction request
export interface BulkTransactionRequest {
  userId: string;
  transactions: {
    idempotentKey: string; // Client-provided transaction ID for idempotency
    type: TransactionType;
    amount: string;
  }[];
}

// Bulk transaction response
export interface BulkTransactionResponse {
  userId: string;
  finalAmount: number;
  transactions: {
    id: string;
    status: TransactionStatus;
    errorMessage?: string;
  }[];
}

// API Request/Response types
export interface CreateUserRequest {
  id: string;
}

export interface CreateUserResponse {
  user: User;
  account: Account;
}

export interface GetAmountRequest {
  userId: string;
}

export interface GetAmountResponse {
  userId: string;
  amount: number;
}

export interface DoTransactionRequest {
  idempotentKey: string; // For idempotency
  userId: string;
  type: TransactionType;
  amount: number;
}

export interface DoTransactionResponse {
  transaction: Transaction;
  accountAmount: number;
}
