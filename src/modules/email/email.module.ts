import { Global, Module } from '@nestjs/common';
import { NodemailerEmailService } from './email.service';
import { EMAIL_SERVICE } from './interfaces/email-provider.interface';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: NodemailerEmailService,
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
