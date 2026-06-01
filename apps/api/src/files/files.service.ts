import { Injectable } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class FilesService {
	private s3 = new S3Client({
		region: process.env.S3_REGION || 'auto',
		endpoint: process.env.S3_ENDPOINT || undefined,
		forcePathStyle: true,
		credentials: process.env.S3_ACCESS_KEY_ID
			? {
					accessKeyId: process.env.S3_ACCESS_KEY_ID!,
					secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
			  }
			: undefined,
	});

	constructor(private readonly ctx: RequestContextService) {}

	private withTenantPrefix(key: string) {
		const agencyId = this.ctx.get()?.agencyId || 'public';
		return `agencies/${agencyId}/${key}`.replace(/\/+/g, '/');
	}

	async presignPut(key: string, contentType?: string) {
		const bucket = process.env.S3_BUCKET!;
		const tenantKey = this.withTenantPrefix(key);
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: tenantKey,
			ContentType: contentType,
			ACL: 'private',
		});
		const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
		return { url, key: tenantKey, method: 'PUT' as const };
	}

	async presignGet(key: string) {
		const bucket = process.env.S3_BUCKET!;
		const tenantKey = this.withTenantPrefix(key);
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: tenantKey,
			ResponseContentDisposition: 'inline',
		});
		const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
		return { url, key: tenantKey, method: 'GET' as const };
	}
}

