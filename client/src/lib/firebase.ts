import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { app, firebaseConfig } from "./firebaseApp";
import { firebaseAuth } from "./firebaseAuth";

export { firebaseAuth, firebaseConfig };

// Firestore persists previously used data and queues writes in IndexedDB.
// Its SDK retries queued writes automatically when connectivity returns.
export const firestore = (() => {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (error) {
    console.warn("La persistance locale Firestore n’est pas disponible dans ce navigateur.", error);
    return getFirestore(app);
  }
})();
