// config/gcs.config.js
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: process.env.GCP_KEY_FILE, // path to service account
});

export const bucket = storage.bucket('ilp-payments-intern-batch-04');