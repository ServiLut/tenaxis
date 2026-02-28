import { Client, Storage, Account, ID } from 'appwrite';

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (endpoint && projectId) {
  client
    .setEndpoint(endpoint)
    .setProject(projectId);
}

export const storage = new Storage(client);
export const account = new Account(client);
export const APPWRITE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || '';

async function ensureSession() {
  try {
    // Verificar si ya hay una sesión activa
    await account.get();
  } catch {
    // Si no hay sesión, crear una anónima
    try {
      await account.createAnonymousSession();
    } catch (error) {
      console.error('Failed to create anonymous session:', error);
    }
  }
}

export async function uploadFile(file: File) {
  if (!APPWRITE_BUCKET_ID) {
    throw new Error('Appwrite Bucket ID is not configured');
  }

  try {
    // Asegurar que el usuario esté "autorizado" mediante una sesión
    await ensureSession();

    const response = await storage.createFile(
      APPWRITE_BUCKET_ID,
      ID.unique(),
      file
    );

    // Construct the public URL for the file
    const fileUrl = `${endpoint}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${projectId}`;
    
    return {
      fileId: response.$id,
      url: fileUrl
    };
  } catch (error) {
    console.error('Error uploading file to Appwrite:', error);
    throw error;
  }
}
