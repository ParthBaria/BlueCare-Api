import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'patient'],
    required: true
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  // Doctor specific fields
  specialization: {
    type: String,
    required: function () { return this.role === 'doctor'; }
  },
  licenseNumber: {
    type: String,
    required: function () { return this.role === 'doctor'; }
  },
  yearsOfExperience: {
    type: Number
  },
  // Patient specific fields
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  emergencyContact: {
    type: String
  },
  assignedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bio: {
    type: String,
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);