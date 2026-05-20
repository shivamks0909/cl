#!/usr/bin/env node

/**
 * Create admin user for PanelFlow using Supabase
 * 
 * Usage: node scripts/create-admin-supabase.js "email" "password" "Full Name"
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: ['.env.local', '.env'] });

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Parse arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || 'Admin';

if (!email || !password) {
  console.error(`
Usage: node scripts/create-admin-supabase.js "email" "password" ["Full Name"]

Example:
node scripts/create-admin-supabase.js admin@example.com MySecurePass123 "System Admin"
  `);
  process.exit(1);
}

async function createAdmin() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('Connecting to Supabase...');
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✓ Password hashed');
    
    // Check if user already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingAdmin) {
      console.log('⚠️ Admin with this email already exists.');
      console.log('Updating password...');
      
      // Update existing admin
      const { error: updateError } = await supabase
        .from('admins')
        .update({ password: hashedPassword })
        .eq('email', email);
      
      if (updateError) throw updateError;
      console.log('✓ Password updated successfully!');
    } else {
      // Create new admin
      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert({
          email: email,
          password: hashedPassword,
          name: name,
          role: 'admin'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      console.log('✅ Admin user created successfully!');
      console.log('\nUser details:');
      console.log(`  ID: ${newAdmin.id}`);
      console.log(`  Email: ${newAdmin.email}`);
      console.log(`  Created: ${newAdmin.created_at}`);
      console.log(`  Role: admin`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('You can now login at: https://new12-main.vercel.app/login');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdmin();
