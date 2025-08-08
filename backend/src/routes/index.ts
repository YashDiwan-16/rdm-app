import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

// Health check endpoint for network detection
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Signup
router.post('/signup', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash: hash }])
    .select();

  if (error) return res.status(400).json({ error });

  const user = data?.[0];
  const { error: walletError } = await supabase.from('wallets').insert([{ 
    user_id: user.id,
    base_purse: 100, // Give new users 100 RDM to start with
    reward_purse: 0,
    remorse_purse: 0,
    charity_purse: 0
  }]);

  if (walletError) {
    console.error('Wallet creation error:', walletError);
    return res.status(400).json({ error: 'Failed to create wallet' });
  }

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return res.status(400).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, data.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid password' });

  const token = jwt.sign({ id: data.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Add default goal (no auth)
router.post('/goals/default', async (req: Request, res: Response) => {
  const { name, description, associated_tokens, target_time } = req.body;

  const { data, error } = await supabase.from('goals').insert([{
    name, description, associated_tokens, target_time, is_default: true
  }]).select();

  if (error) return res.status(400).json({ error });
  res.json(data?.[0]);
});

// Add custom goal
router.post('/goals/custom', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, description, associated_tokens, target_time, pledge_amount } = req.body;
  const user_id = req.user!.id;

  // Validate pledge amount (minimum 1 RDM per day)
  if (!pledge_amount || pledge_amount < 1) {
    return res.status(400).json({ error: 'Pledge amount must be at least 1 RDM' });
  }

  // Check if user has enough tokens in base purse
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('base_purse')
    .eq('user_id', user_id)
    .single();

  if (walletError || !wallet) {
    return res.status(400).json({ error: 'Unable to access wallet' });
  }

  if (wallet.base_purse < pledge_amount) {
    return res.status(400).json({ error: 'Insufficient tokens in base purse for pledge' });
  }

  // Create the goal
  const { data, error } = await supabase.from('goals').insert([{
    name,
    description,
    associated_tokens,
    pledge_amount,
    target_time,
    is_default: false,
    user_id
  }]).select();

  if (error) return res.status(400).json({ error });

  // Lock the pledge amount by deducting from base purse
  const { error: updateError } = await supabase
    .from('wallets')
    .update({
      base_purse: wallet.base_purse - pledge_amount
    })
    .eq('user_id', user_id);

  if (updateError) {
    console.error('Failed to lock pledge amount:', updateError);
    return res.status(400).json({ error: 'Failed to lock pledge amount' });
  }

  res.json({ 
    ...data?.[0], 
    message: `Goal created successfully! ${pledge_amount} RDM pledged and locked.` 
  });
});

// Get visible goals with claim status
router.get('/goals', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .or(`is_default.eq.true,user_id.eq.${user_id}`);

  if (error) return res.status(400).json({ error });

  // Get user's reflected goals (any reflection status)
  const { data: claimedGoals } = await supabase
    .from('user_goals')
    .select('goal_id')
    .eq('user_id', user_id);

  const claimedGoalIds = new Set(claimedGoals?.map(claim => claim.goal_id) || []);

  // Add claim status to each goal
  const goalsWithClaimStatus = goals?.map(goal => ({
    ...goal,
    is_claimed: claimedGoalIds.has(goal.id)
  }));

  res.json(goalsWithClaimStatus);
});

// Get all default goals
router.get('/goals/default', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('is_default', true);

  if (error) return res.status(400).json({ error });
  res.json(data);
});

// Seed default goals (for development)
router.post('/goals/seed', async (_req: Request, res: Response) => {
  const defaultGoals = [
    {
      name: '10 Minutes Meditation',
      description: 'Practice mindfulness meditation for 10 minutes',
      associated_tokens: 20,
      target_time: '2025-12-31T23:59:59',
      is_default: true
    },
    {
      name: 'Drink 2L Water',
      description: 'Stay hydrated by drinking 2 liters of water throughout the day',
      associated_tokens: 15,
      target_time: '2025-12-31T23:59:59',
      is_default: true
    },
    {
      name: 'Read 20 Pages',
      description: 'Expand your knowledge by reading 20 pages of a book',
      associated_tokens: 25,
      target_time: '2025-12-31T23:59:59',
      is_default: true
    },
    {
      name: 'Walk 5000 Steps',
      description: 'Stay active by walking at least 5000 steps',
      associated_tokens: 18,
      target_time: '2025-12-31T23:59:59',
      is_default: true
    },
    {
      name: 'Practice Gratitude',
      description: 'Write down 3 things you are grateful for today',
      associated_tokens: 12,
      target_time: '2025-12-31T23:59:59',
      is_default: true
    }
  ];

  const { data, error } = await supabase
    .from('goals')
    .insert(defaultGoals)
    .select();

  if (error) return res.status(400).json({ error });
  res.json({ message: 'Default goals seeded successfully', goals: data });
});

// Get user's wallet
router.get('/wallet', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Wallet fetch error:', error);
    return res.status(400).json({ error: error.message });
  }
  
  console.log('Wallet data structure:', data);
  res.json(data);
});

// Debug endpoint to check wallet table structure
router.get('/wallet/debug', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // Try to get wallet and see what columns exist
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Debug wallet fetch error:', error);
    return res.status(400).json({ error: error.message, details: error });
  }
  
  res.json({ 
    message: 'Wallet debug info',
    wallet_data: data,
    columns: data ? Object.keys(data) : [],
    user_id: userId
  });
});


// Get all purse balances of logged-in user
router.get('/wallet/balance', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;

  const { data, error } = await supabase
    .from('wallets')
    .select('base_purse, reward_purse, remorse_purse, charity_purse')
    .eq('user_id', user_id)
    .single();

  if (error) return res.status(400).json({ error });

  res.json(data);
});


// Goal reflection - handle done/partly/not done status
router.post('/goals/reflect', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { goal_id, reflection_status } = req.body;
  const user_id = req.user!.id;

  // Validate reflection status
  const validStatuses = ['done', 'partly done', 'not done'];
  if (!validStatuses.includes(reflection_status)) {
    return res.status(400).json({ error: 'Invalid reflection status. Must be: done, partly done, or not done' });
  }

  try {
    // Get the goal details including pledge amount
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      console.error('Goal fetch error:', goalError);
      return res.status(400).json({ error: `Goal not found: ${goalError?.message || 'Unknown error'}` });
    }

    // Check if user has already reflected on this goal
    const { data: existingReflection } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('goal_id', goal_id);

    if (existingReflection && existingReflection.length > 0) {
      return res.status(400).json({ error: 'Goal reflection already completed' });
    }

    // Record the reflection
    const { error: reflectionError } = await supabase
      .from('user_goals')
      .insert([{
        user_id,
        goal_id,
        completed: reflection_status === 'done',
        reflection_status,
        completed_at: new Date().toISOString()
      }]);

    if (reflectionError) {
      console.error('Goal reflection error:', reflectionError);
      return res.status(400).json({ error: `Failed to record reflection: ${reflectionError.message}` });
    }

    // Get user's current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError);
      return res.status(400).json({ error: `Wallet not found: ${walletError?.message || 'Unknown error'}` });
    }

    // Distribute pledged tokens based on reflection status
    const pledgeAmount = goal.pledge_amount || 0;
    let walletUpdates: any = {};
    let message = '';

    switch (reflection_status) {
      case 'done':
        // All pledge + associated tokens go to reward purse
        walletUpdates.reward_purse = wallet.reward_purse + pledgeAmount + goal.associated_tokens;
        message = `Excellent! ${pledgeAmount + goal.associated_tokens} RDM moved to your Reward Purse.`;
        break;
      
      case 'partly done':
        // Split pledge 50:50 between reward and remorse, associated tokens to reward
        const halfPledge = Math.floor(pledgeAmount / 2);
        walletUpdates.reward_purse = wallet.reward_purse + halfPledge + goal.associated_tokens;
        walletUpdates.remorse_purse = wallet.remorse_purse + (pledgeAmount - halfPledge);
        message = `${halfPledge} RDM to Reward Purse, ${pledgeAmount - halfPledge} RDM to Remorse Purse, plus ${goal.associated_tokens} bonus RDM to Reward Purse.`;
        break;
      
      case 'not done':
        // All pledge goes to remorse purse
        walletUpdates.remorse_purse = wallet.remorse_purse + pledgeAmount;
        message = `${pledgeAmount} RDM moved to your Remorse Purse. Try again tomorrow!`;
        break;
    }

    // Update wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update(walletUpdates)
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(400).json({ error: `Failed to distribute tokens: ${updateError.message}` });
    }

    res.json({ 
      success: true, 
      goal_id, 
      reflection_status,
      pledge_amount: pledgeAmount,
      associated_tokens: goal.associated_tokens,
      message
    });
  } catch (error: any) {
    console.error('Error processing reflection:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// Transfer tokens
router.post('/wallet/transfer', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { to_user_id, to_purse, from_purse, amount, type, charity_info } = req.body;
  const sender_id = req.user!.id;

  try {
    const { data: wallets, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', sender_id)
      .single();

    if (walletErr || !wallets) {
      return res.status(400).json({ error: `Wallet not found: ${walletErr?.message || 'Unknown error'}` });
    }

    if (type === 'self-transfer') {
      // For self-transfer, allow any purse as source and any purse as destination
      if (!from_purse) {
        return res.status(400).json({ error: 'Source purse is required for self-transfers' });
      }

      if (from_purse === to_purse) {
        return res.status(400).json({ error: 'Source and destination purses cannot be the same' });
      }

      if (wallets[`${from_purse}_purse`] < amount) {
        return res.status(400).json({ error: `Insufficient tokens in ${from_purse} purse` });
      }

      // Transfer from source purse to destination purse
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          [`${from_purse}_purse`]: wallets[`${from_purse}_purse`] - amount,
          [`${to_purse}_purse`]: wallets[`${to_purse}_purse`] + amount
        })
        .eq('user_id', sender_id);

      if (updateError) {
        console.error('Self-transfer error:', updateError);
        return res.status(400).json({ error: `Transfer failed: ${updateError.message}` });
      }

      // Record the transaction
      await supabase.from('transactions').insert([{
        sender_id,
        receiver_id: sender_id,
        from_purse,
        to_purse,
        amount,
        type,
        charity_info
      }]);

      res.json({ message: `Successfully transferred ${amount} tokens from ${from_purse} purse to ${to_purse} purse` });

    } else if (type === 'peer') {
      // For peer transfers, use the specified from_purse
      if (!from_purse) {
        return res.status(400).json({ error: 'Source purse is required for peer transfers' });
      }

      if (wallets[`${from_purse}_purse`] < amount) {
        return res.status(400).json({ error: 'Insufficient funds in source purse' });
      }

      // Deduct from sender's purse
      await supabase
        .from('wallets')
        .update({ [`${from_purse}_purse`]: wallets[`${from_purse}_purse`] - amount })
        .eq('user_id', sender_id);

      // Add to receiver's purse
      const { data: receiverWallet, error: recvErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', to_user_id)
        .single();

      if (recvErr || !receiverWallet) {
        return res.status(400).json({ error: 'Receiver not found' });
      }

      await supabase
        .from('wallets')
        .update({
          [`${to_purse}_purse`]: receiverWallet[`${to_purse}_purse`] + amount
        })
        .eq('user_id', to_user_id);

      // Record the transaction
      await supabase.from('transactions').insert([{
        sender_id,
        receiver_id: to_user_id,
        from_purse,
        to_purse,
        amount,
        type,
        charity_info
      }]);

      res.json({ message: `Successfully sent ${amount} tokens` });

    } else {
      return res.status(400).json({ error: 'Invalid transfer type' });
    }

  } catch (error: any) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: `Transfer failed: ${error.message}` });
  }
});

// Get all charity organizations
router.get('/charity/organizations', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('charity_organizations')
      .select('*')
      .eq('is_active', true)
      .order('allocation_percentage', { ascending: false });

    if (error) {
      console.error('Error fetching charity organizations:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Charity organizations fetch error:', error);
    res.status(500).json({ error: `Failed to fetch charity organizations: ${error.message}` });
  }
});

// Get charity distribution preview
router.get('/charity/preview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's charity purse balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('charity_purse')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    // Get charity organizations
    const { data: charities, error: charityError } = await supabase
      .from('charity_organizations')
      .select('*')
      .eq('is_active', true)
      .order('allocation_percentage', { ascending: false });

    if (charityError) {
      return res.status(400).json({ error: charityError.message });
    }

    const charityPurseBalance = wallet.charity_purse || 0;
    
    // Calculate allocations
    const preview = charities.map(charity => ({
      ...charity,
      allocated_amount: Math.floor((charityPurseBalance * charity.allocation_percentage) / 100)
    }));

    res.json({
      charity_purse_balance: charityPurseBalance,
      total_to_distribute: charityPurseBalance,
      allocations: preview
    });
  } catch (error: any) {
    console.error('Charity preview error:', error);
    res.status(500).json({ error: `Failed to generate preview: ${error.message}` });
  }
});

// Distribute charity purse to organizations
router.post('/charity/distribute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user's charity purse balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('charity_purse')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const charityPurseBalance = wallet.charity_purse || 0;

    if (charityPurseBalance <= 0) {
      return res.status(400).json({ error: 'No tokens available in charity purse' });
    }

    // Get charity organizations
    const { data: charities, error: charityError } = await supabase
      .from('charity_organizations')
      .select('*')
      .eq('is_active', true);

    if (charityError || !charities || charities.length === 0) {
      return res.status(400).json({ error: 'No active charity organizations found' });
    }

    // Create distribution record
    const { data: distribution, error: distError } = await supabase
      .from('charity_distributions')
      .insert([{
        user_id: userId,
        total_amount: charityPurseBalance,
        status: 'completed'
      }])
      .select()
      .single();

    if (distError || !distribution) {
      return res.status(400).json({ error: 'Failed to create distribution record' });
    }

    // Calculate and insert distribution details
    const distributionDetails = [];
    let totalAllocated = 0;

    for (const charity of charities) {
      const allocatedAmount = Math.floor((charityPurseBalance * charity.allocation_percentage) / 100);
      totalAllocated += allocatedAmount;

      if (allocatedAmount > 0) {
        distributionDetails.push({
          distribution_id: distribution.id,
          charity_org_id: charity.id,
          allocated_amount: allocatedAmount
        });
      }
    }

    // Insert distribution details
    const { error: detailsError } = await supabase
      .from('charity_distribution_details')
      .insert(distributionDetails);

    if (detailsError) {
      console.error('Distribution details error:', detailsError);
      return res.status(400).json({ error: 'Failed to record distribution details' });
    }

    // Zero out charity purse
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ charity_purse: 0 })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(400).json({ error: 'Failed to update wallet' });
    }

    // Return success with distribution details
    const response = await supabase
      .from('charity_distribution_details')
      .select(`
        allocated_amount,
        charity_organizations!inner(name, category, wallet_address, allocation_percentage)
      `)
      .eq('distribution_id', distribution.id);

    res.json({
      message: 'Charity distribution completed successfully!',
      distribution_id: distribution.id,
      total_distributed: charityPurseBalance,
      details: response.data
    });

  } catch (error: any) {
    console.error('Charity distribution error:', error);
    res.status(500).json({ error: `Distribution failed: ${error.message}` });
  }
});

// Get user's charity distribution history
router.get('/charity/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('charity_distributions')
      .select(`
        id,
        total_amount,
        distribution_date,
        status,
        charity_distribution_details!inner(
          allocated_amount,
          charity_organizations!inner(name, category, allocation_percentage, wallet_address)
        )
      `)
      .eq('user_id', userId)
      .order('distribution_date', { ascending: false });

    if (error) {
      console.error('History fetch error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Charity history error:', error);
    res.status(500).json({ error: `Failed to fetch history: ${error.message}` });
  }
});

// Distribute selected amounts to specific organizations
router.post('/charity/distribute-selected', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { selections } = req.body; // { orgId: amount, orgId2: amount2, ... }

    if (!selections || Object.keys(selections).length === 0) {
      return res.status(400).json({ error: 'No organizations selected' });
    }

    // Get user's charity purse balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('charity_purse')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    const charityPurseBalance = wallet.charity_purse || 0;
    const totalSelected = Object.values(selections).reduce((sum: number, amount: any) => sum + parseFloat(amount), 0);

    // Convert to integer for database
    const totalSelectedInt = Math.floor(totalSelected);

    if (totalSelectedInt > charityPurseBalance) {
      return res.status(400).json({ error: 'Selected amount exceeds charity purse balance' });
    }

    if (totalSelectedInt <= 0) {
      return res.status(400).json({ error: 'Invalid donation amounts' });
    }

    // Validate all organization IDs exist
    const orgIds = Object.keys(selections);
    const { data: organizations, error: orgError } = await supabase
      .from('charity_organizations')
      .select('*')
      .in('id', orgIds)
      .eq('is_active', true);

    if (orgError || !organizations || organizations.length !== orgIds.length) {
      return res.status(400).json({ error: 'Some selected organizations are invalid' });
    }

    // Create distribution record
    const { data: distribution, error: distError } = await supabase
      .from('charity_distributions')
      .insert([{
        user_id: userId,
        total_amount: totalSelectedInt,
        status: 'completed'
      }])
      .select()
      .single();

    if (distError || !distribution) {
      return res.status(400).json({ error: 'Failed to create distribution record' });
    }

    // Create distribution details for selected organizations
    const distributionDetails = [];
    for (const [orgId, amount] of Object.entries(selections)) {
      const donationAmount = parseFloat(amount as string);
      const donationAmountInt = Math.floor(donationAmount);
      if (donationAmountInt > 0) {
        distributionDetails.push({
          distribution_id: distribution.id,
          charity_org_id: orgId,
          allocated_amount: donationAmountInt
        });
      }
    }

    // Insert distribution details
    const { error: detailsError } = await supabase
      .from('charity_distribution_details')
      .insert(distributionDetails);

    if (detailsError) {
      console.error('Distribution details error:', detailsError);
      return res.status(400).json({ error: 'Failed to record distribution details' });
    }

    // Deduct selected amount from charity purse
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ charity_purse: charityPurseBalance - totalSelectedInt })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(400).json({ error: 'Failed to update wallet' });
    }

    // Get final distribution details with organization info
    const response = await supabase
      .from('charity_distribution_details')
      .select(`
        allocated_amount,
        charity_organizations!inner(name, category, wallet_address)
      `)
      .eq('distribution_id', distribution.id);

    res.json({
      message: 'Selected charity distribution completed successfully!',
      distribution_id: distribution.id,
      total_distributed: totalSelectedInt,
      details: response.data
    });

  } catch (error: any) {
    console.error('Selected charity distribution error:', error);
    res.status(500).json({ error: `Distribution failed: ${error.message}` });
  }
});

// Direct donation to a specific organization
router.post('/charity/donate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { organization_id, amount, from_purse } = req.body;
    
    // console.log('Charity donation request:', { userId, organization_id, amount, from_purse });

    if (!organization_id || !amount || !from_purse) {
      return res.status(400).json({ error: 'Missing required fields: organization_id, amount, from_purse' });
    }

    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      return res.status(400).json({ error: 'Invalid donation amount' });
    }

    // Convert to integer (database expects integer values)
    const donationAmountInt = Math.floor(donationAmount);

    // console.log('Validating organization:', organization_id);
    // Validate organization exists and is active
    const { data: organization, error: orgError } = await supabase
      .from('charity_organizations')
      .select('*')
      .eq('id', organization_id)
      .eq('is_active', true)
      .single();

    if (orgError || !organization) {
        return res.status(400).json({ error: 'Organization not found or inactive' });
    }
    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }

    // Check if user has sufficient balance in the selected purse
    const purseBalance = wallet[`${from_purse}_purse`];
    
    if (purseBalance < donationAmountInt) {
      return res.status(400).json({ error: `Insufficient balance in ${from_purse} purse` });
    }

    // Create donation record in charity_distributions table
    
    const { data: donation, error: donationError } = await supabase
      .from('charity_distributions')
      .insert([{
        user_id: userId,
        total_amount: donationAmountInt,
        status: 'completed'
      }])
      .select()
      .single();

    if (donationError || !donation) {
      return res.status(400).json({ error: `Failed to create donation record: ${donationError?.message || 'Unknown error'}` });
    }

    // Create donation detail record
    const { error: detailError } = await supabase
      .from('charity_distribution_details')
      .insert([{
        distribution_id: donation.id,
        charity_org_id: organization_id,
        allocated_amount: donationAmountInt
      }]);

    if (detailError) {
      console.error('Donation detail error:', detailError);
      return res.status(400).json({ error: 'Failed to record donation details' });
    }

    // Deduct amount from user's purse
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ [`${from_purse}_purse`]: purseBalance - donationAmountInt })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Wallet update error:', updateError);
      return res.status(400).json({ error: 'Failed to update wallet' });
    }

    res.json({
      message: 'Donation successful!',
      donation_id: donation.id,
      organization: organization.name,
      amount: donationAmountInt,
      from_purse,
      transaction_date: donation.distribution_date
    });

  } catch (error: any) {
    console.error('Direct donation error:', error);
    res.status(500).json({ error: `Donation failed: ${error.message}` });
  }
});

// Seed charity organizations (development only)
router.post('/charity/seed', async (_req: Request, res: Response) => {
  try {
    const charityOrgs = [
      {
        name: 'ISKCON Foundation',
        category: 'faith-based',
        description: 'International Society for Krishna Consciousness - Spiritual and cultural development',
        wallet_address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
        allocation_percentage: 40.00,
        is_active: true
      },
      {
        name: 'American Cancer Society',
        category: 'healthcare',
        description: 'Leading organization in cancer research, patient support, and prevention',
        wallet_address: '0x2345678901BCDEF12345678901BCDEF123456789',
        allocation_percentage: 30.00,
        is_active: true
      },
      {
        name: 'Senior Citizens Welfare',
        category: 'elderly-care',
        description: 'Providing care, support and dignity to elderly community members',
        wallet_address: '0x3456789012CDEF123456789012CDEF12345678AB',
        allocation_percentage: 20.00,
        is_active: true
      },
      {
        name: 'Global Education Initiative',
        category: 'education',
        description: 'Ensuring quality education access for underprivileged children worldwide',
        wallet_address: '0x456789013DEF123456789013DEF123456789ABC',
        allocation_percentage: 10.00,
        is_active: true
      }
    ];

    const { data, error } = await supabase
      .from('charity_organizations')
      .insert(charityOrgs)
      .select();

    if (error) {
      console.error('Charity seed error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Charity organizations seeded successfully', 
      organizations: data 
    });
  } catch (error: any) {
    console.error('Charity seed error:', error);
    res.status(500).json({ error: `Failed to seed charity organizations: ${error.message}` });
  }
});

// Get transaction history (for send tokens history)
router.get('/wallet/transactions', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;
  console.log('🔍 Fetching transactions for user:', user_id);

  try {
    // First, let's just try to get all transactions to see if the table exists
    const { data: allTransactions, error: allError } = await supabase
      .from('transactions')
      .select('*')
      .limit(5);

    if (allError) {
      console.error('❌ Error accessing transactions table:', allError);
      return res.status(400).json({ error: `Cannot access transactions table: ${allError.message}` });
    }

    console.log('✅ Transactions table accessible, sample data:', allTransactions);

    // Now try to get user-specific transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('sender_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Transaction history error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return res.status(400).json({ error: `Failed to fetch transaction history: ${error.message}` });
    }

    console.log('📊 Found transactions:', transactions?.length || 0);

    // Format the transactions for the frontend
    const formattedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      from_purse: transaction.from_purse,
      to_purse: transaction.to_purse,
      type: transaction.type,
      created_at: transaction.created_at,
      is_sent: transaction.sender_id === user_id,
      is_received: transaction.receiver_id === user_id,
      is_self_transfer: transaction.sender_id === transaction.receiver_id,
      other_party_email: null, // Will be null for now since we removed the join
      charity_info: transaction.charity_info
    })) || [];

    res.json(formattedTransactions);
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

export default router;
