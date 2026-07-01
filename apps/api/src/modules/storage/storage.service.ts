import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import type { KycUploadUrlRequest, KycUploadUrlResponse } from "@harbor/shared";
import { randomUUID } from "node:crypto";

const UPLOAD_EXPIRES_SECONDS = 3600;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client?: S3Client;
  private bucket?: string;

  onModuleInit() {
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const port = process.env.MINIO_PORT ?? "9000";
    const accessKeyId = process.env.MINIO_ACCESS_KEY ?? "harbor";
    const secretAccessKey = process.env.MINIO_SECRET_KEY ?? "harborsecret";
    this.bucket = process.env.MINIO_BUCKET ?? "kyc-documents";

    this.client = new S3Client({
      endpoint: `http://${endpoint}:${port}`,
      region: "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    void this.ensureBucket();
  }

  private async ensureBucket() {
    if (!this.client || !this.bucket) return;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket })
        );
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      } catch (err) {
        this.logger.warn(`Could not ensure MinIO bucket: ${String(err)}`);
      }
    }
  }

  buildKycObjectKey(merchantId: string, type: string, fileName: string) {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `kyc/${merchantId}/${type}/${randomUUID()}-${safeName}`;
  }

  async createKycUploadUrl(
    merchantId: string,
    input: KycUploadUrlRequest
  ): Promise<KycUploadUrlResponse> {
    if (!this.client || !this.bucket) {
      throw new BadRequestException("Object storage is not configured");
    }

    const objectKey = this.buildKycObjectKey(
      merchantId,
      input.type,
      input.fileName
    );

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: input.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_EXPIRES_SECONDS,
    });

    return {
      uploadUrl,
      objectKey,
      expiresIn: UPLOAD_EXPIRES_SECONDS,
    };
  }

  assertKycObjectKeyForMerchant(objectKey: string, merchantId: string) {
    const prefix = `kyc/${merchantId}/`;
    if (!objectKey.startsWith(prefix)) {
      throw new BadRequestException("Invalid object key for this merchant");
    }
  }
}
