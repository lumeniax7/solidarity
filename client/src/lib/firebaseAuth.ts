import { getAuth } from "firebase/auth";
import { app } from "./firebaseApp";

export const firebaseAuth = getAuth(app);
