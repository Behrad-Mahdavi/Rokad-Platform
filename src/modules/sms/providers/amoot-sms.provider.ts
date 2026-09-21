import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ISmsProvider,
  SmsSendSingleOptions,
  SmsSendResult,
  SmsSendBulkOptions,
  SmsBulkSendResult,
} from '../interfaces/sms-provider.interface';

@Injectable()
export class AmootSmsProvider implements ISmsProvider {
  readonly name = 'AMOOT';
  private readonly logger = new Logger('SMS_AMOOT');
  private apiKey: string;
  private senderLine: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AMOOT_API_KEY') || '';
    this.senderLine = this.configService.get<string>('AMOOT_SENDER_LINE') || '';
  }

  updateCredentials(apiKey: string, senderLine?: string) {
    this.apiKey = apiKey;
    if (senderLine !== undefined) {
      this.senderLine = senderLine;
    }
  }

  getCredentials() {
    return {
      apiKey: this.apiKey,
      senderLine: this.senderLine,
    };
  }

  async sendSingle(options: SmsSendSingleOptions): Promise<SmsSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'کلید API آموت تنظیم نشده است.',
      };
    }

    try {
      let lineToSend = this.senderLine && this.senderLine.trim() ? this.senderLine.trim() : '98';
      // If line is an invalid phone or has plus sign, clean it
      if (lineToSend === '+98' || lineToSend === 'Public' || lineToSend === 'Service' || lineToSend === '') {
        lineToSend = '98';
      } else if (lineToSend.startsWith('+98')) {
        lineToSend = lineToSend.substring(3);
      }

      const cleanPhone = options.to.replace(/[^\d+]/g, '');

      let payload: Record<string, string> = {
        Token: this.apiKey,
        LineNumber: lineToSend,
        SMSMessageText: options.message,
        Mobiles: cleanPhone,
      };

      let response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload).toString(),
      });

      let data = await response.json();
      this.logger.log(`Amoot SMS sendSingle Response (Line ${lineToSend}): ${JSON.stringify(data)}`);

      // If line did not exist on user account, retry automatically with default '98'
      if (data?.Status === 'LineNumber_NotExist' && lineToSend !== '98') {
        this.logger.warn(`Line ${lineToSend} does not exist in account. Retrying with default line 98...`);
        payload.LineNumber = '98';
        response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString(),
        });
        data = await response.json();
        this.logger.log(`Amoot SMS Retry Response: ${JSON.stringify(data)}`);
      }

      if (data?.Status === 'Success' || data?.Status === '200' || data?.Code === 200 || data?.MessageId || data?.BatchId) {
        return {
          success: true,
          messageId: String(data?.BatchId || data?.MessageId || Date.now()),
          cost: data?.Cost || 1,
          provider: this.name,
          rawResponse: data,
        };
      }

      return {
        success: false,
        provider: this.name,
        errorMessage: data?.Description || data?.Status || data?.Message || 'خطا در وب‌سرویس آموت',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS send failure: ${err.message}`);
      return {
        success: false,
        provider: this.name,
        errorMessage: err.message,
      };
    }
  }

  async sendBulk(options: SmsSendBulkOptions): Promise<SmsBulkSendResult> {
    if (!this.apiKey) {
      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: 'کلید API آموت تنظیم نشده است.',
        })),
      };
    }

    try {
      let lineToSend = this.senderLine && this.senderLine.trim() ? this.senderLine.trim() : '98';
      if (lineToSend === '+98' || lineToSend === 'Public' || lineToSend === 'Service' || lineToSend === '') {
        lineToSend = '98';
      } else if (lineToSend.startsWith('+98')) {
        lineToSend = lineToSend.substring(3);
      }

      const cleanPhones = options.recipients.map((p) => p.replace(/[^\d+]/g, '')).join(',');

      let payload: Record<string, string> = {
        Token: this.apiKey,
        LineNumber: lineToSend,
        SMSMessageText: options.message,
        Mobiles: cleanPhones,
      };

      let response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload).toString(),
      });

      let data = await response.json();
      this.logger.log(`Amoot SMS sendBulk Response (Line ${lineToSend}): ${JSON.stringify(data)}`);

      if (data?.Status === 'LineNumber_NotExist' && lineToSend !== '98') {
        payload.LineNumber = '98';
        response = await fetch('https://portal.amootsms.com/rest/SendSimple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(payload).toString(),
        });
        data = await response.json();
      }

      if (data?.Status === 'Success' || data?.Status === '200' || data?.Code === 200 || data?.MessageId || data?.BatchId) {
        const results = options.recipients.map((phone) => ({
          phone,
          success: true,
          messageId: String(data?.BatchId || Date.now()),
        }));

        return {
          success: true,
          total: options.recipients.length,
          sentCount: options.recipients.length,
          failedCount: 0,
          provider: this.name,
          results,
        };
      }

      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: data?.Description || data?.Status || data?.Message || 'خطا در وب‌سرویس آموت',
        })),
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS bulk send failure: ${err.message}`);
      return {
        success: false,
        total: options.recipients.length,
        sentCount: 0,
        failedCount: options.recipients.length,
        provider: this.name,
        results: options.recipients.map((p) => ({
          phone: p,
          success: false,
          errorMessage: err.message,
        })),
      };
    }
  }

  async getAccountStatus(): Promise<{
    success: boolean;
    accountName?: string;
    remaindCredit?: number;
    remaindCreditTomans?: number;
    listLineNumbers?: string[];
    rawResponse?: any;
    errorMessage?: string;
  }> {
    if (!this.apiKey) {
      return { success: false, errorMessage: 'کلید API آموت تنظیم نشده است.' };
    }

    try {
      const response = await fetch('https://portal.amootsms.com/rest/AccountStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ Token: this.apiKey }).toString(),
      });

      const data = await response.json();
      if (data?.Status === 'Success' || data?.Code === 200) {
        const creditRials = Number(data?.RemaindCredit || 0);
        return {
          success: true,
          accountName: data?.AccountName || '',
          remaindCredit: creditRials,
          remaindCreditTomans: Math.floor(creditRials / 10),
          listLineNumbers: Array.isArray(data?.ListLineNumbers) ? data.ListLineNumbers : [],
          rawResponse: data,
        };
      }

      return {
        success: false,
        errorMessage: data?.Description || data?.Status || 'خطا در دریافت وضعیت حساب آموت',
        rawResponse: data,
      };
    } catch (err: any) {
      this.logger.error(`Amoot SMS AccountStatus failure: ${err.message}`);
      return { success: false, errorMessage: err.message };
    }
  }
}
