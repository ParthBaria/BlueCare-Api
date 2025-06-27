import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicationName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  instructions: {
    type: String
  },
  datePrescribed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Prescription', prescriptionSchema);