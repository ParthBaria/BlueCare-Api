import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
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
  diagnosis: {
    type: String,
    required: true
  },
  treatment: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  visitDate: {
    type: Date,
    required: true
  },
  symptoms: {
    type: String
  },
  vitalSigns: {
    bloodPressure: String,
    temperature: String,
    heartRate: String,
    weight: String
  }
}, {
  timestamps: true
});

export default mongoose.model('MedicalRecord', medicalRecordSchema);