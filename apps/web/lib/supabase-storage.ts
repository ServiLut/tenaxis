import { createClient } from '@/utils/supabase/client';

export type StorageFolder = 'EvidenciaOrdenServicio' | 'comprobanteOrdenServicio' | 'facturaOrdenServicio';

export async function uploadFile(file: File, folder: StorageFolder = 'EvidenciaOrdenServicio') {
  const supabase = createClient();
  
  // Create a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  
  console.log('Iniciando subida a Supabase:', `tenaxis-docs/${filePath}`);

  const { data, error } = await supabase.storage
    .from('tenaxis-docs')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error detallado de Supabase Storage:', error);
    throw error;
  }

  return {
    fileId: data.path,
    url: '' // No necesitamos la URL pública, el API generará la Signed URL
  };
}
