import { getFirestore } from "firebase/firestore";
import { app, firebaseConfig } from "./firebaseApp";
import { firebaseAuth } from "./firebaseAuth";

export { firebaseAuth, firebaseConfig };
export const firestore = getFirestore(app);
