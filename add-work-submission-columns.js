const { supabaseAdmin } = require('./supabase/client');

async function addWorkSubmissionColumns() {
  console.log('🚀 Adding work submission columns to conversations table...');
  
  try {
    // Try to add columns one by one using Supabase's SQL execution
    const columns = [
      { name: 'work_submission', type: 'JSONB' },
      { name: 'submission_date', type: 'TIMESTAMP' },
      { name: 'work_status', type: 'TEXT DEFAULT \'pending\'' },
      { name: 'revision_count', type: 'INTEGER DEFAULT 0' },
      { name: 'max_revisions', type: 'INTEGER DEFAULT 3' },
      { name: 'approval_date', type: 'TIMESTAMP' },
      { name: 'rejection_date', type: 'TIMESTAMP' },
      { name: 'revision_feedback', type: 'TEXT' },
      { name: 'approval_feedback', type: 'TEXT' },
      { name: 'rejection_reason', type: 'TEXT' }
    ];
    
    for (const column of columns) {
      console.log(`📝 Adding column: ${column.name}`);
      
      try {
        // Use Supabase's SQL execution
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
        });
        
        if (error) {
          console.log(`⚠️  Column ${column.name} might already exist or there was an error:`, error.message);
        } else {
          console.log(`✅ Column ${column.name} added successfully`);
        }
      } catch (err) {
        console.log(`⚠️  Error adding column ${column.name}:`, err.message);
      }
    }
    
    // Update flow_state constraint
    console.log('🔄 Updating flow_state constraint...');
    try {
      await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE conversations DROP CONSTRAINT IF EXISTS check_flow_state;`
      });
      
      await supabaseAdmin.rpc('exec_sql', {
        sql: `ALTER TABLE conversations 
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
              ));`
      });
      
      console.log('✅ Flow state constraint updated');
    } catch (err) {
      console.log('⚠️  Error updating flow_state constraint:', err.message);
    }
    
    // Test if the columns exist by trying to query them
    console.log('🔍 Testing if columns exist...');
    try {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('work_submission, submission_date, work_status, revision_count, max_revisions')
        .limit(1);
      
      if (error) {
        console.log('❌ Columns not found:', error.message);
      } else {
        console.log('✅ Columns exist and are accessible!');
        console.log('📊 Sample data:', data);
      }
    } catch (err) {
      console.log('❌ Error testing columns:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
addWorkSubmissionColumns();
