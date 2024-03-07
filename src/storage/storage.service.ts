import { DownloadResponse, Storage } from '@google-cloud/storage';
import { Injectable } from '@nestjs/common';


@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.PROJECT_ID,
      credentials: {
        client_email: process.env.CLIENT_EMAIL,
        private_key: process.env.PRIVATE_KEY,
      },
    });

    this.bucket = process.env.STORAGE_MEDIA_BUCKET;
  }

  async save(
    path: string,
    contentType: string,
    media: Buffer,
    metadata: { [key: string]: string }[]
  ): Promise<{ mediaId: string }> {
    try {
      const object = metadata.reduce((obj, item) => Object.assign(obj, item), {});
      const file = this.storage.bucket(this.bucket).file(path);
      const stream = file.createWriteStream({
        metadata: {
          contentType: contentType,
        },
      });

      return new Promise((resolve, reject) => {
        stream.on('finish', async () => {
          try {
            await file.setMetadata({
              metadata: object,
            });

            resolve({ mediaId: object['mediaId'] });
          } catch (error) {
            console.error('Error setting metadata:', error);
            reject(error);
          }
        });

        stream.on('error', (error) => {
          console.error('Error during upload:', error);
          // Handle errors, e.g., retry logic
          reject(error);
        });

        stream.end(media);
      });
    } catch (error) {
      console.error('Error during save:', error);
      // Handle errors
      throw error;
    }
  }

  async generateMediaId(): Promise<string> {
    const id = Math.random().toString(36).substring(2, 15);
    return id;
  }




  async delete(path: string) {
    await this.storage
      .bucket(this.bucket)
      .file(path)
      .delete({ ignoreNotFound: true });
  }
}
