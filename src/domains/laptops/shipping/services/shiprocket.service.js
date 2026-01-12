import axios from 'axios';
import config from '../../../../shared/infrastructure/config/env.js';
import { AppError } from '../../../../shared/common/utils/errorHandler.js';

class ShiprocketService {
    constructor() {
        this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null;
    }

    /**
     * Authenticate with Shiprocket and get JWT token
     */
    async login() {
        // Return existing valid token if available
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                email: config.shiprocket.email,
                password: config.shiprocket.password
            });

            this.token = response.data.token;
            // Set token expiry to slightly less than actual expiry (usually 10 days, setting to 9 days)
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 9);
            this.tokenExpiry = expiry;

            return this.token;
        } catch (error) {
            console.error('Shiprocket Login Error:', error.response?.data || error.message);
            throw new AppError('Failed to authenticate with Shiprocket', 503);
        }
    }

    /**
     * Create a Quick Order in Shiprocket
     * @param {Object} orderDetails 
     */
    async createOrder(orderDetails) {
        const token = await this.login();

        try {
            const response = await axios.post(
                `${this.baseUrl}/orders/create/adhoc`,
                orderDetails,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Shiprocket Create Order Error:', error.response?.data || error.message);
            // Construct a readable error message from Shiprocket response
            let msg = 'Failed to create shipment';
            if (error.response?.data?.message) {
                msg = error.response.data.message;
            } else if (error.response?.data?.errors) {
                msg = JSON.stringify(error.response.data.errors);
            }
            throw new AppError(`Shiprocket Error: ${msg}`, 400);
        }
    }

    /**
     * Generate AWB for a shipment
     * @param {String} shipmentId 
     * @param {String} [courierId] - Optional specific courier ID
     */
    async generateAWB(shipmentId, courierId = null) {
        const token = await this.login();

        try {
            const payload = { shipment_id: shipmentId };
            if (courierId) {
                payload.courier_id = courierId;
            }

            const response = await axios.post(
                `${this.baseUrl}/courier/assign/awb`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Shiprocket AWB Error:', error.response?.data || error.message);
            // Often AWB acts up if not serviceable, etc.
            throw new AppError('Failed to generate AWB', 400);
        }
    }
    /**
     * Check Serviceability and Calculate Rates
     * @param {Object} params - { pickup_postcode, delivery_postcode, weight, declared_value, cod }
     */
    async checkServiceability({ pickup_postcode, delivery_postcode, weight, declared_value, cod = 0 }) {
        const token = await this.login();

        try {
            const params = new URLSearchParams({
                pickup_postcode,
                delivery_postcode,
                weight,
                cod,
                declared_value,
                rate_calculator: 1,
                blocked: 1,
                is_return: 0,
                is_web: 1,
                is_dg: 0,
                only_qc_couriers: 0
            });

            const response = await axios.get(
                `${this.baseUrl}/courier/serviceability?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
            throw new AppError('Failed to fetch shipping rates', 400);
        }
    }
}

export const shiprocketService = new ShiprocketService();
