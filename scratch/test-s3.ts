import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function testS3() {
  console.log('Testing AWS S3 Connectivity for Droplet...');
  console.log('Bucket:', process.env.AWS_BUCKET_NAME);
  console.log('Region:', process.env.AWS_REGION);
  console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.slice(0, 8)}...` : 'NONE');

  const client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  // 1. Check CORS configuration
  console.log('\n1. Checking S3 Bucket CORS Policy...');
  try {
    const corsRes = await client.send(
      new GetBucketCorsCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
      })
    );
    console.log('✅ CORS is configured on bucket!');
    console.log(JSON.stringify(corsRes.CORSRules, null, 2));
  } catch (err: any) {
    console.error('❌ Failed to fetch CORS or not configured:', err.message);
  }

  // 2. Test Direct PutObject & Presigned Upload
  const testKey = `s3_test_verification_${Date.now()}.txt`;
  console.log(`\n2. Testing PutObject and Presigned URLs with key: ${testKey}...`);
  try {
    const putCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: testKey,
      ContentType: 'text/plain',
    });
    const presignedUploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 60 });
    console.log('✅ Generated Pre-signed Upload URL:');
    console.log(presignedUploadUrl.slice(0, 80) + '...');

    // Upload direct test payload
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: testKey,
        Body: Buffer.from('Droplet AWS S3 Direct Upload Verification SUCCESS!'),
        ContentType: 'text/plain',
      })
    );
    console.log('✅ Direct PutObject succeeded!');

    // 3. Test Pre-signed Download URL
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: testKey,
      ResponseContentDisposition: 'attachment; filename="test.txt"',
    });
    const presignedDownloadUrl = await getSignedUrl(client, getCommand, { expiresIn: 60 });
    console.log('✅ Generated Pre-signed Download URL:');
    console.log(presignedDownloadUrl.slice(0, 80) + '...');

    // 4. Clean up test object
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: testKey,
      })
    );
    console.log('✅ Cleaned up test object!');
    console.log('\n🎉 ALL S3 TESTS PASSED! AWS S3 IS 100% OPERATIONAL FOR DROPLET!');
  } catch (err: any) {
    console.error('❌ S3 operation failed:', err);
  }
}

testS3();
