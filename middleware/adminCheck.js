// middleware/adminCheck.js
const knex = require('../db/knex');
const { decryptId } = require('../models/encryption.js');

const adminCheck = async (req, res, next) => {
    try {
        const decryptedUserId = decryptId(req.user.id);
        const adminCheck = await knex('admins')
            .where('user_id', decryptedUserId)
            .whereNull('deleted_at')
            .first();

        if (!adminCheck) {
            return res.status(403).json({
                status: 403,
                message: 'Access denied. Admin privileges required.',
                });
        }

        req.admin = adminCheck;
        next();
    } catch (err) {
        console.error('Admin check error:', err);
        
        if (err.message && err.message.includes('decrypt')) {
            return res.status(401).json({
                status: 401,
                message: 'Invalid authentication token',
                data: null
            });
        }

        return res.status(500).json({
            status: 500,
            message: 'Internal server error',
            data: null
        });
    }
};

module.exports = adminCheck;