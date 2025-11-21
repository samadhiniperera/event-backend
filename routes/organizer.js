const express = require('express');
const supabase = require('../db');
const router = express.Router();

// Updated Middleware to check if user is organizer
const requireOrganizer = async (req, res, next) => {
  try {
    // Get email from Authorization header or request body
    let email = req.body.email;
    
    // If no email in body, check Authorization header
    if (!email && req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      // For simplicity, we're using email as token in this case
      // In production, you'd verify JWT tokens properly
      email = token;
    }

    if (!email) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    console.log('🔍 Checking organizer access for:', email);
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.log('❌ User not found:', userError);
      return res.status(403).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (userData.role !== 'organizer') {
      console.log('❌ User is not organizer');
      return res.status(403).json({ 
        success: false, 
        error: 'Organizer access required' 
      });
    }

    console.log('✅ Organizer access granted for:', email);
    req.user = userData; // Attach user data to request
    next();
  } catch (error) {
    console.error('💥 Auth middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

// Apply organizer middleware to all routes
router.use(requireOrganizer);

// Committee management routes
router.get('/committee', async (req, res) => {
  try {
    console.log('📋 Fetching committee members...');
    
    const { data, error } = await supabase
      .from('committee')
      .select('*')
      .order('member_name');

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} committee members`);
    res.json({ success: true, members: data || [] });
  } catch (error) {
    console.error('💥 Error fetching committee:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/committee', async (req, res) => {
  try {
    const { member_name, role, email, phone, responsibilities } = req.body;
    
    console.log('➕ Adding committee member:', member_name);
    
    if (!member_name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Member name and role are required'
      });
    }

    const { data, error } = await supabase
      .from('committee')
      .insert([{ 
        member_name, 
        role, 
        email: email || null, 
        phone: phone || null, 
        responsibilities: responsibilities || null 
      }])
      .select();

    if (error) throw error;
    
    console.log('✅ Committee member added successfully');
    res.json({ success: true, member: data[0] });
  } catch (error) {
    console.error('💥 Error adding committee member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update committee member
router.put('/committee/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const { member_name, role, email, phone, responsibilities } = req.body;
    
    console.log('✏️ Updating committee member:', memberId);
    
    const { data, error } = await supabase
      .from('committee')
      .update({ 
        member_name, 
        role, 
        email, 
        phone, 
        responsibilities 
      })
      .eq('member_id', memberId)
      .select();

    if (error) throw error;
    
    console.log('✅ Committee member updated successfully');
    res.json({ success: true, member: data[0] });
  } catch (error) {
    console.error('💥 Error updating committee member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete committee member
router.delete('/committee/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    console.log('🗑️ Deleting committee member:', memberId);
    
    const { error } = await supabase
      .from('committee')
      .delete()
      .eq('member_id', memberId);

    if (error) throw error;
    
    console.log('✅ Committee member deleted successfully');
    res.json({ success: true, message: 'Committee member deleted successfully' });
  } catch (error) {
    console.error('💥 Error deleting committee member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;