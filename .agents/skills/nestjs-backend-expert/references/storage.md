# Manejo de Archivos (Supabase Storage)

Para optimizar el rendimiento y la seguridad, el backend NO procesa archivos binarios. En su lugar, generamos URLs firmadas.

## 📁 Flujo de Subida
1. El **Frontend** pide permiso al backend para subir un archivo.
2. El **Backend** genera una URL firmada (Signed URL) para subir (upload).
3. El **Frontend** sube el archivo directamente a Supabase con un PUT.
4. El **Backend** registra el link público final una vez confirmado.

## 🛠️ Ejemplo de Implementación en NestJS
```typescript
async getUploadUrl(fileName: string, modulo: string) {
  const tenantId = this.cls.get('tenantId');
  const path = `${tenantId}/${modulo}/${fileName}`;
  
  const { data, error } = await this.supabaseClient.storage
    .from('evidencias')
    .createSignedUploadUrl(path);

  if (error) throw new InternalServerErrorException(error.message);
  return data.signedUrl;
}
```

## 🔒 Reglas de Organización
- Buckets deben estar organizados estrictamente por tenant: `/{tenant_id}/{modulo}/{file}`.
- Nunca usar el API como proxy de archivos pesados.
