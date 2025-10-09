import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-env';

// Middleware
app.use(cors());
app.use(express.json());

// --- Database Setup ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'wms_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/*
-- =================================================================
-- SQL SCHEMA: Drop old tables and execute this in phpMyAdmin.
-- =================================================================

-- Create Database:
-- CREATE DATABASE IF NOT EXISTS wms_db;
-- USE wms_db;

--
-- Table structure for `users`
--
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Supervisor','Worker','Billing') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add a default admin user
-- IMPORTANT: The password is 'admin'. Change it after first login.
INSERT INTO `users` (`id`, `username`, `password`, `role`) VALUES
(1, 'admin', '$2a$10$f9.if.Hn2fc3r9a2d/T2d.GFDEkS.9O2D.iEIo1Yq6lBS8w332KxS', 'Admin');

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

-- Add some default charges
INSERT INTO `charge_settings` (`id`, `name`, `rate`, `unit`) VALUES
(1, 'Storage', 10.000, 'per day'),
(2, 'Handling', 50.000, 'flat fee'),
(3, 'Labor', 25.000, 'per hour'),
(4, 'Transportation', 100.000, 'flat fee');

--
-- Table structure for table `invoices`
--
CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shipmentId` varchar(255) NOT NULL,
  `releaseDate` datetime NOT NULL,
  `chargeDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `totalAmount` decimal(10,3) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'KWD',
  PRIMARY KEY (`id`),
  KEY `shipmentId` (`shipmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


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
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/


// --- AUTHENTICATION MIDDLEWARE ---
const authMiddleware = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided, authorization denied.' });
        }

        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; // Adds user payload (id, username, role) to request object

            if (roles.length > 0 && !roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Forbidden: You do not have the required role.' });
            }

            next();
        } catch (error) {
            res.status(401).json({ error: 'Token is not valid.' });
        }
    };
};


// --- API ROUTES ---

// Helper to format shipment data from DB
function formatShipments(shipments) {
    return shipments.map(s => ({
        id: s.id,
        shipper: s.shipper,
        consignee: s.consignee,
        weight: parseFloat(s.weight),
        pieces: s.pieces,
        arrivalDate: s.arrivalDate,
        releaseDate: s.releaseDate || undefined,
        status: s.status,
        rackId: s.rackId || undefined,
        invoiceId: s.invoiceId || undefined,
    }));
};

// Welcome route
app.get('/', (req, res) => {
    res.status(200).json({ message: "Welcome to the Gemini WMS API. Server is running." });
});

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const payload = { id: user.id, username: user.username, role: user.role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: payload });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- User Management Routes (Admin only) ---
app.get('/api/users', authMiddleware(['Admin']), async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, username, role FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', authMiddleware(['Admin']), async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
        res.status(201).json({ id: result.insertId, username, role });
    } catch (error) {
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// --- Settings Routes (Admin only) ---
app.get('/api/settings/charges', authMiddleware(['Admin']), async (req, res) => {
    try {
        const [charges] = await pool.query('SELECT * FROM charge_settings');
        res.json(charges);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch charge settings' });
    }
});
app.post('/api/settings/charges', authMiddleware(['Admin']), async (req, res) => {
    const { name, rate, unit } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO charge_settings (name, rate, unit) VALUES (?, ?, ?)', [name, rate, unit]);
        res.status(201).json({ id: result.insertId, name, rate, unit });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add charge setting' });
    }
});
app.delete('/api/settings/charges/:id', authMiddleware(['Admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM charge_settings WHERE id = ?', [req.params.id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete charge setting' });
    }
});


// --- WMS Data Routes (Protected) ---
app.get('/api/shipments', authMiddleware(), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM shipments ORDER BY arrivalDate DESC');
        res.json(formatShipments(rows));
    } catch (error) { res.status(500).json({ error: 'Database query failed' }); }
});

app.get('/api/racks', authMiddleware(), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM racks');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Database query failed' }); }
});

app.get('/api/invoices/:shipmentId', authMiddleware(), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM invoices WHERE shipmentId = ? ORDER BY releaseDate DESC LIMIT 1', [req.params.shipmentId]);
        if(rows.length > 0) {
            const invoice = rows[0];
            // Parse the JSON string before sending
            invoice.chargeDetails = JSON.parse(invoice.chargeDetails);
            res.json(invoice);
        } else {
            res.status(404).json({error: "Invoice not found"});
        }
    } catch (error) { res.status(500).json({ error: 'Database query failed for invoice' }); }
});


app.post('/api/racks', authMiddleware(['Admin', 'Supervisor']), async (req, res) => {
    const { rackLine, slot, capacity } = req.body;
    if (!rackLine || !slot || !capacity) return res.status(400).json({ error: 'Missing required fields' });
    const id = `${rackLine}-${slot}`;
    try {
        const newRack = { id, rackLine, slot, capacity: parseInt(capacity, 10), currentLoad: 0, status: 'Free' };
        await pool.query('INSERT INTO racks SET ?', newRack);
        res.status(201).json(newRack);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A rack with this Line and Slot already exists.' });
        res.status(500).json({ error: 'Database insert failed' });
    }
});

app.post('/api/shipments', authMiddleware(['Admin', 'Worker']), async (req, res) => {
    const { shipper, consignee, weight, pieces } = req.body;
    if (!shipper || !consignee || !weight || !pieces) return res.status(400).json({ error: 'Missing required fields' });
    try {
        const [countResult] = await pool.query('SELECT COUNT(*) as count FROM shipments');
        const count = countResult[0].count;
        const newId = `SHP-${(count + 1).toString().padStart(4, '0')}`;
        const newShipment = { id: newId, shipper, consignee, weight, pieces, arrivalDate: new Date(), status: 'Intake' };
        await pool.query('INSERT INTO shipments SET ?', newShipment);
        res.status(201).json(newShipment);
    } catch (error) { res.status(500).json({ error: 'Database insert failed' }); }
});

app.put('/api/shipments/assign', authMiddleware(['Admin', 'Worker']), async (req, res) => {
    const { shipmentId, rackId } = req.body;
    if (!shipmentId || !rackId) return res.status(400).json({ error: 'shipmentId and rackId are required' });
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [racks] = await connection.query('SELECT * FROM racks WHERE id = ? FOR UPDATE', [rackId]);
        if (!racks[0]) throw new Error('Rack not found');
        if (racks[0].currentLoad >= racks[0].capacity) throw new Error('Rack is full');
        const [shipments] = await connection.query('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [shipmentId]);
        if (!shipments[0]) throw new Error('Shipment not found');
        if (shipments[0].rackId) throw new Error('Shipment is already assigned to a rack');
        
        await connection.query('UPDATE shipments SET rackId = ?, status = ? WHERE id = ?', [rackId, 'Stored', shipmentId]);
        const newLoad = racks[0].currentLoad + 1;
        const newStatus = newLoad >= racks[0].capacity ? 'Full' : 'Partial';
        await connection.query('UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?', [newLoad, newStatus, rackId]);
        await connection.commit();
        res.status(200).json({ success: true, message: 'Assignment successful' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message || 'Database transaction failed' });
    } finally { connection.release(); }
});

app.put('/api/shipments/release/:id', authMiddleware(['Admin', 'Supervisor', 'Billing']), async (req, res) => {
    const { id } = req.params;
    const { chargeOverrides } = req.body; // e.g. { "Labor": { "rate": 30, "value": 2 } }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [shipments] = await connection.query('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [id]);
        const shipmentToRelease = shipments[0];
        if (!shipmentToRelease) throw new Error('Shipment not found');

        const [chargeSettings] = await connection.query('SELECT * FROM charge_settings');
        const arrival = new Date(shipmentToRelease.arrivalDate);
        const releaseDate = new Date();
        const durationDays = Math.ceil((releaseDate.getTime() - arrival.getTime()) / (1000 * 3600 * 24));
        
        let totalAmount = 0;
        const chargeDetails = chargeSettings.map(setting => {
            let quantity = 1;
            let rate = setting.rate;
            if(chargeOverrides && chargeOverrides[setting.name]) {
                rate = chargeOverrides[setting.name].rate ?? rate;
            }

            if(setting.unit === 'per day') {
                quantity = durationDays;
            }
             if(chargeOverrides && chargeOverrides[setting.name]) {
                quantity = chargeOverrides[setting.name].value ?? quantity;
            }

            const lineTotal = rate * quantity;
            totalAmount += lineTotal;

            return { name: setting.name, rate, unit: setting.unit, quantity, total: lineTotal };
        });

        const invoice = {
            shipmentId: id,
            releaseDate,
            chargeDetails: JSON.stringify(chargeDetails),
            totalAmount,
            currency: 'KWD'
        };

        const [invoiceResult] = await connection.query('INSERT INTO invoices SET ?', invoice);
        
        await connection.query('UPDATE shipments SET status = ?, releaseDate = ?, rackId = NULL, invoiceId = ? WHERE id = ?', ['Released', releaseDate, invoiceResult.insertId, id]);
        
        if (shipmentToRelease.rackId) {
            const [racks] = await connection.query('SELECT * FROM racks WHERE id = ? FOR UPDATE', [shipmentToRelease.rackId]);
            if (racks[0]) {
                const newLoad = Math.max(0, racks[0].currentLoad - 1);
                const newStatus = newLoad === 0 ? 'Free' : 'Partial';
                await connection.query('UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?', [newLoad, newStatus, shipmentToRelease.rackId]);
            }
        }
        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Shipment released', invoiceId: invoiceResult.insertId });

    } catch (error) {
        await connection.rollback();
        console.error("Failed to release shipment:", error);
        res.status(500).json({ error: error.message || 'Database transaction failed' });
    } finally {
        connection.release();
    }
});

// Catch-all 404 handler
app.use((req, res, next) => {
    res.status(404).json({ error: "Not Found" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
