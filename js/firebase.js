/**
 * firebase.js — Single initialization point for Firebase SDK modules.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig } from './data.js';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
