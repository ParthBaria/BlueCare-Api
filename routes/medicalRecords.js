import express from 'express';
import MedicalRecord from '../models/MedicalRecord.js';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Create medical record (Doctor only)
router.post('/', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const { patientId, diagnosis, treatment, notes, visitDate, symptoms, vitalSigns } = req.body;

    // Validate patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const medicalRecord = new MedicalRecord({
      patientId,
      doctorId: req.user._id,
      diagnosis,
      treatment,
      notes,
      visitDate,
      symptoms,
      vitalSigns
    });

    await medicalRecord.save();
    await medicalRecord.populate(['patientId', 'doctorId'], 'fullName email');

    res.status(201).json({
      message: 'Medical record created successfully',
      medicalRecord
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get medical records
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // Filter based on user role
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    }
    // Admin can see all records

    const { patientId, page = 1, limit = 10 } = req.query;
    
    if (patientId && (req.user.role === 'admin' || req.user.role === 'doctor')) {
      query.patientId = patientId;
    }

    const records = await MedicalRecord.find(query)
      .populate('patientId', 'fullName email dateOfBirth gender')
      .populate('doctorId', 'fullName email specialization')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ visitDate: -1 });

    const total = await MedicalRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get medical record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patientId', 'fullName email dateOfBirth gender phone')
      .populate('doctorId', 'fullName email specialization');

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Check permissions
    const hasAccess = req.user.role === 'admin' || 
                     record.patientId._id.toString() === req.user._id.toString() ||
                     record.doctorId._id.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ record });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update medical record (Doctor only)
router.put('/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { diagnosis, treatment, notes, symptoms, vitalSigns } = req.body;

    if (diagnosis) record.diagnosis = diagnosis;
    if (treatment) record.treatment = treatment;
    if (notes) record.notes = notes;
    if (symptoms) record.symptoms = symptoms;
    if (vitalSigns) record.vitalSigns = vitalSigns;

    await record.save();
    await record.populate(['patientId', 'doctorId'], 'fullName email');

    res.json({
      message: 'Medical record updated successfully',
      record
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete medical record (Doctor only)
router.delete('/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Check if doctor owns this record
    if (record.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await MedicalRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;