import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadImage(fileBuffer: Buffer, folder = 'lemu_quotes'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Error desconocido en Cloudinary'));
          resolve(result);
        },
      );
      uploadStream.end(fileBuffer);
    });
  }
}