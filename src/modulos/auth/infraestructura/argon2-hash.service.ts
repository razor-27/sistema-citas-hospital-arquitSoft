import { Injectable } from '@nestjs/common';
import { HashServicePort } from '../aplicacion/login.use-case';

/**
 * Argon2HashService — usa argon2 para hashear y verificar contraseñas.
 * Wrapper injectable para facilitar mocking en tests.
 */
@Injectable()
export class Argon2HashService implements HashServicePort {
  async hash(plain: string): Promise<string> {
    const argon2 = await import('argon2');
    return argon2.hash(plain);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      const argon2 = await import('argon2');
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
