const usersModel = require('../models/usersModel');
const {
    verifyPassword,
    hashToken,
    generateToken,
    tokenExpiry,
    bearerToken
} = require('../middleware/auth');

function publicUser(user) {
    return {
        user_id: user.user_id,
        username: user.username,
        role: user.role
    };
}

async function login(req, res) {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    try {
        const user = await usersModel.findByUsername(username);

        if (!user || !user.is_active || !await verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const token = generateToken();
        const expiresAt = tokenExpiry();

        await usersModel.deleteExpiredTokens();
        await usersModel.createToken(user.user_id, hashToken(token), expiresAt);

        return res.status(200).json({
            success: true,
            data: {
                token,
                expires_at: expiresAt,
                user: publicUser(user)
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Could not sign in.'
        });
    }
}

async function logout(req, res) {
    const token = bearerToken(req);

    if (token) {
        await usersModel.deleteToken(hashToken(token));
    }

    return res.status(200).json({ success: true, message: 'Signed out successfully.' });
}

async function me(req, res) {
    return res.status(200).json({ success: true, data: req.user });
}

module.exports = {
    login,
    logout,
    me
};
