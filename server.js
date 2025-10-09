import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';


dotenv.config();

// --- SQL SETUP SCRIPT ---
// You MUST run this in your MySQL database (e.g., in phpMyAdmin)
// to create all the necessary tables for the application to work.
/*
-- =================================================================
-- WMS DATABASE SETUP SCRIPT V3
-- =================================================================
-- Drop old tables in reverse order of dependency to avoid foreign key errors.
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `shipment_custom_data`;
DROP TABLE IF EXISTS `shipments`;
DROP TABLE IF EXISTS `racks`;
DROP TABLE IF EXISTS `charge_settings`;
DROP TABLE IF EXISTS `app_settings`;
DROP TABLE IF EXISTS `invitations`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `custom_fields`;

--
-- Table structure for `users`
--
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Supervisor','Worker','Billing') NOT NULL,
  `status` enum('Pending','Active') NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Add a default admin user.
-- Login with: username 'admin', password 'admin'
--
INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `status`) VALUES
(1, 'admin', 'admin@wms.com', '$2a$10$f9.if.Hn2fc3r9a2d/T2d.GFDEkS.9O2D.iEIo1Yq6lBS8w332KxS', 'Admin', 'Active');


--
-- Table structure for `invitations`
--
CREATE TABLE `invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `role` enum('Admin','Supervisor','Worker','Billing') NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `charge_settings`
--
CREATE TABLE `charge_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `rate` decimal(10,3) NOT NULL,
  `unit` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Add some default billing charges.
--
INSERT INTO `charge_settings` (`id`, `name`, `rate`, `unit`) VALUES
(1, 'Storage', 10.000, 'per day'),
(2, 'Handling', 50.000, 'flat fee'),
(3, 'Labor', 25.000, 'per hour'),
(4, 'Transportation', 100.000, 'flat fee');

--
-- Table structure for table `app_settings`
--
CREATE TABLE `app_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Add default app settings
--
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
('companyName', 'Qgo WMS Pro'),
('theme', 'system'),
('primaryColor', 'blue');

--
-- Table structure for table `racks`
--
CREATE TABLE `racks` (
  `id` varchar(255) NOT NULL,
  `rackLine` varchar(255) NOT NULL,
  `slot` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Free',
  `capacity` int(11) NOT NULL DEFAULT 1,
  `currentLoad` int(11) NOT NULL DEFAULT 0,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `shipments`
--
CREATE TABLE `shipments` (
  `id` varchar(255) NOT NULL,
  `shipper` varchar(255) NOT NULL,
  `consignee` varchar(255) NOT NULL,
  `weight` decimal(10,2) NOT NULL,
  `pieces` int(11) NOT NULL,
  `arrivalDate` datetime NOT NULL,
  `releaseDate` datetime DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `rackId` varchar(255) DEFAULT NULL,
  `invoiceId` int(11) DEFAULT NULL,
  `commodity` varchar(255) DEFAULT NULL,
  `dimensions` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `expectedDate` date DEFAULT NULL,
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `invoices`
--
CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipmentId` varchar(255) NOT NULL,
  `releaseDate` datetime NOT NULL,
  `chargeDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`chargeDetails`)),
  `totalAmount` decimal(10,3) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'KWD',
  PRIMARY KEY (`id`),
  KEY `shipmentId_idx` (`shipmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for `custom_fields`
--
CREATE TABLE `custom_fields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `label` varchar(255) NOT NULL,
  `type` enum('Text','Number','Date') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for `shipment_custom_data`
--
CREATE TABLE `shipment_custom_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipmentId` varchar(255) NOT NULL,
  `fieldId` int(11) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shipment_field_unique` (`shipmentId`,`fieldId`),
  KEY `shipmentId_idx` (`shipmentId`),
  KEY `fieldId_idx` (`fieldId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

*/


const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Database connection pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware for authenticating JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Middleware for checking user roles
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the required role.' });
        }
        next();
    };
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // New users are created with 'Worker' role and 'Pending' status by default
        await db.execute(
            'INSERT INTO users (username, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 'Worker', 'Pending']
        );
        res.status(201).json({ message: 'Registration successful! Your account is pending approval from an administrator.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/auth/invite', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) {
        return res.status(400).json({ message: 'Email and role are required.' });
    }
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7); // Token valid for 7 days

        await db.execute(
            'INSERT INTO invitations (email, role, token, expires_at) VALUES (?, ?, ?, ?)',
            [email, role, token, expires_at]
        );
        // Use an environment variable for the frontend URL, with a fallback for local development
        const registrationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${token}`;
        res.status(201).json({ message: 'Invitation sent successfully.', registrationLink });
    } catch (error) {
        console.error('Invitation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/auth/validate-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const [rows] = await db.execute('SELECT * FROM invitations WHERE token = ? AND expires_at > NOW()', [token]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Invalid or expired token.' });
        }
        const { email, role } = rows[0];
        res.json({ email, role });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/register-invited', async (req, res) => {
    const { username, password, token } = req.body;
    if (!username || !password || !token) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [invites] = await connection.execute('SELECT * FROM invitations WHERE token = ? AND expires_at > NOW() FOR UPDATE', [token]);
        if (invites.length === 0) {
            throw new Error('Invalid or expired token.');
        }
        const { email, role } = invites[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.execute(
            'INSERT INTO users (username, password, email, role, status) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, email, role, 'Active']
        );
        await connection.execute('DELETE FROM invitations WHERE token = ?', [token]);

        await connection.commit();
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username or email already exists.' });
        }
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});


app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const user = rows[0];
        if (user.status !== 'Active') {
            return res.status(403).json({ message: 'Account is not active or is pending approval.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role, status: user.status } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// --- USER MANAGEMENT ROUTES (ADMIN ONLY) ---
app.get('/api/users', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, username, email, role, status FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

app.post('/api/users/:id/approve', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const [result] = await db.execute('UPDATE users SET status = "Active" WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found."});
        }
        res.json({ message: 'User approved successfully.' });
    } catch (error) {
        console.error("Error approving user:", error);
        res.status(500).json({ message: 'Failed to approve user' });
    }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        // Prevent admin from deleting themselves
        if (req.user.id == req.params.id) {
            return res.status(400).json({ message: "You cannot delete your own account."});
        }
        await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});


// --- DATA ROUTES ---

app.get('/api/shipments', authenticateToken, async (req, res) => {
    try {
        const [shipments] = await db.execute('SELECT * FROM shipments ORDER BY arrivalDate DESC');

        if (shipments.length === 0) {
            return res.json([]);
        }

        // Get all shipment IDs
        const shipmentIds = shipments.map(s => s.id);

        // Fetch all custom data for those shipments in a single query
        const [customDataRows] = await db.execute(
            `SELECT scd.shipmentId, cf.label, scd.value 
             FROM shipment_custom_data scd
             JOIN custom_fields cf ON scd.fieldId = cf.id
             WHERE scd.shipmentId IN (?)`, [shipmentIds]
        );

        // Group custom data by shipmentId for efficient lookup
        const customDataMap = customDataRows.reduce((map, row) => {
            if (!map[row.shipmentId]) {
                map[row.shipmentId] = {};
            }
            map[row.shipmentId][row.label] = row.value;
            return map;
        }, {});
        
        // Map the custom data back to the shipments
        const shipmentsWithCustomFields = shipments.map(shipment => {
            return {
                ...shipment,
                // Make sure to parse the JSON fields back if they are stored as strings
                customFields: customDataMap[shipment.id] || {}
            };
        });

        res.json(shipmentsWithCustomFields);
    } catch (error) {
        console.error("Error fetching shipments:", error);
        res.status(500).json({ message: 'Failed to fetch shipments' });
    }
});

app.post('/api/shipments', authenticateToken, authorizeRoles('Admin', 'Worker'), async (req, res) => {
    const { shipper, consignee, weight, pieces, commodity, dimensions, notes, expectedDate, customFields } = req.body;
    const newId = `SHP-${Date.now()}`;
    const newShipment = {
        id: newId, shipper, consignee, commodity, dimensions, notes,
        weight: parseFloat(weight), pieces: parseInt(pieces),
        arrivalDate: new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        status: 'Intake'
    };
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute(
            'INSERT INTO shipments (id, shipper, consignee, weight, pieces, arrivalDate, status, commodity, dimensions, notes, expectedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newShipment.id, newShipment.shipper, newShipment.consignee, newShipment.weight, newShipment.pieces, newShipment.arrivalDate, newShipment.status, newShipment.commodity, newShipment.dimensions, newShipment.notes, newShipment.expectedDate]
        );

        if (customFields && Object.keys(customFields).length > 0) {
            for (const [fieldId, value] of Object.entries(customFields)) {
                if(value) { // Only insert if value is not empty
                    await connection.execute(
                        'INSERT INTO shipment_custom_data (shipmentId, fieldId, value) VALUES (?, ?, ?)',
                        [newId, fieldId, value]
                    );
                }
            }
        }
        await connection.commit();
        res.status(201).json(newShipment);
    } catch (error) {
        await connection.rollback();
        console.error("Error creating shipment:", error);
        res.status(500).json({ message: 'Failed to create shipment' });
    } finally {
        connection.release();
    }
});

app.post('/api/shipments/:id/assign', authenticateToken, authorizeRoles('Admin', 'Supervisor', 'Worker'), async (req, res) => {
    const { shipmentId, rackId } = { shipmentId: req.params.id, ...req.body };
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [racks] = await connection.execute('SELECT * FROM racks WHERE id = ? FOR UPDATE', [rackId]);
        if (racks.length === 0) throw new Error('Rack not found.');

        const rack = racks[0];
        if (rack.currentLoad >= rack.capacity) throw new Error('Rack is full.');

        await connection.execute('UPDATE shipments SET status = "Stored", rackId = ? WHERE id = ?', [rackId, shipmentId]);
        
        const newLoad = rack.currentLoad + 1;
        const newStatus = newLoad === rack.capacity ? 'Full' : 'Partial';
        await connection.execute('UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?', [newLoad, newStatus, rackId]);

        await connection.commit();
        res.json({ message: `Shipment ${shipmentId} assigned to ${rackId}` });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/shipments/:id/release', authenticateToken, authorizeRoles('Admin', 'Supervisor', 'Billing'), async (req, res) => {
    const { id } = req.params;
    const { charges } = req.body; // Expecting [{chargeId: 1, quantity: 5}]
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [shipments] = await connection.execute('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [id]);
        if (shipments.length === 0) throw new Error('Shipment not found.');
        const shipment = shipments[0];
        if (shipment.status !== 'Stored') throw new Error('Shipment is not in stored status.');
        
        const [chargeSettings] = await connection.execute('SELECT * FROM charge_settings');
        const settingsMap = new Map(chargeSettings.map(s => [s.id, s]));

        const chargeDetails = charges.map(charge => {
            const setting = settingsMap.get(charge.chargeId);
            if (!setting) throw new Error(`Invalid charge ID: ${charge.chargeId}`);
            return { name: setting.name, rate: setting.rate, quantity: charge.quantity, unit: setting.unit, total: setting.rate * charge.quantity };
        });
        
        const totalAmount = chargeDetails.reduce((sum, item) => sum + item.total, 0);

        const [invoiceResult] = await connection.execute(
            'INSERT INTO invoices (shipmentId, releaseDate, chargeDetails, totalAmount, currency) VALUES (?, ?, ?, ?, ?)',
            [id, new Date(), JSON.stringify(chargeDetails), totalAmount, 'KWD']
        );
        const invoiceId = invoiceResult.insertId;

        await connection.execute('UPDATE shipments SET status = "Released", releaseDate = NOW(), invoiceId = ? WHERE id = ?', [invoiceId, id]);

        if (shipment.rackId) {
            const [racks] = await connection.execute('SELECT * FROM racks WHERE id = ? FOR UPDATE', [shipment.rackId]);
            if (racks.length > 0) {
                const rack = racks[0];
                const newLoad = Math.max(0, rack.currentLoad - 1);
                const newStatus = newLoad === 0 ? 'Free' : 'Partial';
                await connection.execute('UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?', [newLoad, newStatus, rack.id]);
            }
        }
        
        await connection.commit();
        res.json({ message: `Shipment ${id} released. Invoice ${invoiceId} created.` });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
});


app.get('/api/racks', authenticateToken, async (req, res) => {
    try {
        const [racks] = await db.execute('SELECT * FROM racks');
        res.json(racks);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch racks' });
    }
});

app.post('/api/racks', authenticateToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
    const { rackLine, slot, capacity } = req.body;
    const newId = `${rackLine}-${slot}`;
    try {
        await db.execute(
            'INSERT INTO racks (id, rackLine, slot, capacity, currentLoad, status) VALUES (?, ?, ?, ?, 0, "Free")',
            [newId, rackLine, slot, capacity]
        );
        res.status(201).json({ id: newId, ...req.body });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ message: `Rack with ID ${newId} already exists.` });
        }
        res.status(500).json({ message: 'Failed to create rack' });
    }
});

app.get('/api/invoices/:shipmentId', authenticateToken, async (req, res) => {
    try {
        const [invoices] = await db.execute('SELECT * FROM invoices WHERE shipmentId = ? ORDER BY releaseDate DESC LIMIT 1', [req.params.shipmentId]);
        if(invoices.length > 0) {
            const invoice = invoices[0];
            invoice.chargeDetails = JSON.parse(invoice.chargeDetails);
            res.json(invoice);
        } else {
            res.status(404).json({ message: 'Invoice not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoice' });
    }
});

// --- SETTINGS ROUTES ---

app.get('/api/settings/charges', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    try {
        const [settings] = await db.execute('SELECT * FROM charge_settings');
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch charge settings' });
    }
});

app.post('/api/settings/charges', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const settings = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const setting of settings) {
            await connection.execute('UPDATE charge_settings SET rate = ? WHERE id = ?', [setting.rate, setting.id]);
        }
        await connection.commit();
        res.json({ message: 'Settings updated' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: 'Failed to update settings' });
    } finally {
        connection.release();
    }
});

app.get('/api/settings/app', authenticateToken, async (req, res) => {
    try {
        const [settingsRows] = await db.execute('SELECT * FROM app_settings');
        const settings = settingsRows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (error) {
        console.error('Failed to fetch app settings:', error);
        res.status(500).json({ message: 'Failed to fetch app settings' });
    }
});

app.post('/api/settings/app', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
    const settings = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const [key, value] of Object.entries(settings)) {
            await connection.execute(
                'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }
        await connection.commit();
        res.json({ message: 'Application settings updated' });
    } catch (error) {
        await connection.rollback();
        console.error('Failed to update app settings:', error);
        res.status(500).json({ message: 'Failed to update application settings' });
    } finally {
        connection.release();
    }
});

// --- CUSTOM FIELDS ROUTES ---
app.get('/api/settings/custom-fields', authenticateToken, authorizeRoles('Admin'), async(req, res) => {
    try {
        const [fields] = await db.execute('SELECT * FROM custom_fields');
        res.json(fields);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch custom fields.' });
    }
});
app.post('/api/settings/custom-fields', authenticateToken, authorizeRoles('Admin'), async(req, res) => {
    const { label, type } = req.body;
    try {
        const [result] = await db.execute('INSERT INTO custom_fields (label, type) VALUES (?, ?)', [label, type]);
        res.status(201).json({ id: result.insertId, label, type });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create custom field.' });
    }
});


// --- REPORTS ROUTES ---
app.get('/api/reports/inventory', authenticateToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const [results] = await db.execute(`
            SELECT id, shipper, consignee, rackId, arrivalDate, 
                   DATEDIFF(NOW(), arrivalDate) as daysInStorage
            FROM shipments 
            WHERE status = 'Stored'
        `);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate inventory report.' });
    }
});

app.get('/api/reports/turnover', authenticateToken, authorizeRoles('Admin', 'Supervisor'), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const [inbound] = await db.execute(
            'SELECT DATE(arrivalDate) as date, COUNT(*) as count FROM shipments WHERE arrivalDate BETWEEN ? AND ? GROUP BY DATE(arrivalDate) ORDER BY date',
            [startDate, endDate]
        );
        const [outbound] = await db.execute(
            'SELECT DATE(releaseDate) as date, COUNT(*) as count FROM shipments WHERE releaseDate BETWEEN ? AND ? GROUP BY DATE(releaseDate) ORDER BY date',
            [startDate, endDate]
        );
        res.json({ inbound, outbound });
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate turnover report.' });
    }
});


// Welcome Route - Now at /api
app.get('/api', (req, res) => {
  res.json({ message: "Welcome to the Gemini WMS API. Server is running and accessible." });
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});