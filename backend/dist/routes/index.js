"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabase_1 = __importDefault(require("../db/supabase"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET;
// Signup
router.post('/signup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const hash = yield bcryptjs_1.default.hash(password, 10);
    const { data, error } = yield supabase_1.default
        .from('users')
        .insert([{ email, password_hash: hash }])
        .select();
    if (error)
        return res.status(400).json({ error });
    const user = data === null || data === void 0 ? void 0 : data[0];
    yield supabase_1.default.from('wallets').insert([{ user_id: user.id }]);
    const token = jsonwebtoken_1.default.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
}));
// Login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const { data, error } = yield supabase_1.default
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    if (error || !data)
        return res.status(400).json({ error: 'User not found' });
    const valid = yield bcryptjs_1.default.compare(password, data.password_hash);
    if (!valid)
        return res.status(401).json({ error: 'Invalid password' });
    const token = jsonwebtoken_1.default.sign({ id: data.id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
}));
// Add default goal (no auth)
router.post('/goals/default', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, associated_tokens, target_time } = req.body;
    const { data, error } = yield supabase_1.default.from('goals').insert([{
            name, description, associated_tokens, target_time, is_default: true
        }]).select();
    if (error)
        return res.status(400).json({ error });
    res.json(data === null || data === void 0 ? void 0 : data[0]);
}));
// Add custom goal
router.post('/goals/custom', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, associated_tokens, target_time } = req.body;
    const { data, error } = yield supabase_1.default.from('goals').insert([{
            name,
            description,
            associated_tokens,
            target_time,
            is_default: false,
            user_id: req.user.id
        }]).select();
    if (error)
        return res.status(400).json({ error });
    res.json(data === null || data === void 0 ? void 0 : data[0]);
}));
// Get visible goals
router.get('/goals', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user_id = req.user.id;
    const { data, error } = yield supabase_1.default
        .from('goals')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${user_id}`);
    if (error)
        return res.status(400).json({ error });
    res.json(data);
}));
// Get all default goals
router.get('/goals/default', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, error } = yield supabase_1.default
        .from('goals')
        .select('*')
        .eq('is_default', true);
    if (error)
        return res.status(400).json({ error });
    res.json(data);
}));
// Seed default goals (for development)
router.post('/goals/seed', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const defaultGoals = [
        {
            name: '10 Minutes Meditation',
            description: 'Practice mindfulness meditation for 10 minutes',
            associated_tokens: 20,
            target_time: '10 minutes',
            is_default: true
        },
        {
            name: 'Drink 2L Water',
            description: 'Stay hydrated by drinking 2 liters of water throughout the day',
            associated_tokens: 15,
            target_time: 'Throughout the day',
            is_default: true
        },
        {
            name: 'Read 20 Pages',
            description: 'Expand your knowledge by reading 20 pages of a book',
            associated_tokens: 25,
            target_time: '30 minutes',
            is_default: true
        },
        {
            name: 'Walk 5000 Steps',
            description: 'Stay active by walking at least 5000 steps',
            associated_tokens: 18,
            target_time: '45 minutes',
            is_default: true
        },
        {
            name: 'Practice Gratitude',
            description: 'Write down 3 things you are grateful for today',
            associated_tokens: 12,
            target_time: '5 minutes',
            is_default: true
        }
    ];
    const { data, error } = yield supabase_1.default
        .from('goals')
        .insert(defaultGoals)
        .select();
    if (error)
        return res.status(400).json({ error });
    res.json({ message: 'Default goals seeded successfully', goals: data });
}));
// Get user's wallet
router.get('/wallet', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { data, error } = yield supabase_1.default
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error)
        return res.status(400).json({ error });
    res.json(data);
}));
// Complete goal
router.post('/goals/complete', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { goal_id, completed } = req.body;
    const { data, error } = yield supabase_1.default.from('user_goals').insert([{
            user_id: req.user.id,
            goal_id,
            completed,
            completed_at: completed ? new Date().toISOString() : null
        }]).select();
    if (error)
        return res.status(400).json({ error });
    res.json(data === null || data === void 0 ? void 0 : data[0]);
}));
// Transfer tokens
router.post('/wallet/transfer', auth_1.authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { to_user_id, to_purse, from_purse, amount, type, charity_info } = req.body;
    const sender_id = req.user.id;
    const { data: wallets, error: walletErr } = yield supabase_1.default
        .from('wallets')
        .select('*')
        .eq('user_id', sender_id)
        .single();
    if (walletErr || !wallets)
        return res.status(400).json({ error: walletErr });
    if (wallets[`${from_purse}_purse`] < amount)
        return res.status(400).json({ error: 'Insufficient funds' });
    yield supabase_1.default
        .from('wallets')
        .update({ [`${from_purse}_purse`]: wallets[`${from_purse}_purse`] - amount })
        .eq('user_id', sender_id);
    if (type === 'peer') {
        const { data: receiverWallet, error: recvErr } = yield supabase_1.default
            .from('wallets')
            .select('*')
            .eq('user_id', to_user_id)
            .single();
        if (recvErr || !receiverWallet)
            return res.status(400).json({ error: 'Receiver not found' });
        yield supabase_1.default
            .from('wallets')
            .update({
            [`${to_purse}_purse`]: receiverWallet[`${to_purse}_purse`] + amount
        })
            .eq('user_id', to_user_id);
    }
    else if (type === 'self-transfer') {
        yield supabase_1.default
            .from('wallets')
            .update({
            [`${to_purse}_purse`]: wallets[`${to_purse}_purse`] + amount
        })
            .eq('user_id', sender_id);
    }
    yield supabase_1.default.from('transactions').insert([{
            sender_id,
            receiver_id: to_user_id || null,
            from_purse,
            to_purse,
            amount,
            type,
            charity_info
        }]);
    res.json({ message: 'Transfer successful' });
}));
exports.default = router;
