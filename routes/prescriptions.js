import express from 'express';
import Prescription from '../models/Prescription.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Create prescription (Doctor only)
router.post('/', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { patientId, medicationName, dosage, frequency, duration, instructions } = req.body;

    // Validate patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const prescription = new Prescription({
      patientId,
      doctorId: req.user._id,
      medicationName,
      dosage,
      frequency,
      duration,
      instructions
    });

    await prescription.save();
    await prescription.populate(['patientId', 'doctorId'], 'fullName email');

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get prescriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    }
    // Admin can see all prescriptions

    const { patientId, isActive, page = 1, limit = 10 } = req.query;
    
    if (patientId && (req.user.role === 'admin' || req.user.role === 'doctor')) {
      query.patientId = patientId;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'fullName email dateOfBirth')
      .populate('doctorId', 'fullName email specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ datePrescribed: -1 });

    const total = await Prescription.countDocuments(query);

    res.json({
      prescriptions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get prescription by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'fullName email dateOfBirth phone')
      .populate('doctorId', 'fullName email specialization');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     prescription.patientId._id.toString() === req.user._id.toString() ||
                     prescription.doctorId._id.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update prescription (Doctor only)
router.put('/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check if doctor owns this prescription
    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { medicationName, dosage, frequency, duration, instructions, isActive } = req.body;

    if (medicationName) prescription.medicationName = medicationName;
    if (dosage) prescription.dosage = dosage;
    if (frequency) prescription.frequency = frequency;
    if (duration) prescription.duration = duration;
    if (instructions) prescription.instructions = instructions;
    if (isActive !== undefined) prescription.isActive = isActive;

    await prescription.save();
    await prescription.populate(['patientId', 'doctorId'], 'fullName email');

    res.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete prescription (Doctor only)
router.delete('/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check if doctor owns this prescription
    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;