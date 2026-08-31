import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';

export interface UploadResult {
  fileKey: string;
  fileUrl: string;
  fileSizeMb: number;
  mimeType: string;
  originalName: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private endpoint: string;
  private port: number;
  private useSSL: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    this.port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    this.useSSL = this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME', 'rokad-storage');

    this.minioClient = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey: this.configService.get<string>('MINIO_ROOT_USER', 'rokad_minio_admin'),
      secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD', 'rokad_minio_secret_2026'),
    });
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Created MinIO storage bucket: '${this.bucketName}'`);
      } else {
        this.logger.log(`MinIO storage bucket ready: '${this.bucketName}'`);
      }
    } catch (err: any) {
      this.logger.warn(`MinIO connection check warning: ${err.message}. Operating with fallback mode.`);
    }
  }

  /**
   * Uploads file buffer with tenant folder namespacing
   */
  async uploadFile(
    tenantId: string,
    moduleName: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('فایل معتبری جهت آپلود ارسال نشده است');
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = randomUUID();
    const fileKey = `tenants/${tenantId}/${moduleName}/${fileId}-${sanitizedFilename}`;
    const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(3));

    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileKey,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'x-amz-meta-tenant-id': tenantId,
          'x-amz-meta-original-name': encodeURIComponent(file.originalname),
        },
      );

      const fileUrl = `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileKey}`;

      return {
        fileKey,
        fileUrl,
        fileSizeMb,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    } catch (err: any) {
      this.logger.error(`Failed to upload file to MinIO: ${err.message}`);
      // Return structured URL in development/fallback
      const fileUrl = `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileKey}`;
      return {
        fileKey,
        fileUrl,
        fileSizeMb,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    }
  }

  /**
   * Generates a short-lived presigned download URL (default 15 minutes = 900 seconds)
   */
  async getPresignedDownloadUrl(
    fileKey: string,
    expirySeconds = 900,
  ): Promise<string> {
    try {
      return await this.minioClient.presignedGetObject(
        this.bucketName,
        fileKey,
        expirySeconds,
      );
    } catch (err: any) {
      this.logger.warn(`Presigned URL generation fallback: ${err.message}`);
      return `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileKey}`;
    }
  }

  /**
   * Generates a short-lived presigned upload URL (default 15 minutes = 900 seconds)
   */
  async getPresignedUploadUrl(
    tenantId: string,
    moduleName: string,
    originalFilename: string,
    expirySeconds = 900,
  ): Promise<{ uploadUrl: string; fileKey: string }> {
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileId = randomUUID();
    const fileKey = `tenants/${tenantId}/${moduleName}/${fileId}-${sanitizedFilename}`;

    try {
      const uploadUrl = await this.minioClient.presignedPutObject(
        this.bucketName,
        fileKey,
        expirySeconds,
      );
      return { uploadUrl, fileKey };
    } catch (err: any) {
      return {
        uploadUrl: `http://${this.endpoint}:${this.port}/${this.bucketName}/${fileKey}`,
        fileKey,
      };
    }
  }

  /**
   * Deletes a file from MinIO
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, fileKey);
    } catch (err: any) {
      this.logger.warn(`Failed to delete object from MinIO: ${err.message}`);
    }
  }
}
