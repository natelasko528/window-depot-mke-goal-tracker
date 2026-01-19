import { supabase } from './supabase';

/**
 * Required tables for the application
 */
const REQUIRED_TABLES = [
  // Core tables
  'users',
  'daily_logs',
  'appointments',
  'feed_posts',
  'feed_likes',
  'feed_comments',
  
  // Gamification tables
  'achievements',
  'challenges',
  'user_challenges',
  'rewards',
  'user_rewards',
  
  // Audit & system tables
  'audit_log',
  'system_settings',
  'data_backups',
  'error_log',
  
  // Daily snapshots
  'daily_snapshots',
  
  // Integration tables
  'webhook_events',
  'integration_sync_status',
  'integration_data',
  
  // Universal connector tables
  'connector_definitions',
  'api_keys',
  'user_webhooks',
  'webhook_delivery_logs',
];

/**
 * Check if a table exists by attempting a simple query
 */
const checkTableExists = async (tableName) => {
  try {
    // Try to query the table with a limit of 0 to minimize data transfer
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (error) {
      // PGRST205 means table doesn't exist
      if (error.code === 'PGRST205' || 
          error.message?.includes('PGRST205') ||
          (error.message?.includes('relation') && error.message?.includes('does not exist'))) {
        return { exists: false, error: null };
      }
      // Other errors might indicate table exists but has issues
      return { exists: true, error: error.message };
    }
    
    return { exists: true, error: null };
  } catch (error) {
    // Network errors or other issues
    return { exists: false, error: error.message };
  }
};

/**
 * Check health status of all required tables
 */
export const checkSupabaseHealth = async () => {
  const results = {
    healthy: true,
    tables: {},
    missingTables: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Check each required table
  for (const tableName of REQUIRED_TABLES) {
    const status = await checkTableExists(tableName);
    results.tables[tableName] = status;
    
    if (!status.exists) {
      results.healthy = false;
      results.missingTables.push(tableName);
    }
    
    if (status.error) {
      results.errors.push({ table: tableName, error: status.error });
    }
  }

  return results;
};

/**
 * Get a summary of table health status
 */
export const getHealthSummary = async () => {
  const health = await checkSupabaseHealth();
  
  const summary = {
    overall: health.healthy ? 'healthy' : 'unhealthy',
    totalTables: REQUIRED_TABLES.length,
    existingTables: REQUIRED_TABLES.length - health.missingTables.length,
    missingTables: health.missingTables.length,
    missingTableList: health.missingTables,
    hasErrors: health.errors.length > 0,
    errors: health.errors,
    timestamp: health.timestamp,
  };

  return summary;
};

/**
 * Check if specific tables exist (for targeted checks)
 */
export const checkTablesExist = async (tableNames) => {
  const results = {};
  
  for (const tableName of tableNames) {
    results[tableName] = await checkTableExists(tableName);
  }
  
  return results;
};

/**
 * Get user-friendly health status message
 */
export const getHealthStatusMessage = async () => {
  const summary = await getHealthSummary();
  
  if (summary.overall === 'healthy') {
    return {
      status: 'success',
      message: `✅ All ${summary.existingTables} required tables exist in the database.`,
      details: null,
    };
  }
  
  const missingList = summary.missingTableList.join(', ');
  return {
    status: 'warning',
    message: `⚠️ ${summary.missingTables} table(s) are missing: ${missingList}`,
    details: {
      missingTables: summary.missingTableList,
      instruction: 'See SUPABASE_MIGRATION_INSTRUCTIONS.md for migration steps',
    },
  };
};

/**
 * Log health status to console with formatted output
 */
export const logHealthStatus = async () => {
  const summary = await getHealthSummary();
  
  console.group('🏥 Supabase Database Health Check');
  console.log(`Overall Status: ${summary.overall === 'healthy' ? '✅ Healthy' : '⚠️ Unhealthy'}`);
  console.log(`Tables: ${summary.existingTables}/${summary.totalTables} exist`);
  
  if (summary.missingTables > 0) {
    console.warn(`Missing Tables (${summary.missingTables}):`, summary.missingTableList);
    console.info('💡 Run migrations to create missing tables. See SUPABASE_MIGRATION_INSTRUCTIONS.md');
  }
  
  if (summary.hasErrors) {
    console.error('Errors:', summary.errors);
  }
  
  console.log(`Checked at: ${new Date(summary.timestamp).toLocaleString()}`);
  console.groupEnd();
  
  return summary;
};
