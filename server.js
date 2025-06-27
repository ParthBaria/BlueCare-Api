import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import appointmentRoutes from './routes/appointments.js';
import medicalRecordRoutes from './routes/medicalRecords.js';
import prescriptionRoutes from './routes/prescriptions.js';
import cron from 'node-cron';
import Appointment from './models/Appointment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Health Card API is running!' });
});
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const result = await Appointment.updateMany(
      {
        status: 'scheduled',
        appointmentDate: { $lt: now }
      },
      { $set: { status: 'completed' } }
    );
    console.log(`Updated ${result.modifiedCount} appointments to completed`);
  } catch (err) {
    console.error('Error updating appointments:', err);
  }
});
// Connect to MongoDB
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mernproject.e7paa.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=MERNproject` || 'mongodb://localhost:27017/healthcard')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });