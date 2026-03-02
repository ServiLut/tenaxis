import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient<any, any, any>;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      this.logger.error(
        'Supabase URL or Service Role Key missing in configuration',
      );
      return;
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getPublicUrl(path: string, bucket: string = 'tenaxis-docs') {
    if (!this.supabase) {
      // Si no hay cliente inicializado, intentamos construir la URL manualmente si tenemos la base URL
      const url = this.configService.get<string>('SUPABASE_URL');
      if (url) {
        return `${url}/storage/v1/object/public/${bucket}/${path}`;
      }
      return null;
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async getSignedUrl(
    path: string,
    bucket: string = 'tenaxis-docs',
    expiresIn: number = 3600,
  ) {
    if (!this.supabase) {
      this.logger.error('Supabase client not initialized');
      return this.getPublicUrl(path, bucket);
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        this.logger.error(
          `Error creating signed URL for ${path}: ${error.message}`,
        );
        // Si falla la firma, intentamos devolver la URL pública
        return this.getPublicUrl(path, bucket);
      }

      return data.signedUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error creating signed URL: ${errorMessage}`,
      );
      return this.getPublicUrl(path, bucket);
    }
  }

  async uploadFile(path: string, buffer: Buffer, contentType: string, bucket: string = 'tenaxis-docs') {
    if (!this.supabase) {
      this.logger.error('Supabase client not initialized');
      return null;
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Error uploading file ${path}: ${error.message}`);
        return null;
      }

      return data.path;
    } catch (error) {
      this.logger.error(`Unexpected error uploading file: ${error.message}`);
      return null;
    }
  }
}
