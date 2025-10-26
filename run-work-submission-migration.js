const { supabaseAdmin } = require('./supabase/client');

async function runWorkSubmissionMigration() {
  console.log('🚀 Starting work submission columns migration...');
  
  try {
    // 1. Add work submission related columns to conversations table
    console.log('📝 Adding work submission columns...');
    
    const migrationQueries = [
      // Add columns
      `ALTER TABLE conversations 
       ADD COLUMN IF NOT EXISTS work_submission JSONB,
       ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP,
       ADD COLUMN IF NOT EXISTS work_status TEXT DEFAULT 'pending',
       ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
       ADD COLUMN IF NOT EXISTS max_revisions INTEGER DEFAULT 3,
       ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP,
       ADD COLUMN IF NOT EXISTS rejection_date TIMESTAMP,
       ADD COLUMN IF NOT EXISTS revision_feedback TEXT,
       ADD COLUMN IF NOT EXISTS approval_feedback TEXT,
       ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`,
       
      // Update flow_state constraint
      `ALTER TABLE conversations 
       DROP CONSTRAINT IF EXISTS check_flow_state;`,
       
      `ALTER TABLE conversations 
       ADD CONSTRAINT check_flow_state 
       CHECK (flow_state IN (
         'initial',
         'influencer_responding',
         'influencer_reviewing',
         'influencer_price_response',
         'brand_owner_pricing',
         'brand_owner_negotiation',
         'influencer_final_response',
         'negotiation_input',
         'payment_pending',
         'payment_completed',
         'work_in_progress',
         'work_submitted',
         'work_revision_requested',
         'work_approved',
         'admin_final_payment_pending',
         'admin_final_payment_complete',
         'work_rejected',
         'real_time',
         'completed',
         'connection_rejected',
         'chat_closed',
         'closed'
       ));`,
       
      // Update work_status constraint
      `ALTER TABLE conversations 
       DROP CONSTRAINT IF EXISTS check_work_status;`,
       
      `ALTER TABLE conversations 
       ADD CONSTRAINT check_work_status 
       CHECK (work_status IN (
         'pending',
         'submitted',
         'approved',
         'revision_requested',
         'rejected'
       ));`,
       
      // Update existing conversations
      `UPDATE conversations 
       SET 
         work_status = 'pending',
         revision_count = 0,
         max_revisions = 3
       WHERE work_status IS NULL;`
    ];
    
    // Execute each query
    for (let i = 0; i < migrationQueries.length; i++) {
      console.log(`🔄 Executing query ${i + 1}/${migrationQueries.length}...`);
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: migrationQueries[i] 
      });
      
      if (error) {
        console.error(`❌ Error in query ${i + 1}:`, error);
        // Continue with other queries even if one fails
      } else {
        console.log(`✅ Query ${i + 1} executed successfully`);
      }
    }
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const { data: columns, error: verifyError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'conversations')
      .in('column_name', [
        'work_submission', 
        'submission_date', 
        'work_status', 
        'revision_count', 
        'max_revisions',
        'approval_date',
        'rejection_date',
        'revision_feedback',
        'approval_feedback',
        'rejection_reason'
      ]);
    
    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError);
    } else {
      console.log('✅ Migration verification successful!');
      console.log('📊 Added columns:', columns.map(c => c.column_name).join(', '));
    }
    
    console.log('🎉 Work submission migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runWorkSubmissionMigration();
