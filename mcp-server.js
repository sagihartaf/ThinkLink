#!/usr/bin/env node

/**
 * MCP Server for ThinkLink Supabase Integration
 * This script starts an MCP server that connects to your Supabase database
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load configuration
const configPath = path.join(__dirname, 'mcp-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ mcp-config.json not found. Please create it with your Supabase credentials.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Validate configuration
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.error('❌ Missing required Supabase configuration. Please check mcp-config.json');
  process.exit(1);
}

console.log('🚀 Starting ThinkLink MCP Server...');
console.log(`📡 Supabase URL: ${config.supabaseUrl}`);
console.log(`🔌 Port: ${config.port || 3001}`);

// Set environment variables
process.env.SUPABASE_URL = config.supabaseUrl;
process.env.SUPABASE_ANON_KEY = config.supabaseAnonKey;
if (config.supabaseServiceRoleKey) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabaseServiceRoleKey;
}

// Start the MCP server
const mcpServerPath = path.join(__dirname, 'node_modules', '@supabase', 'mcp-server-supabase', 'dist', 'index.js');
const mcpServer = spawn('node', [mcpServerPath], {
  stdio: 'inherit',
  env: process.env
});

mcpServer.on('close', (code) => {
  console.log(`🔴 MCP Server exited with code ${code}`);
});

mcpServer.on('error', (error) => {
  console.error('❌ Failed to start MCP Server:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP Server...');
  mcpServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down MCP Server...');
  mcpServer.kill('SIGTERM');
  process.exit(0);
});
