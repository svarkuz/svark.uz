import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings to improve connectivity in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // This can help in environments where WebSockets are flaky
}, firebaseConfig.firestoreDatabaseId);

/**
 * Validates connection to Firestore backend with retries
 */
export async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Attempt to fetch a non-existent document from server to verify connection
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("Firestore connection verified.");
      return true;
    } catch (error) {
      const isOffline = error instanceof Error && (
        error.message.includes('the client is offline') || 
        (error as any).code === 'unavailable' ||
        error.message.includes('Could not reach Cloud Firestore')
      );
      
      if (isOffline) {
        console.warn(`Firestore connection attempt ${i + 1} failed. Retrying...`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // Exponential backoff
          continue;
        }
        console.error("Firestore is unreachable after multiple attempts. Operating in offline mode.");
      } else {
        console.log("Firestore responded (connection active).");
        return true;
      }
    }
  }
  return false;
}

// Initial check
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isConnectivityIssue = errorMessage.includes('the client is offline') || 
                               errorMessage.includes('unavailable') || 
                               errorMessage.includes('Could not reach Cloud Firestore');

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (isConnectivityIssue) {
    // For connectivity issues, we log it and potentially warn the user, but we don't necessarily want to treat it as a hard crash
    console.warn("Firestore connectivity issue detected. The app will continue in offline mode.");
    return; // Don't throw for transient connectivity issues unless strictly required
  }

  throw new Error(JSON.stringify(errInfo));
}
