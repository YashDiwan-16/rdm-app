import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

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
    discipline_purse: 0,
    focus_purse: 0,
    mindfulness_purse: 0,
    base_purse: 0,
    reward_purse: 0,
    remorse_purse: 0
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
  const { name, description, associated_tokens, target_time } = req.body;

  const { data, error } = await supabase.from('goals').insert([{
    name,
    description,
    associated_tokens,
    target_time,
    is_default: false,
    user_id: req.user!.id
  }]).select();

  if (error) return res.status(400).json({ error });
  res.json(data?.[0]);
});

// Get visible goals with claim status
router.get('/goals', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user_id = req.user!.id;

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .or(`is_default.eq.true,user_id.eq.${user_id}`);

  if (error) return res.status(400).json({ error });

  // Get user's claimed goals
  const { data: claimedGoals } = await supabase
    .from('user_goals')
    .select('goal_id')
    .eq('user_id', user_id)
    .eq('completed', true);

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
    .select('base_purse, reward_purse, remorse_purse')
    .eq('user_id', user_id)
    .single();

  if (error) return res.status(400).json({ error });

  res.json(data);
});


// Complete goal
router.post('/goals/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { goal_id, completed } = req.body;
  const user_id = req.user!.id;

  try {
    // First, get the goal details to know how many tokens to award
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goal_id)
      .single();

    if (goalError || !goal) {
      console.error('Goal fetch error:', goalError);
      return res.status(400).json({ error: `Goal not found: ${goalError?.message || 'Unknown error'}` });
    }

    // Check if user has already claimed this goal by creating a user_goals entry
    const { data: existingClaim } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user_id)
      .eq('goal_id', goal_id)
      .eq('completed', true);

    if (existingClaim && existingClaim.length > 0) {
      return res.status(400).json({ error: 'Goal already claimed' });
    }

    // If goal is completed, record the claim and award tokens
    if (completed) {
      // Record the goal completion/claim
      const { error: claimError } = await supabase
        .from('user_goals')
        .insert([{
          user_id,
          goal_id,
          completed: true,
          completed_at: new Date().toISOString()
        }]);

      if (claimError) {
        console.error('Goal claim error:', claimError);
        return res.status(400).json({ error: `Failed to claim goal: ${claimError.message}` });
      }

      const tokensToAward = goal.associated_tokens;
      
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

      // Award tokens to base purse (earned tokens go to base purse)
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          base_purse: wallet.base_purse + tokensToAward
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Token award error:', updateError);
        return res.status(400).json({ error: `Failed to award tokens: ${updateError.message}` });
      }
    }

    // Return success with goal and awarded tokens info
    res.json({ 
      success: true, 
      goal_id, 
      completed, 
      tokens_awarded: completed ? goal.associated_tokens : 0,
      message: completed ? `Goal claimed! Awarded ${goal.associated_tokens} tokens to your Base Purse.` : 'Goal status updated.'
    });
  } catch (error: any) {
    console.error('Error completing goal:', error);
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

export default router;
