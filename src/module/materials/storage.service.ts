import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /**
   * Upload file from base64 string or buffer
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<{ url: string; provider: 'cloudinary' | 'local' }> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const preset = process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default';

    const isCloudinaryConfigured =
      cloudName &&
      cloudName !== 'cqanlo11' &&
      apiKey &&
      apiSecret &&
      apiKey !== apiSecret;

    if (isCloudinaryConfigured) {
      // 1. Try signed Cloudinary upload first
      try {
        const url = await this.uploadToCloudinarySigned(
          fileBuffer,
          cloudName,
          apiKey,
          apiSecret,
          mimeType,
        );
        return { url, provider: 'cloudinary' };
      } catch (err) {
        this.logger.warn(`Signed Cloudinary upload failed: ${err}. Trying unsigned upload preset...`);
      }

      // 2. Try unsigned Cloudinary upload preset fallback
      try {
        const url = await this.uploadToCloudinaryUnsigned(
          fileBuffer,
          cloudName,
          preset,
          mimeType,
        );
        return { url, provider: 'cloudinary' };
      } catch (err) {
        this.logger.error(`Unsigned Cloudinary upload failed: ${err}. Falling back to local disk storage...`);
      }
    }

    // 3. Local Disk Storage fallback
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileExt = path.extname(originalName) || this.getExtensionFromMime(mimeType);
    const uniqueFileName = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${fileExt}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    fs.writeFileSync(filePath, fileBuffer);
    const localUrl = `/uploads/${uniqueFileName}`;

    return { url: localUrl, provider: 'local' };
  }

  private async uploadToCloudinarySigned(
    fileBuffer: Buffer,
    cloudName: string,
    apiKey: string,
    apiSecret: string,
    mimeType: string,
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const resourceType = mimeType.startsWith('video/')
      ? 'video'
      : mimeType.startsWith('audio/')
        ? 'video'
        : 'auto';

    const signatureStr = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex');

    const formData = new FormData();
    const uint8Array = new Uint8Array(fileBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append('file', blob, 'upload_file');
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary Signed HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as { secure_url: string };
    return result.secure_url;
  }

  private async uploadToCloudinaryUnsigned(
    fileBuffer: Buffer,
    cloudName: string,
    preset: string,
    mimeType: string,
  ): Promise<string> {
    const resourceType = mimeType.startsWith('video/')
      ? 'video'
      : mimeType.startsWith('audio/')
        ? 'video'
        : 'auto';

    const formData = new FormData();
    const uint8Array = new Uint8Array(fileBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append('file', blob, 'upload_file');
    formData.append('upload_preset', preset);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary Unsigned HTTP ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as { secure_url: string };
    return result.secure_url;
  }

  private getExtensionFromMime(mime: string): string {
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('mp4')) return '.mp4';
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('png')) return '.png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
    if (mime.includes('mp3') || mime.includes('mpeg')) return '.mp3';
    return '.bin';
  }
}
