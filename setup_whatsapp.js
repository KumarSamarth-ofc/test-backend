#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 WhatsApp Integration Setup for Stoory Backend\n');

async function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function setupWhatsApp() {
    console.log('📱 Choose your WhatsApp service provider:\n');
    console.log('1. Custom WhatsApp API (Your own API endpoint)');
    console.log('2. Console Mode (Development only)\n');

    const choice = await askQuestion('Enter your choice (1-2): ');

    let config = {};

    switch (choice) {
        case '1':
            config = await setupCustomAPI();
            break;
        case '2':
            config = await setupConsole();
            break;
        default:
            console.log('❌ Invalid choice. Using console mode.');
            config = await setupConsole();
    }

    return config;
}

async function setupCustomAPI() {
    console.log('\n🔧 Setting up Custom WhatsApp API...\n');
    
    const endpoint = await askQuestion('Enter your WhatsApp API endpoint URL: ');
    const apiKey = await askQuestion('Enter your WhatsApp API key (optional): ') || '';

    console.log('\n📋 Custom API Setup Instructions:');
    console.log('1. Your API should accept POST requests with:');
    console.log('   - phone: The phone number to send to');
    console.log('   - message: The message content');
    console.log('2. Your API should return a JSON response');
    console.log('3. Optional: Include API key in Authorization header\n');

    return {
        WHATSAPP_SERVICE: 'custom',
        WHATSAPP_API_ENDPOINT: endpoint,
        WHATSAPP_API_KEY: apiKey
    };
}

async function setupConsole() {
    console.log('\n🔧 Setting up Console Mode (Development)...\n');
    console.log('✅ Console mode is perfect for development and testing');
    console.log('📱 Messages will be logged to the console instead of sending actual WhatsApp messages\n');

    return {
        WHATSAPP_SERVICE: 'console'
    };
}

async function updateEnvFile(config) {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add WhatsApp configuration
    const lines = envContent.split('\n');
    const newLines = [];

    // Remove existing WhatsApp config lines
    const whatsappConfigKeys = [
        'WHATSAPP_SERVICE',
        'WHATSAPP_API_ENDPOINT',
        'WHATSAPP_API_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_WHATSAPP_NUMBER',
        'MESSAGEBIRD_API_KEY',
        'MESSAGEBIRD_WHATSAPP_CHANNEL_ID'
    ];

    for (const line of lines) {
        const key = line.split('=')[0];
        if (!whatsappConfigKeys.includes(key)) {
            newLines.push(line);
        }
    }

    // Add new WhatsApp configuration
    newLines.push('\n# WhatsApp Configuration');
    for (const [key, value] of Object.entries(config)) {
        newLines.push(`${key}=${value}`);
    }

    // Write updated .env file
    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('✅ Updated .env file with WhatsApp configuration');
}

async function testConfiguration() {
    console.log('\n🧪 Testing WhatsApp Configuration...\n');

    try {
        // Check if server is running
        const axios = require('axios');
        const response = await axios.get('http://localhost:3000/api/auth/whatsapp-status');
        console.log('✅ WhatsApp service is configured correctly');
        console.log('📊 Service status:', response.data);
    } catch (error) {
        console.log('⚠️  Server is not running. Start it with: npm start');
        console.log('💡 Then test the configuration manually');
    }
}

async function main() {
    try {
        // Setup WhatsApp configuration
        const config = await setupWhatsApp();

        // Update .env file
        await updateEnvFile(config);

        // Test configuration
        await testConfiguration();

        console.log('\n🎉 WhatsApp setup completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Start the server: npm start');
        console.log('2. Test the OTP flow: node test_whatsapp_auth.js');
        console.log('3. Check console logs for WhatsApp messages');
        console.log('4. Verify OTP functionality');

        if (config.WHATSAPP_SERVICE === 'console') {
            console.log('\n💡 Development Mode:');
            console.log('   - Messages will appear in console logs');
            console.log('   - No actual WhatsApp messages will be sent');
            console.log('   - Perfect for testing and development');
        } else {
            console.log('\n💡 Custom API Mode:');
            console.log('   - Messages will be sent to your API endpoint');
            console.log('   - Make sure your API is running and accessible');
            console.log('   - Test with a real phone number');
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    } finally {
        rl.close();
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { setupWhatsApp, updateEnvFile }; 