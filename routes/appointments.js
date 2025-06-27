import express from 'express';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Create appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, reason } = req.body;

    // Validate doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if patient is trying to book for themselves or if admin/doctor is booking
    let patientId;
    if (req.user.role === 'patient') {
      patientId = req.user._id;
    } else if (req.user.role === 'admin' || req.user.role === 'doctor') {
      patientId = req.body.patientId;
    }

    const appointment = new Appointment({
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      reason
    });

    await appointment.save();
    await appointment.populate(['patientId', 'doctorId'], 'fullName email');

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    }
    // Admin can see all appointments

    const { status, date, page = 1, limit = 10 } = req.query;
    
    if (status) query.status = status;
    if (date) query.appointmentDate = new Date(date);

    const appointments = await Appointment.find(query)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ appointmentDate: -1, appointmentTime: -1 });

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email specialization');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     appointment.patientId._id.toString() === req.user._id.toString() ||
                     appointment.doctorId._id.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     appointment.patientId.toString() === req.user._id.toString() ||
                     appointment.doctorId.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { appointmentDate, appointmentTime, status, reason, notes } = req.body;

    if (appointmentDate) appointment.appointmentDate = appointmentDate;
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (status) appointment.status = status;
    if (reason) appointment.reason = reason;
    if (notes) appointment.notes = notes;

    await appointment.save();
    await appointment.populate(['patientId', 'doctorId'], 'fullName email');

    res.json({
      message: 'Appointment updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     appointment.patientId.toString() === req.user._id.toString() ||
                     appointment.doctorId.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;