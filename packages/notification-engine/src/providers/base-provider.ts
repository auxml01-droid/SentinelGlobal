import { NotificationChannel } from '@sentinel/types';
import { SendParams, SendResult } from '../types';

export abstract class BaseProvider {
  public readonly channel: NotificationChannel;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  abstract send(params: SendParams): Promise<SendResult>;

  protected createResult(success: boolean, messageId?: string, error?: string): SendResult {
    return { success, messageId, error };
  }
}
