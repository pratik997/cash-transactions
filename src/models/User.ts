import { UserManager } from '../managers/userManager';
import { User } from '../types';

export class UserModel {
  private manager: UserManager;

  constructor() {
    this.manager = new UserManager();
  }

  async create(userId: string): Promise<User> {
    return await this.manager.createUser(userId);
  }

  async findById(userId: string): Promise<User | null> {
    return await this.manager.getUser(userId);
  }

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    return await this.manager.updateUser(userId, updates);
  }

  async delete(userId: string): Promise<boolean> {
    return await this.manager.deleteUser(userId);
  }

  async exists(userId: string): Promise<boolean> {
    return await this.manager.userExists(userId);
  }
}
