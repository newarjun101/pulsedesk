import { ConfigService } from '@nestjs/config';
import { CredentialEncryptionService } from './credential-encryption.service';

describe('CredentialEncryptionService (AES-256-GCM)', () => {
  let service: CredentialEncryptionService;

  beforeEach(() => {
    const configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'CREDENTIALS_ENCRYPTION_KEY') {
          return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        }
        if (key === 'CREDENTIALS_ENCRYPTION_KEY_VERSION') {
          return 'v1';
        }
        return defaultVal;
      }),
    } as unknown as ConfigService;

    service = new CredentialEncryptionService(configService);
  });

  it('encrypts and decrypts a token round-trip', () => {
    const token = 'EAAGm0PX4ZCpsBA...super-secret-token';
    const encrypted = service.encrypt(token);

    expect(encrypted.ciphertext).not.toBe(token);
    expect(encrypted.keyVersion).toBe('v1');
    expect(service.decrypt(encrypted)).toBe(token);
  });

  it('uses a unique IV for every encryption call', () => {
    const token = 'same-token-value';
    const first = service.encrypt(token);
    const second = service.encrypt(token);

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('throws on tampered ciphertext or authTag', () => {
    const encrypted = service.encrypt('secret-token');
    const tampered = {
      ...encrypted,
      authTag: Buffer.from('0000000000000000').toString('base64'),
    };

    expect(() => service.decrypt(tampered)).toThrow();
  });
});
