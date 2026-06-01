import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

export function hashOpaqueToken(secret: string): string {
	return crypto.createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function verifyOpaqueToken(secret: string, storedHash: string | null | undefined): boolean {
	if (!storedHash || !secret) return false;
	const h = hashOpaqueToken(secret);
	try {
		return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(storedHash, 'hex'));
	} catch {
		return false;
	}
}

export function generateSecretHex(bytes = 32): string {
	return crypto.randomBytes(bytes).toString('hex');
}

export function newInvitePublicId(): string {
	return randomUUID();
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Token na URL: `invitePublicId.secretHex64` */
export function parseCompoundInviteToken(raw: string | null | undefined): { publicId: string; secret: string } | null {
	if (!raw || typeof raw !== 'string') return null;
	const idx = raw.indexOf('.');
	if (idx <= 0 || idx === raw.length - 1) return null;
	const publicId = raw.slice(0, idx);
	const secret = raw.slice(idx + 1);
	if (!UUID_RE.test(publicId)) return null;
	if (!/^[0-9a-f]{64}$/i.test(secret)) return null;
	return { publicId, secret };
}
