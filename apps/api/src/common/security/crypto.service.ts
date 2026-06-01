import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
	private getKey(): Buffer {
		const keyB64 = process.env.CREDENTIALS_ENCRYPTION_KEY || '';
		if (!keyB64) {
			// For development fallback only; must be set in prod.
			return crypto.createHash('sha256').update('dev-key').digest();
		}
		const key = Buffer.from(keyB64, 'base64');
		if (key.length !== 32) {
			throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 bytes base64');
		}
		return key;
	}

	encryptJson(data: unknown) {
		const iv = crypto.randomBytes(12);
		const key = this.getKey();
		const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
		const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
		const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
		const tag = cipher.getAuthTag();
		return {
			enc: enc.toString('base64'),
			iv: iv.toString('base64'),
			tag: tag.toString('base64'),
		};
	}

	decryptJson(payload: { enc: string; iv: string; tag: string }) {
		const key = this.getKey();
		const iv = Buffer.from(payload.iv, 'base64');
		const enc = Buffer.from(payload.enc, 'base64');
		const tag = Buffer.from(payload.tag, 'base64');
		const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
		decipher.setAuthTag(tag);
		const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
		return JSON.parse(dec.toString('utf8'));
	}
}

