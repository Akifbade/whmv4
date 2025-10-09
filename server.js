
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

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
-- SQL SCHEMA: Please execute this in your phpMyAdmin to set up the necessary tables.
-- =================================================================

-- Create Database:
-- CREATE DATABASE IF NOT EXISTS wms_db;
-- USE wms_db;

--
-- Table structure for table `racks`
--
CREATE TABLE `racks` (
  `id` varchar(255) NOT NULL,
  `rackLine` varchar(255) NOT NULL,
  `slot` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Free',
  `capacity` int(11) NOT NULL DEFAULT 1,
  `currentLoad` int(11) NOT NULL DEFAULT 0
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
  `storageCharges` decimal(10,2) DEFAULT NULL,
  `handlingCharges` decimal(10,2) DEFAULT NULL,
  `totalCharges` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Add Primary Keys
--
ALTER TABLE `racks`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `shipments`
  ADD PRIMARY KEY (`id`);
*/

// --- API ROUTES ---

// Welcome route for the root URL
app.get('/', (req, res) => {
    res.status(200).json({ message: "Welcome to the Gemini WMS API. Server is running." });
});

// Helper to format shipment data from DB to match frontend type
const formatShipments = (shipments) => {
    return shipments.map(s => {
        const shipment = {
            id: s.id,
            shipper: s.shipper,
            consignee: s.consignee,
            weight: parseFloat(s.weight),
            pieces: s.pieces,
            arrivalDate: s.arrivalDate,
            releaseDate: s.releaseDate || undefined,
            status: s.status,
            rackId: s.rackId || undefined,
        };
        if (s.totalCharges !== null && s.totalCharges !== undefined) {
            shipment.charges = {
                storage: parseFloat(s.storageCharges),
                handling: parseFloat(s.handlingCharges),
                total: parseFloat(s.totalCharges),
            };
        }
        return shipment;
    });
};

// GET all shipments
app.get('/api/shipments', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM shipments ORDER BY arrivalDate DESC');
        res.json(formatShipments(rows));
    } catch (error) {
        console.error("Failed to get shipments:", error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// GET all racks
app.get('/api/racks', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM racks');
        res.json(rows);
    } catch (error) {
        console.error("Failed to get racks:", error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// POST a new rack
app.post('/api/racks', async (req, res) => {
    const { rackLine, slot, capacity } = req.body;
    if (!rackLine || !slot || !capacity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = `${rackLine}-${slot}`;
    try {
        const newRack = {
            id,
            rackLine,
            slot,
            capacity: parseInt(capacity, 10),
            currentLoad: 0,
            status: 'Free',
        };
        await pool.query('INSERT INTO racks SET ?', newRack);
        res.status(201).json(newRack);
    } catch (error) {
        console.error("Failed to add rack:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A rack with this Line and Slot already exists.' });
        }
        res.status(500).json({ error: 'Database insert failed' });
    }
});


// POST a new shipment
app.post('/api/shipments', async (req, res) => {
    const { shipper, consignee, weight, pieces } = req.body;
    if (!shipper || !consignee || !weight || !pieces) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const [countResult] = await pool.query('SELECT COUNT(*) as count FROM shipments');
        const count = countResult[0].count;
        const newId = `SHP-${(count + 1).toString().padStart(3, '0')}`;

        const newShipment = {
            id: newId,
            shipper,
            consignee,
            weight,
            pieces,
            arrivalDate: new Date(),
            status: 'Intake'
        };

        await pool.query('INSERT INTO shipments SET ?', newShipment);
        res.status(201).json(newShipment);
    } catch (error) {
        console.error("Failed to add shipment:", error);
        res.status(500).json({ error: 'Database insert failed' });
    }
});

// PUT assign a shipment to a rack
app.put('/api/shipments/assign', async (req, res) => {
    const { shipmentId, rackId } = req.body;
    if (!shipmentId || !rackId) {
        return res.status(400).json({ error: 'shipmentId and rackId are required' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [racks] = await connection.query('SELECT * FROM racks WHERE id = ? FOR UPDATE', [rackId]);
        const rack = racks[0];

        if (!rack) {
            throw new Error('Rack not found');
        }

        if (rack.currentLoad >= rack.capacity) {
            throw new Error('Rack is full');
        }
        
        const [shipments] = await connection.query('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [shipmentId]);
        const shipment = shipments[0];

        if (!shipment) {
            throw new Error('Shipment not found');
        }
        if (shipment.rackId) {
            throw new Error('Shipment is already assigned to a rack');
        }


        await connection.query('UPDATE shipments SET rackId = ?, status = ? WHERE id = ?', [rackId, 'Stored', shipmentId]);

        const newLoad = rack.currentLoad + 1;
        const newStatus = newLoad >= rack.capacity ? 'Full' : 'Partial';
        await connection.query('UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?', [newLoad, newStatus, rackId]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Assignment successful' });
    } catch (error) {
        await connection.rollback();
        console.error("Failed to assign shipment:", error);
        res.status(500).json({ error: error.message || 'Database transaction failed' });
    } finally {
        connection.release();
    }
});

// PUT release a shipment
app.put('/api/shipments/release/:id', async (req, res) => {
    const { id } = req.params;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const [shipments] = await connection.query('SELECT * FROM shipments WHERE id = ? FOR UPDATE', [id]);
        const shipmentToRelease = shipments[0];

        if (!shipmentToRelease) {
            await connection.rollback();
            return res.status(404).json({ error: 'Shipment not found' });
        }
        
        // --- Charge Calculation Logic ---
        const handlingCharge = 50;
        const perDayStorage = 10;
        const freeDays = 2;

        const arrival = new Date(shipmentToRelease.arrivalDate);
        const releaseDate = new Date();
        const durationDays = Math.ceil((releaseDate.getTime() - arrival.getTime()) / (1000 * 3600 * 24));
        const chargeableDays = Math.max(0, durationDays - freeDays);
        const storageCharges = chargeableDays * perDayStorage;
        const totalCharges = storageCharges + handlingCharge;
        
        await connection.query(
            'UPDATE shipments SET status = ?, releaseDate = ?, storageCharges = ?, handlingCharges = ?, totalCharges = ?, rackId = NULL WHERE id = ?',
            ['Released', releaseDate, storageCharges, handlingCharge, totalCharges, id]
        );
        
        if (shipmentToRelease.rackId) {
            const [racks] = await connection.query('SELECT * FROM racks WHERE id = ? FOR UPDATE', [shipmentToRelease.rackId]);
            if (racks[0]) {
                const rack = racks[0];
                const newLoad = Math.max(0, rack.currentLoad - 1);
                const newStatus = newLoad === 0 ? 'Free' : 'Partial';
                await connection.query(
                    'UPDATE racks SET currentLoad = ?, status = ? WHERE id = ?',
                    [newLoad, newStatus, shipmentToRelease.rackId]
                );
            }
        }
        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Shipment released' });

    } catch (error) {
        await connection.rollback();
        console.error("Failed to release shipment:", error);
        res.status(500).json({ error: 'Database transaction failed' });
    } finally {
        connection.release();
    }
});

// Add a catch-all 404 handler for any request that doesn't match an API route
app.use((req, res, next) => {
    res.status(404).json({ error: "Not Found" });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
