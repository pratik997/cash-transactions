# cash-transactions
## Problem Statement
### Task 1: Retrieve Current Balance Function
You are tasked with creating a function in TypeScript that retrieves the current balance for a
specified user from a DynamoDB table.
The function input will be as follows:

  ```bash
  {
    userId: '1'
  }
 ```

### Task 2: Transact Function
You are also required to create a function in TypeScript for processing transactions. The
transact function should:
- Handle credits & debits.
- Process the transaction in an idempotent way to prevent duplicate transactions.
- Make sure the user balance can't drop below 0.
- Make sure no race conditions can happen.
- Do not store any global or local state except in the DynamoDB table.
The function input will be as follows:
```bash
{
  idempotentKey: '1',
  userId: '1',
  amount: '10',
  type: 'credit'
}
```
## Planned Solution
### Functional Requirements:
1. Able to fetch Amount on id.
2. Should be able to perform multiple types of transactions
	a. Credits
	b. Debits
### Non functional Requirements:
1. Amount shouldn't drop below 0.
2. Transactions should be handled idempotently.
3. No race conditions
4. Don't store any global or local state except in DB

### Entities:
 * User(id, Account) --has(A)--> Account({id, Amount}, [getAmount, setAmount])
 * UserManager -> CRUD operations will be there
 * AccountManager -> CRUD operations will be there
 * Transactions(id, type(CREDIT, DEBIT), account, amount, status(SUCCESS, IN_PROGRESS, FAILED, DISCARDED))
 * TransactionsManager
1. I will provide an API to
   - add User
   - fetch Amount of an User
   - do a transactions
   - do bulk transactions at a time and result final amount on an account
	   * Lets say someone credit 10, credit 20, debit 30, credit 10 -> result 10
	   * someone credit 10, debit 20, credit 30 -> result an error on 2nd transaction as Amount going below 0, result 40
	   * someone debit 20 -> won't respond anything directly throw error
3. Transactions will be included with DynamoDB record lock.

## Solution Approach
Lets target it solving with MVC approach. We will have a corresponding models, their respective routes and controller for above mentioned requirement's APIs. We will have corresponding managers to manager CRUDs.

Also for non functional requirements, we need to maintain other multiple parameters. 
  * For maintaining idempotency on transaction, we need to have a transaction id. If duplicate request with same transaction id is received by server, it should be discarded.
  * For avoiding race condition, every account will be assigned with a lock. If a thread is catching that lock, another thread came at sametime, either that will wait or will result failure.
    * In ideal scenario that's supposed to wait for previous transaction to process, but for simplicity lets fail it for now.

### Validation logics
  * Balance can't go below 0.
  * Debit amount can't be more than available balance.
  * Transactions can be either of CREDIT/DEBIT.
  * Check if transaction id is already existing in transaction history or not
  * Check if account lock is already in use or not.