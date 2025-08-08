const { supabaseAdmin } = require('../supabase/client');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const whatsappService = require('./whatsapp');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        this.jwtExpiry = '7d'; // 7 days
    }

    /**
     * Generate OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Send OTP via WhatsApp
     */
    async sendWhatsAppOTP(phone, otp) {
        try {
            const result = await whatsappService.sendOTP(phone, otp);
            return result;
        } catch (error) {
            console.error('WhatsApp OTP error:', error);
            return {
                success: false,
                message: 'Failed to send WhatsApp OTP'
            };
        }
    }

    /**
     * Store OTP in database
     */
    async storeOTP(phone, otp) {
        try {
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

            const { error } = await supabaseAdmin
                .from('otp_codes')
                .upsert({
                    phone: phone,
                    otp: otp,
                    expires_at: expiresAt,
                    created_at: new Date()
                });

            if (error) {
                throw new Error('Failed to store OTP');
            }

            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Verify OTP from database
     */
    async verifyStoredOTP(phone, otp) {
        try {
            const { data, error } = await supabaseAdmin
                .from('otp_codes')
                .select('*')
                .eq('phone', phone)
                .eq('otp', otp)
                .gt('expires_at', new Date())
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                return { success: false, message: 'Invalid or expired OTP' };
            }

            // Delete the used OTP
            await supabaseAdmin
                .from('otp_codes')
                .delete()
                .eq('id', data.id);

            return { success: true };
        } catch (error) {
            return { success: false, message: 'OTP verification failed' };
        }
    }

    /**
     * Send OTP to phone number via WhatsApp
     */
    async sendOTP(phone) {
        try {
            const otp = this.generateOTP();
            
            // Store OTP in database
            const storeResult = await this.storeOTP(phone, otp);
            if (!storeResult.success) {
                return storeResult;
            }

            // Send via WhatsApp
            const whatsappResult = await this.sendWhatsAppOTP(phone, otp);
            return whatsappResult;
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Verify OTP and create custom JWT session
     */
    async verifyOTP(phone, token) {
        try {
            // Verify OTP from database
            const verifyResult = await this.verifyStoredOTP(phone, token);
            if (!verifyResult.success) {
                return verifyResult;
            }

            // Check if user exists in our database
            const { data: existingUser, error: userError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('phone', phone)
                .eq('is_deleted', false)
                .single();

            if (userError && userError.code !== 'PGRST116') {
                return {
                    success: false,
                    message: 'Database error'
                };
            }

            let user = existingUser;

            // If user doesn't exist, create new user with custom UUID
            if (!existingUser) {
                const userId = crypto.randomUUID();
                const { data: newUser, error: createError } = await supabaseAdmin
                    .from('users')
                    .insert({
                        id: userId,
                        phone: phone,
                        role: 'influencer' // Default role
                    })
                    .select()
                    .single();

                if (createError) {
                    return {
                        success: false,
                        message: 'Failed to create user profile'
                    };
                }

                user = newUser;

                // Send welcome message
                try {
                    await whatsappService.sendWelcome(phone, 'User');
                } catch (error) {
                    console.error('Failed to send welcome message:', error);
                }
            }

            // Generate custom JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    phone: user.phone,
                    role: user.role
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiry }
            );

            return {
                success: true,
                user: user,
                token: token,
                message: 'Authentication successful'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Verify custom JWT token
     */
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return { success: true, user: decoded };
        } catch (error) {
            return { success: false, message: 'Invalid token' };
        }
    }

    /**
     * Middleware to authenticate requests using custom JWT token
     */
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        // Verify custom JWT token
        const result = this.verifyToken(token);
        if (!result.success) {
            return res.status(403).json({ error: 'Invalid token' });
        }

        req.user = result.user;
        next();
    }

    /**
     * Middleware to check role permissions
     */
    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        };
    }

    /**
     * Generate new JWT token (for refresh)
     */
    generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                phone: user.phone,
                role: user.role
            },
            this.jwtSecret,
            { expiresIn: this.jwtExpiry }
        );
    }

    /**
     * Refresh access token
     */
    async refreshToken(userId) {
        try {
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', userId)
                .eq('is_deleted', false)
                .single();

            if (error || !user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            const token = this.generateToken(user);
            return {
                success: true,
                token: token
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = new AuthService(); 