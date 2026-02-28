import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Employee', 'HR', 'HR Manager', 'Manager', 'Assigned Manager', 'TL'], default: 'Employee' },
    designation: { type: String },
    phone: { type: String },
    department: { type: String },
    employeeCode: { type: String }, // For the header card
    joinDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    onboardingStatus: { type: String, enum: ['Pending', 'In Progress', 'Pending Approval', 'Completed'], default: 'Pending' },
    managerApproval: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    hrApproval: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },

    // Personal Information
    salutation: { type: String },
    firstName: { type: String },
    middleName: { type: String },
    lastName: { type: String },
    gender: { type: String },
    dob: { type: Date },
    bloodGroup: { type: String },
    maritalStatus: { type: String },
    nationalId: { type: String }, // Aadhar or National ID
    address: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    nationality: { type: String },
    countryOfBirth: { type: String },
    stateOfBirth: { type: String },
    placeOfBirth: { type: String },
    coordinates: { type: String }, // Added for Contact Section
    aboutMe: { type: String }, // Added for Collapsible Section
    familyDetails: { type: String }, // Added for Collapsible Section

    // Contact Details
    personalEmail: { type: String },
    alternatePhone: { type: String },
    residentialLandline: { type: String },
    emergencyContactName: { type: String },
    emergencyContactNumber: { type: String },

    // Employment Information
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employmentType: { type: String, enum: ['Full-time', 'Intern', 'Contract', 'Freelance'], default: 'Full-time' },
    workLocation: { type: String },
    salary: { type: Number }, // Optional Admin-only visible field

    // Onboarding specific
    probationPeriod: { type: Number }, // in months
    bankName: { type: String },
    accountNumber: { type: String },
    pfAccount: { type: String },
    esiAccount: { type: String },
    salaryDetails: {
        basePay: { type: Number },
        basicSalary: { type: Number },
        hra: { type: Number },
        conveyance: { type: Number },
        pfEmployee: { type: Number },
        esiEmployee: { type: Number },
        professionalTax: { type: Number },
        pfEmployer: { type: Number },
        esiEmployer: { type: Number }
    }
}, { timestamps: true });

delete mongoose.models.User;
export default mongoose.models.User || mongoose.model('User', UserSchema);
