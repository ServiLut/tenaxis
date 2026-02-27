import { createClient } from '@/utils/supabase/client';

export type StorageFolder = 'EvidenciaOrdenServicio' | 'comprobanteOrdenServicio' | 'facturaOrdenServicio';

export async function uploadFile(file: File, folder: StorageFolder = 'EvidenciaOrdenServicio') {
  const supabase = createClient();
  
  // Create a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('tenaxis-docs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }

  // Note: We return the path. The public URL might not work if RLS is strict.
  // NestJS will be used to generate signed URLs for viewing.
  const { data: { publicUrl } } = supabase.storage
    .from('tenaxis-docs')
    .getPublicUrl(data.path);

  return {
    fileId: data.path,
    url: publicUrl
  };
}
