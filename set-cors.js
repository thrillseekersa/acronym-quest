// One-time script to set CORS on the Firebase Storage bucket
const { Storage } = require('@google-cloud/storage');

async function setCors() {
    const storage = new Storage({ projectId: 'studygame-e5806' });
    const bucket = storage.bucket('studygame-e5806.firebasestorage.app');

    await bucket.setCorsConfiguration([
        {
            origin: ['*'],
            method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
            responseHeader: [
                'Content-Type',
                'Authorization',
                'Content-Length',
                'User-Agent',
                'x-goog-resumable'
            ],
            maxAgeSeconds: 3600
        }
    ]);

    console.log('CORS configuration set successfully!');
}

setCors().catch(err => {
    console.error('Error setting CORS:', err.message);
    console.error('You may need to run: gcloud auth application-default login');
});
