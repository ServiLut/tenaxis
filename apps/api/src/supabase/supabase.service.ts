import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      this.logger.error('Supabase URL or Service Role Key missing in configuration');
      return;
    }

    this.supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async getSignedUrl(path: string, bucket: string = 'tenaxis-docs', expiresIn: number = 3600) {
    if (!this.supabase) {
      this.logger.error('Supabase client not initialized');
      return null;
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        this.logger.error(`Error creating signed URL for ${path}: ${error.message}`);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.error(`Unexpected error creating signed URL: ${error.message}`);
      return null;
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
