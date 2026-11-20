const crypto = require('crypto');
const { promisify } = require('util');
const usersModel = require('../models/usersModel');

const scrypt = promisify(crypto.scrypt);

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    return scrypt(password, salt, 64).then(derived => `${salt}:${derived.toString('hex')}`);
}

async function verifyPassword(password, stored) {
    const parts = String(stored || '').split(':');

    if (parts.length !== 2) {
        return false;
    }

    const [salt, expected] = parts;

    if (!/^[a-f0-9]{128}$/i.test(expected)) {
        return false;
    }

    const derived = await scrypt(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, 'hex');

    return derived.length === expectedBuffer.length &&
        crypto.timingSafeEqual(derived, expectedBuffer);
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function tokenExpiry() {
    const hours = Number(process.env.TOKEN_TTL_HOURS) || 24;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function bearerToken(req) {
    const header = req.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match ? match[1].trim() : '';
}

async function authenticate(req, res, next) {
    const token = bearerToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication is required.'
        });
    }

    try {
        const record = await usersModel.findToken(hashToken(token));

        if (!record || !record.is_active || new Date(record.expires_at) <= new Date()) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please sign in again.'
            });
        }

        req.user = {
            user_id: record.user_id,
            username: record.username,
            role: record.role
        };

        return next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Could not verify your session.'
        });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action.'
            });
        }

        return next();
    };
}

module.exports = {
    hashPassword,
    verifyPassword,
    hashToken,
    generateToken,
    tokenExpiry,
    bearerToken,
    authenticate,
    requireRole
};
