import { IStorage } from "./storage";

export class CodeService {
  constructor(private storage: IStorage) {}

  public async recordFailedAttempt(ip: string): Promise<{
    locked: boolean;
    attemptsLeft: number;
    timeoutSeconds: number;
  }> {
    // Get or create failed attempt record for this IP
    let record = await this.storage.getFailedAttempt(ip);
    
    if (!record) {
      // Create new record with 1 attempt
      record = await this.storage.createFailedAttempt({
        ip,
        attempts: 1,
        lastAttemptAt: new Date(),
      });
      return { locked: false, attemptsLeft: 2, timeoutSeconds: 0 };
    }
    
    // Check if there's an active timeout
    if (record.timeoutUntil && new Date() < new Date(record.timeoutUntil)) {
      const timeoutRemaining = Math.ceil(
        (new Date(record.timeoutUntil).getTime() - new Date().getTime()) / 1000
      );
      return { locked: true, attemptsLeft: 0, timeoutSeconds: timeoutRemaining };
    }
    
    // Increment attempts
    const attempts = record.attempts + 1;
    record = await this.storage.updateFailedAttempts(ip, attempts, new Date());
    
    // Check if we need to set a timeout
    if (attempts >= 3) {
      // Calculate timeout duration (2min, then 4min, then 8min, etc.)
      const timeoutDuration = record.timeoutDuration === 0 ? 120 : record.timeoutDuration * 2;
      
      // Set timeout until
      const timeoutUntil = new Date();
      timeoutUntil.setSeconds(timeoutUntil.getSeconds() + timeoutDuration);
      
      await this.storage.setFailedAttemptTimeout(ip, timeoutUntil, timeoutDuration);
      
      return { locked: true, attemptsLeft: 0, timeoutSeconds: timeoutDuration };
    }
    
    return { locked: false, attemptsLeft: 3 - attempts, timeoutSeconds: 0 };
  }

  public async resetFailedAttempts(ip: string): Promise<void> {
    await this.storage.resetFailedAttempts(ip);
  }

  public async checkTimeout(ip: string): Promise<{
    locked: boolean;
    timeoutSeconds: number;
  }> {
    const record = await this.storage.getFailedAttempt(ip);
    
    if (!record || !record.timeoutUntil) {
      return { locked: false, timeoutSeconds: 0 };
    }
    
    if (new Date() < new Date(record.timeoutUntil)) {
      const timeoutRemaining = Math.ceil(
        (new Date(record.timeoutUntil).getTime() - new Date().getTime()) / 1000
      );
      return { locked: true, timeoutSeconds: timeoutRemaining };
    }
    
    return { locked: false, timeoutSeconds: 0 };
  }
}
