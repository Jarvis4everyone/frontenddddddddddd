/**
 * Script to create an admin user in the database
 * Run: node scripts/createAdmin.js
 */
require('dotenv').config();
const readline = require('readline');
const { connectToMongo, closeMongoConnection, getDatabase } = require('../backend/config/database');
const UserService = require('../backend/services/userService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToMongo();
    console.log('Connected!\n');

    console.log('Creating admin user...');
    console.log('Enter admin details:');
    
    const name = await question('Name: ');
    const email = await question('Email: ');
    const contact_number = await question('Contact Number: ');
    const password = await question('Password: ');

    // Check if user already exists
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      console.log(`\nUser with email ${email} already exists!`);
      await closeMongoConnection();
      rl.close();
      return;
    }

    // Create admin user
    const user = await UserService.createUser({
      name,
      email,
      contact_number,
      password,
      is_admin: true
    });

    console.log('\n✓ Admin user created successfully!');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Is Admin: ${user.is_admin}`);

    await closeMongoConnection();
    rl.close();
  } catch (error) {
    console.error('\n✗ Error creating admin user:', error.message);
    await closeMongoConnection();
    rl.close();
    process.exit(1);
  }
}

createAdmin();
