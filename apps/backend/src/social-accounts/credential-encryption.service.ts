import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

@Injectable()
export class CredentialEncryptionService {
  private readonly keyBuffer: Buffer;
  private readonly keyVersion: string;

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>(
      'CREDENTIALS_ENCRYPTION_KEY',
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
    if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.keyBuffer = Buffer.from(hexKey, 'hex');
    this.keyVersion = this.configService.get<string>(
      'CREDENTIALS_ENCRYPTION_KEY_VERSION',
      'v1',
    );
  }

  private deriveKey(salt: Buffer): Buffer {
    return Buffer.from(
      hkdfSync('sha256', this.keyBuffer, salt, Buffer.from('social-credential'), 32),
    );
  }

  encrypt(plaintext: string): EncryptedPayload {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const derivedKey = this.deriveKey(salt);
    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: `${salt.toString('base64')}:${iv.toString('base64')}`,
      authTag: authTag.toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(payload: { ciphertext: string; iv: string; authTag: string }): string {
    const parts = payload.iv.split(':');
    const key =
      parts.length === 2
        ? this.deriveKey(Buffer.from(parts[0], 'base64'))
        : this.keyBuffer;
    const iv = Buffer.from(parts.length === 2 ? parts[1] : payload.iv, 'base64');
    const authTag = Buffer.from(payload.authTag, 'base64');
    const encrypted = Buffer.from(payload.ciphertext, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
