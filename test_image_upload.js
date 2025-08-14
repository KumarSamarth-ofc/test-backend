// Test script to diagnose image upload issues
const { supabaseAdmin } = require('./supabase/client');
const fs = require('fs');
const path = require('path');

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
        // Test 1: Check if we can list buckets
        console.log('\n1. Testing bucket access...');
        const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
        
        if (bucketError) {
            console.error('❌ Error listing buckets:', bucketError);
            return false;
        }
        
        console.log('✅ Buckets found:', buckets.map(b => b.name));
        
        // Test 2: Check if 'images' bucket exists
        const imagesBucket = buckets.find(b => b.name === 'images');
        if (!imagesBucket) {
            console.error('❌ "images" bucket not found!');
            console.log('Please create the "images" bucket in your Supabase dashboard');
            return false;
        }
        
        console.log('✅ "images" bucket found');
        console.log('Bucket details:', {
            name: imagesBucket.name,
            public: imagesBucket.public,
            fileSizeLimit: imagesBucket.fileSizeLimit,
            allowedMimeTypes: imagesBucket.allowedMimeTypes
        });
        
        // Test 3: Try to list files in the bucket
        console.log('\n2. Testing file listing...');
        const { data: files, error: fileError } = await supabaseAdmin.storage
            .from('images')
            .list();
            
        if (fileError) {
            console.error('❌ Error listing files:', fileError);
        } else {
            console.log('✅ Files in bucket:', files.length);
            if (files.length > 0) {
                console.log('Sample files:', files.slice(0, 3));
            }
        }
        
        // Test 4: Try to upload a test file
        console.log('\n3. Testing file upload...');
        
        // Create a simple test image (1x1 pixel PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0x00, 0x00,
            0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00, 0x00,
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
        
        const testFileName = `test/test_${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('images')
            .upload(testFileName, testImageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: false
            });
            
        if (uploadError) {
            console.error('❌ Upload test failed:', uploadError);
            console.error('Error details:', {
                message: uploadError.message,
                statusCode: uploadError.statusCode,
                error: uploadError.error
            });
            return false;
        }
        
        console.log('✅ Upload test successful!');
        console.log('Upload data:', uploadData);
        
        // Test 5: Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('images')
            .getPublicUrl(testFileName);
            
        console.log('✅ Public URL generated:', urlData.publicUrl);
        
        // Test 6: Clean up test file
        const { error: deleteError } = await supabaseAdmin.storage
            .from('images')
            .remove([testFileName]);
            
        if (deleteError) {
            console.warn('⚠️ Could not delete test file:', deleteError);
        } else {
            console.log('✅ Test file cleaned up');
        }
        
        console.log('\n🎉 All tests passed! Your Supabase storage is working correctly.');
        return true;
        
    } catch (error) {
        console.error('❌ Test failed with exception:', error);
        console.error('Error stack:', error.stack);
        return false;
    }
}

// Check environment variables
console.log('🔧 Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('\n❌ Missing required environment variables!');
    console.error('Please check your .env file');
    process.exit(1);
}

// Run the test
testSupabaseConnection()
    .then(success => {
        if (success) {
            console.log('\n✅ Supabase storage is properly configured!');
        } else {
            console.log('\n❌ Supabase storage has issues that need to be resolved.');
        }
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });

