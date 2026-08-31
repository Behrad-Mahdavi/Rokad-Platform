import { Module } from '@nestjs/common';
import { FeeService } from './fee.service';
import { FeeController } from './fee.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ZarinpalPaymentProvider } from './providers/zarinpal.provider';
import { MockSandboxPaymentProvider } from './providers/mock-sandbox.provider';
import { PAYMENT_GATEWAY_PROVIDER } from './providers/payment-gateway.interface';

@Module({
  controllers: [FeeController, PaymentController],
  providers: [
    FeeService,
    PaymentService,
    ZarinpalPaymentProvider,
    MockSandboxPaymentProvider,
    {
      provide: PAYMENT_GATEWAY_PROVIDER,
      useClass: ZarinpalPaymentProvider,
    },
  ],
  exports: [FeeService, PaymentService, PAYMENT_GATEWAY_PROVIDER],
})
export class FinanceModule {}
