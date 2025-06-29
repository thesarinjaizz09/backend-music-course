// routes/admin.routes.ts
import { Router } from 'express';
import {
  registerAdmin,
  loginAdmin,
  refreshAdminAccessToken,
  logoutAdmin,
  changeAdminPassword,
  // updateAdminRole,
  // getAdminProfile
} from '../controllers/admin.controller';
import adminAuth from '../middlewares/adminAuth.middleware';
import { requireAdminRole, requireUserRole } from '../middlewares/adminRoleAuth.middleware';
import {
  updateAdminRole, 
  deleteAdmin, 
  getAdminDetails,
  getAllAdmins,
  toggleAdminStatus
} from '../controllers/adminAction.controller';


const router = Router();


router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.post('/refresh-token', refreshAdminAccessToken);

// // Protected routes - require admin authentication
router.use(adminAuth); 
router.post('/logout', logoutAdmin);
router.post('/change-password', requireUserRole, changeAdminPassword);
// router.get('/profile', requireUserRole, getAdminProfile);

// // Admin-only routes (require 'admin' role)
router.get('/users', requireAdminRole, getAllAdmins);
router.get('/:adminId', requireAdminRole, getAdminDetails);
router.patch('/role', requireAdminRole, updateAdminRole);
router.delete('/:adminId', requireAdminRole, deleteAdmin);
router.patch('/:adminId/toggle-status', requireAdminRole, toggleAdminStatus);








// Future admin-only routes for exam/course management
// router.post('/exams', requireAdminRole, createExam);
// router.get('/assignments/pending', requireAdminRole, getPendingAssignments);
// router.post('/certificates/issue', requireAdminRole, issueCertificate);

export default router;
