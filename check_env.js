import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

console.log('Checking Cloudinary Environment Variables:');
let missing = false;
keys.forEach(key => {
    if (!process.env[key]) {
        console.log(`❌ ${key} is MISSING or EMPTY`);
        missing = true;
    } else {
        console.log(`✅ ${key} is set (Length: ${process.env[key].length})`);
    }
});

if (missing) {
    console.log('\nConclusion: Cloudinary is NOT configured correctly.');
} else {
    console.log('\nConclusion: Cloudinary variables seem to be present.');
}
