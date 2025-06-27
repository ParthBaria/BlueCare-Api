import express from 'express';
import User from '../models/User.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, page = 1, limit = 10 } = req.query;
    const query = role ? { role } : {};


    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, address, specialization, yearsOfExperience, dateOfBirth, gender, emergencyContact, bio } = req.body;

    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    if (user.role === 'doctor') {
      if (specialization) user.specialization = specialization;
      if (yearsOfExperience) user.yearsOfExperience = yearsOfExperience;
      if (bio) user.bio = bio;
    } else if (user.role === 'patient') {
      if (dateOfBirth) user.dateOfBirth = dateOfBirth;
      if (gender) user.gender = gender;
      if (emergencyContact) user.emergencyContact = emergencyContact;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ message: 'User updated successfully', user: userResponse });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign patient to doctor (Admin only)
router.put('/:patientId/assign-doctor', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { doctorId } = req.body;

    const patient = await User.findById(req.params.patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    patient.assignedDoctorId = doctorId;
    await patient.save();

    res.json({ message: 'Patient assigned to doctor successfully' });
  } catch (error) {
    console.error('Assign patient error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get doctor's patients
router.get('/doctor/:doctorId/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.doctorId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const patients = await User.find({
      role: 'patient',
      assignedDoctorId: req.params.doctorId
    }).select('-password');

    res.json({ patients });
  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;