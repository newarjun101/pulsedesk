import { Module } from '@nestjs/common';
import { CredentialEncryptionService } from './credential-encryption.service';
import { SocialAccountsController } from './social-accounts.controller';
import { SocialAccountsService } from './social-accounts.service';

@Module({
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService, CredentialEncryptionService],
  exports: [SocialAccountsService, CredentialEncryptionService],
})
export class SocialAccountsModule {}
