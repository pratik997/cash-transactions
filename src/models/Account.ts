import { AccountManager } from '../managers/accountManager';
import { Account } from '../types';

export class AccountModel {
  private manager: AccountManager;

  constructor() {
    this.manager = new AccountManager();
  }

  async create(userId: string, initialAmount: number = 0): Promise<Account> {
    return await this.manager.createAccount(userId, initialAmount);
  }

  async findById(userId: string): Promise<Account | null> {
    return await this.manager.getAccount(userId);
  }

  async getAmount(userId: string): Promise<number> {
    return await this.manager.getAmount(userId);
  }

  async updateAmount(
    userId: string,
    newAmount: number,
    expectedLockToken?: string
  ): Promise<Account> {
    return await this.manager.updateAmount(userId, newAmount, expectedLockToken);
  }

  async adjustAmount(
    userId: string,
    delta: number,
    expectedLockToken?: string
  ): Promise<Account> {
    return await this.manager.adjustAmount(userId, delta, expectedLockToken);
  }

  async delete(userId: string): Promise<boolean> {
    return await this.manager.deleteAccount(userId);
  }

  async exists(userId: string): Promise<boolean> {
    return await this.manager.accountExists(userId);
  }
}
