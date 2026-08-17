import React from 'react';
import { Role, AccessibilityConfig, UserProfile } from '../types';
import { 
  Lock, 
  Mail, 
  User, 
  ChevronRight, 
  Sparkles, 
  Shield,
  Eye,
  EyeOff,
  Activity,
  X,
  Chrome,
  CheckCircle,
  Hash
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { motion } from 'motion/react';
import { googleSignIn } from '../lib/googleAuth';
import { 
  saveUserProfileToFirestore,
  saveRegisteredUserToFirestore,
  saveUserCredentialToFirestore,
  savePasswordResetToFirestore,
  syncAllAccountsFromFirestore
} from '../lib/firestoreSync';
import { formatMsuId, isValidMsuId } from '../lib/msuUtils';

interface AuthScreensProps {
  onLoginSuccess: (role: Role, customName?: string, customEmail?: string) => void;
  accessibility: AccessibilityConfig;
}

export default function AuthScreens({ onLoginSuccess, accessibility }: AuthScreensProps) {
  const [isLoginView, setIsLoginView] = React.useState(true);
  const [isForgotPwdView, setIsForgotPwdView] = React.useState(false);
  const [isCheckingCredentials, setIsCheckingCredentials] = React.useState(false);
  const [credentialErrorSkeleton, setCredentialErrorSkeleton] = React.useState<string | null>(null);
  
  // Forgot password form states
  const [fpRole, setFpRole] = React.useState<Role>('student');
  const [fpContactNumber, setFpContactNumber] = React.useState('');
  const [fpIdNumber, setFpIdNumber] = React.useState('');
  const [fpCompleteName, setFpCompleteName] = React.useState('');
  const [fpFacultyCode, setFpFacultyCode] = React.useState('');
  const [fpSuccessMsg, setFpSuccessMsg] = React.useState<string | null>(null);
  const [fpErrorMsg, setFpErrorMsg] = React.useState<string | null>(null);
  const [fpRequestSubmitted, setFpRequestSubmitted] = React.useState(false);

  // States for checking reset approval/status and customizing password directly
  const [checkIdNumber, setCheckIdNumber] = React.useState('');
  const [approvedResetRequest, setApprovedResetRequest] = React.useState<any | null>(null);
  const [checkError, setCheckError] = React.useState<string | null>(null);
  const [newFpPassword, setNewFpPassword] = React.useState('');
  const [confirmFpPassword, setConfirmFpPassword] = React.useState('');
  const [fpResetSuccess, setFpResetSuccess] = React.useState(false);

  React.useEffect(() => {
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    syncAllAccountsFromFirestore(isOffline).catch(err => console.error(err));
  }, []);

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFpSuccessMsg(null);
    setFpErrorMsg(null);
    setFpNameError(false);
    setFpIdError(false);
    setFpContactError(false);

    let hasError = false;
    if (!fpCompleteName.trim()) {
      setFpNameError(true);
      hasError = true;
    }
    if (!fpIdNumber.trim()) {
      setFpIdError(true);
      hasError = true;
    }
    if (!fpContactNumber.trim()) {
      setFpContactError(true);
      hasError = true;
    }

    if (hasError) {
      setFpErrorMsg("Please fill out all the fields highlighted in red.");
      return;
    }

    // Generate request
    const newRequest = {
      id: 'req-' + Math.random().toString(36).substring(2, 9),
      role: fpRole,
      completeName: fpCompleteName.trim(),
      idNumber: fpIdNumber.trim(),
      contactNumber: fpContactNumber.trim(),
      facultyCode: '',
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    // Save in localStorage
    const savedReqsRaw = localStorage.getItem('classpulse_password_reset_requests') || '[]';
    let savedReqs = [];
    try {
      savedReqs = JSON.parse(savedReqsRaw);
    } catch (err) {
      console.error(err);
    }

    // check if there's already an active/pending request for this ID Number
    const existing = savedReqs.find((r: any) => r.idNumber === fpIdNumber.trim() && r.status === 'pending');
    if (existing) {
      setFpIdError(true);
      setFpErrorMsg("A pending request already exists for this ID Number. Please check status or notify your admin.");
      return;
    }

    savedReqs.push(newRequest);
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(savedReqs));

    // Save reset request to Firestore so admin on any device sees it
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    savePasswordResetToFirestore(isOffline, newRequest).catch(err => console.error(err));

    // notify storage listeners
    window.dispatchEvent(new Event('password-reset-requests-changed'));

    setFpSuccessMsg("Your password reset request has been successfully submitted to the Administrator for approval! You can now check the status of your request below.");
    speakText("Forgot password request submitted.", accessibility.readAloud);
    setFpRequestSubmitted(true);
  };

  const handleCheckRequestStatus = () => {
    setCheckError(null);
    setApprovedResetRequest(null);
    setCheckIdError(false);

    if (!checkIdNumber.trim()) {
      setCheckIdError(true);
      setCheckError("Please enter your ID Number to check.");
      return;
    }

    const savedReqsRaw = localStorage.getItem('classpulse_password_reset_requests') || '[]';
    let savedReqs = [];
    try {
      savedReqs = JSON.parse(savedReqsRaw);
    } catch (err) {
      console.error(err);
    }

    const found = savedReqs.find((r: any) => (r.idNumber || '').toLowerCase() === checkIdNumber.trim().toLowerCase());
    
    if (!found) {
      setCheckIdError(true);
      setCheckError("No password reset request found for this ID Number. Please submit a request first.");
      return;
    }

    if (found.status === 'pending') {
      setCheckError("Your request is still PENDING Administrator approval. Please ask your administrator to approve it.");
      return;
    }

    if (found.status === 'rejected') {
      setCheckError("Your request was REJECTED by the Administrator. Please submit a new request with accurate credentials.");
      return;
    }

    if (found.status === 'resolved') {
      setCheckError("This request has already been resolved and customized. If you need to reset again, please submit a new request.");
      return;
    }

    if (found.status === 'approved') {
      setApprovedResetRequest(found);
      speakText("Your password reset request has been approved. Please customize your password below.", accessibility.readAloud);
    }
  };

  const handleCustomizeApprovedPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckError(null);
    setNewFpPwdError(false);
    setConfirmFpPwdError(false);

    let hasError = false;
    if (!newFpPassword.trim()) {
      setNewFpPwdError(true);
      setCheckError("New password cannot be empty.");
      hasError = true;
    }

    if (newFpPassword !== confirmFpPassword) {
      setConfirmFpPwdError(true);
      setCheckError("Passwords do not match.");
      hasError = true;
    }

    if (hasError) return;

    if (!approvedResetRequest) return;

    // 1. Save new password in custom passwords
    const savedPasswordsRaw = localStorage.getItem('classpulse_custom_passwords') || '{}';
    let savedPasswords: Record<string, string> = {};
    try {
      savedPasswords = JSON.parse(savedPasswordsRaw);
    } catch (err) {
      console.error(err);
    }

    const userEmail = ((approvedResetRequest?.completeName || '').toLowerCase().replace(/\s+/g, '')) + "@msu.edu.ph";
    
    savedPasswords[(approvedResetRequest?.idNumber || '').toLowerCase()] = newFpPassword.trim();
    savedPasswords[userEmail] = newFpPassword.trim();

    // Also map to the user's actual registered email from the users database if possible
    try {
      const registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      const matchedUser = registeredUsers.find((u: any) => u.uid && approvedResetRequest?.idNumber && (u.uid || '').toLowerCase() === (approvedResetRequest.idNumber || '').toLowerCase());
      if (matchedUser && matchedUser.email) {
        savedPasswords[(matchedUser.email || '').toLowerCase().trim()] = newFpPassword.trim();
      }
    } catch (e) {
      console.error("Failed to map customized password to registered user's email", e);
    }

    localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));

    // Save customized password to Firestore so login works across mobile and desktop
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    if (approvedResetRequest?.idNumber) {
      saveUserCredentialToFirestore(isOffline, approvedResetRequest.idNumber, newFpPassword.trim()).catch(err => console.error(err));
    }
    saveUserCredentialToFirestore(isOffline, userEmail, newFpPassword.trim()).catch(err => console.error(err));

    // 2. Mark request as resolved (remove or update status so they can't re-use it)
    const savedReqsRaw = localStorage.getItem('classpulse_password_reset_requests') || '[]';
    let savedReqs = [];
    try {
      savedReqs = JSON.parse(savedReqsRaw);
    } catch (err) {
      console.error(err);
    }

    const updatedReqs = savedReqs.map((r: any) => {
      if (r.id === approvedResetRequest.id) {
        const resolvedObj = { ...r, status: 'resolved' };
        savePasswordResetToFirestore(isOffline, resolvedObj).catch(err => console.error(err));
        return resolvedObj;
      }
      return r;
    });
    localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(updatedReqs));
    window.dispatchEvent(new Event('password-reset-requests-changed'));

    setFpResetSuccess(true);
    speakText("Password customized successfully. Confirming back to login screen.", accessibility.readAloud);
    
    // Clear out form
    setFpCompleteName('');
    setFpIdNumber('');
    setFpContactNumber('');
    setFpFacultyCode('');
    setCheckIdNumber('');
    setNewFpPassword('');
    setConfirmFpPassword('');
    setApprovedResetRequest(null);
  };
  
  const startLoginFlow = (role: Role, name?: string, email?: string) => {
    onLoginSuccess(role, name || 'User', email || '');
  };

  // Track registered admin count to determine if we allow registering as admin or not
  const [adminCount, setAdminCount] = React.useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      return list.filter((u: any) => u.role === 'admin').length;
    } catch {
      return 0;
    }
  });

  // Listen for storage / custom changes
  React.useEffect(() => {
    const checkCount = () => {
      try {
        const list = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
        setAdminCount(list.filter((u: any) => u.role === 'admin').length);
      } catch {
        setAdminCount(0);
      }
    };
    window.addEventListener('registered-users-changed', checkCount);
    window.addEventListener('storage', checkCount);
    return () => {
      window.removeEventListener('registered-users-changed', checkCount);
      window.removeEventListener('storage', checkCount);
    };
  }, []);
  
  // Registration form states
  const [regName, setRegName] = React.useState('');
  const [regEmail, setRegEmail] = React.useState('');
  const [regStudentId, setRegStudentId] = React.useState('');
  const [regRole, setRegRole] = React.useState<Role>('student');
  const [regPassword, setRegPassword] = React.useState('');
  const [googleIsLoading, setGoogleIsLoading] = React.useState(false);

  const detectRoleFromGoogleUser = (email: string, displayName: string): Role => {
    const emailLower = email.toLowerCase();
    const nameLower = displayName.toLowerCase();

    if (emailLower.includes('admin') || nameLower.includes('admin') || emailLower.includes('registrar')) {
      return 'admin';
    }
    if (
      emailLower.includes('faculty') || 
      emailLower.includes('prof') || 
      emailLower.includes('teacher') || 
      emailLower.includes('instructor') || 
      emailLower.includes('dean') || 
      emailLower.includes('emp') ||
      nameLower.includes('prof') ||
      nameLower.includes('teacher') ||
      nameLower.includes('instructor') ||
      nameLower.includes('dean') ||
      nameLower.includes('faculty')
    ) {
      return 'faculty';
    }
    return 'student';
  };

  const handleRealGoogleSignIn = async () => {
    try {
      setGoogleIsLoading(true);
      const result = await googleSignIn();
      if (!result) return;

      const { user: firebaseUser } = result;
      const name = firebaseUser.displayName || 'Google Scholar';
      const email = firebaseUser.email || '';

      // Check if user already exists in classpulse_registered_users
      let registeredUsers = [];
      try {
        registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      } catch (err) {
        console.error(err);
      }

      let existingUser = registeredUsers.find((u: any) => u.email && email && u.email.toLowerCase() === email.toLowerCase());
      let resolvedRole: Role = 'student';

      if (existingUser) {
        resolvedRole = existingUser.role;
      } else {
        // Automatically detect user's role from email/name credentials
        resolvedRole = detectRoleFromGoogleUser(email, name);

        // Create the new user record
        const newUserObj = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          role: resolvedRole,
          uid: resolvedRole === 'student' ? 'STU-' + firebaseUser.uid.substring(0, 5).toUpperCase() : resolvedRole === 'faculty' ? 'FAC-' + firebaseUser.uid.substring(0, 5).toUpperCase() : 'ADM-' + firebaseUser.uid.substring(0, 5).toUpperCase(),
          department: resolvedRole === 'faculty' ? 'College of Computer Studies' : resolvedRole === 'admin' ? 'Academic Registrar Board' : 'CCS Department'
        };

        registeredUsers.push(newUserObj);
        localStorage.setItem('classpulse_registered_users', JSON.stringify(registeredUsers));
        window.dispatchEvent(new Event('registered-users-changed'));

        if (resolvedRole === 'admin') {
          localStorage.setItem('classpulse_registered_admins', JSON.stringify(registeredUsers.filter((u: any) => u.role === 'admin')));
          window.dispatchEvent(new Event('registered-admins-changed'));
        }

        // Save profile in Firestore
        const userProfileObj: any = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          role: resolvedRole,
          avatar: firebaseUser.photoURL || '',
          studentId: resolvedRole === 'student' ? newUserObj.uid : '',
          facultyId: resolvedRole === 'faculty' ? newUserObj.uid : '',
          department: newUserObj.department,
          bio: 'Registered securely via ClassPulse institutional Google login with auto-detected role.',
          phone: '',
          joinedAt: new Date().toISOString()
        };

        const isOffline = localStorage.getItem('cp_offline') === 'true';
        await saveUserProfileToFirestore(isOffline, userProfileObj);
        await saveRegisteredUserToFirestore(isOffline, newUserObj);
      }

      speakText(`Google identity authenticated as ${name} with auto-detected ${resolvedRole} role`, accessibility.readAloud);
      startLoginFlow(resolvedRole, name, email);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const isPopupClosed = err.code === 'auth/popup-closed-by-user' || 
                            err.message?.includes('popup-closed-by-user') ||
                            err.code === 'auth/cancelled-popup-request' ||
                            err.message?.includes('cancelled-popup-request');
      if (isPopupClosed) {
        speakText('Sign-in cancelled by closing the window.', accessibility.readAloud);
      } else {
        alert('Failed to sign in with Google: ' + (err.message || err));
      }
    } finally {
      setGoogleIsLoading(false);
    }
  };

  const handleRealGoogleSignUp = async () => {
    try {
      setGoogleIsLoading(true);
      const result = await googleSignIn();
      if (!result) return;

      const { user: firebaseUser } = result;
      const name = firebaseUser.displayName || 'Google Scholar';
      const email = firebaseUser.email || '';

      // Check if user already exists in classpulse_registered_users
      let registeredUsers = [];
      try {
        registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      } catch (err) {
        console.error(err);
      }

      let existingUser = registeredUsers.find((u: any) => u.email && email && u.email.toLowerCase() === email.toLowerCase());
      let resolvedRole: Role = 'student';

      if (existingUser) {
        resolvedRole = existingUser.role;
      } else {
        // Automatically detect user's role from email/name credentials
        resolvedRole = detectRoleFromGoogleUser(email, name);

        const newUserObj = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          role: resolvedRole,
          uid: resolvedRole === 'student' ? 'STU-' + firebaseUser.uid.substring(0, 5).toUpperCase() : resolvedRole === 'faculty' ? 'FAC-' + firebaseUser.uid.substring(0, 5).toUpperCase() : 'ADM-' + firebaseUser.uid.substring(0, 5).toUpperCase(),
          department: resolvedRole === 'faculty' ? 'College of Computer Studies' : resolvedRole === 'admin' ? 'Academic Registrar Board' : 'CCS Department'
        };

        registeredUsers.push(newUserObj);
        localStorage.setItem('classpulse_registered_users', JSON.stringify(registeredUsers));
        window.dispatchEvent(new Event('registered-users-changed'));

        if (resolvedRole === 'admin') {
          localStorage.setItem('classpulse_registered_admins', JSON.stringify(registeredUsers.filter((u: any) => u.role === 'admin')));
          window.dispatchEvent(new Event('registered-admins-changed'));
        }

        // Automatically register and persist profile in Firestore
        const userProfileObj: any = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          role: resolvedRole,
          avatar: firebaseUser.photoURL || '',
          studentId: resolvedRole === 'student' ? newUserObj.uid : '',
          facultyId: resolvedRole === 'faculty' ? newUserObj.uid : '',
          department: newUserObj.department,
          bio: 'Registered securely via ClassPulse institutional Google login with auto-detected role.',
          phone: '',
          joinedAt: new Date().toISOString()
        };

        // Save user profile to Firestore
        const isOffline = localStorage.getItem('cp_offline') === 'true';
        await saveUserProfileToFirestore(isOffline, userProfileObj);
        await saveRegisteredUserToFirestore(isOffline, newUserObj);
      }

      speakText(`Google identity authenticated as ${name} with auto-detected ${resolvedRole} role`, accessibility.readAloud);
      startLoginFlow(resolvedRole, name, email);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const isPopupClosed = err.code === 'auth/popup-closed-by-user' || 
                            err.message?.includes('popup-closed-by-user') ||
                            err.code === 'auth/cancelled-popup-request' ||
                            err.message?.includes('cancelled-popup-request');
      if (isPopupClosed) {
        speakText('Sign-in cancelled by closing the window.', accessibility.readAloud);
      } else {
        alert('Failed to sign in with Google: ' + (err.message || err));
      }
    } finally {
      setGoogleIsLoading(false);
    }
  };
  
  // Login form states
  const [loginEmail, setLoginEmail] = React.useState('');
  
  const isEmailRegistered = React.useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      return list.some((u: any) => u.email && loginEmail && u.email.toLowerCase() === loginEmail.trim().toLowerCase());
    } catch {
      return false;
    }
  }, [loginEmail]);

  const [loginPassword, setLoginPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  // Field-specific visual error highlighting and inline message banners
  const [loginEmailError, setLoginEmailError] = React.useState(false);
  const [loginPasswordError, setLoginPasswordError] = React.useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = React.useState<string | null>(null);

  const [regNameError, setRegNameError] = React.useState(false);
  const [regEmailError, setRegEmailError] = React.useState(false);
  const [regStudentIdError, setRegStudentIdError] = React.useState(false);
  const [regPasswordError, setRegPasswordError] = React.useState(false);
  const [regErrorMessage, setRegErrorMessage] = React.useState<string | null>(null);

  const [fpNameError, setFpNameError] = React.useState(false);
  const [fpIdError, setFpIdError] = React.useState(false);
  const [fpContactError, setFpContactError] = React.useState(false);
  const [checkIdError, setCheckIdError] = React.useState(false);

  const [newFpPwdError, setNewFpPwdError] = React.useState(false);
  const [confirmFpPwdError, setConfirmFpPwdError] = React.useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginEmailError(false);
    setLoginPasswordError(false);
    setLoginErrorMessage(null);
    setCredentialErrorSkeleton(null);

    // 1. Check empty fields
    let hasError = false;
    if (!loginEmail.trim()) {
      setLoginEmailError(true);
      hasError = true;
    }
    if (!loginPassword.trim()) {
      setLoginPasswordError(true);
      hasError = true;
    }

    if (hasError) {
      speakText("Please enter missing login details.", accessibility.readAloud);
      return;
    }

    // 2. Synchronously check if the email exists in register list to avoid loading skeleton for bad inputs
    let registeredUsers: any[] = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    } catch (err) {
      console.error(err);
    }

    const matched = registeredUsers.find((u: any) => u.email && loginEmail && u.email.toLowerCase() === loginEmail.toLowerCase().trim());
    if (!matched) {
      setLoginEmailError(true);
      speakText("Account not found. Verification blocked.", accessibility.readAloud);
      return;
    }

    // Check if there's an approved reset request for this user (redirect instantly to customize password view)
    const savedReqsRaw = localStorage.getItem('classpulse_password_reset_requests') || '[]';
    let savedReqs = [];
    try {
      savedReqs = JSON.parse(savedReqsRaw);
    } catch (err) {
      console.error(err);
    }

    const matchedApproved = savedReqs.find((r: any) => 
      r.status === 'approved' && (
        (r.idNumber || '').toLowerCase() === loginEmail.toLowerCase().trim() ||
        (((r.completeName || '').toLowerCase().replace(/\s+/g, '')) + "@msu.edu.ph") === loginEmail.toLowerCase().trim() ||
        (r.completeName || '').toLowerCase() === loginEmail.toLowerCase().trim()
      )
    );

    if (matchedApproved) {
      setIsForgotPwdView(true);
      setFpRequestSubmitted(false);
      setFpSuccessMsg(null);
      setFpErrorMsg(null);
      setFpResetSuccess(false);
      setApprovedResetRequest(matchedApproved);
      setCheckIdNumber(matchedApproved.idNumber);
      speakText("An approved password reset request was found. Redirecting to Customize Password page.", accessibility.readAloud);
      return;
    }

    // Check custom customized password
    const savedPasswordsRaw = localStorage.getItem('classpulse_custom_passwords') || '{}';
    let savedPasswords: Record<string, string> = {};
    try {
      savedPasswords = JSON.parse(savedPasswordsRaw);
    } catch (err) {
      console.error(err);
    }

    const emailKey = loginEmail.toLowerCase().trim();
    const storedPassword = savedPasswords[emailKey];

    if (!storedPassword) {
      // First-time login detected (no password set in custom passwords). Redirect them to setup.
      const autoResetReq = {
        id: 'req-auto-' + matched.id,
        role: matched.role,
        completeName: matched.name,
        idNumber: matched.uid,
        contactNumber: '+63 901 000 0000',
        status: 'approved',
        requestedAt: new Date().toISOString()
      };

      let savedReqs = [];
      try {
        savedReqs = JSON.parse(localStorage.getItem('classpulse_password_reset_requests') || '[]');
      } catch {}
      if (!savedReqs.some((r: any) => r.idNumber === matched.uid)) {
        savedReqs.push(autoResetReq);
        localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(savedReqs));
        window.dispatchEvent(new Event('password-reset-requests-changed'));
      }

      setIsForgotPwdView(true);
      setFpRequestSubmitted(false);
      setFpSuccessMsg(null);
      setFpErrorMsg(null);
      setFpResetSuccess(false);
      setApprovedResetRequest(autoResetReq);
      setCheckIdNumber(matched.uid);

      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast("First-time login detected. Please customize your password!", "info");
      }
      speakText("First time login detected. Please customize your password below.", accessibility.readAloud);
      return;
    }

    // 3. Check password mismatch instantly (DO NOT show spinner/skeleton if incorrect!)
    if (loginPassword !== storedPassword) {
      setLoginPasswordError(true);
      speakText("Incorrect password. Access denied.", accessibility.readAloud);
      return;
    }

    // 4. Everything matches! Now, briefly trigger checking state transition to simulate institutional security check
    setIsCheckingCredentials(true);
    speakText("Verifying academic credentials with institutional database registry.", accessibility.readAloud);

    setTimeout(() => {
      setIsCheckingCredentials(false);
      startLoginFlow(matched.role, matched.name, matched.email);
    }, 1200);
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegNameError(false);
    setRegEmailError(false);
    setRegStudentIdError(false);
    setRegPasswordError(false);
    setRegErrorMessage(null);

    let hasError = false;
    if (!regName.trim()) {
      setRegNameError(true);
      hasError = true;
    }
    if (!regEmail.trim()) {
      setRegEmailError(true);
      hasError = true;
    }
    if (!regPassword.trim()) {
      setRegPasswordError(true);
      hasError = true;
    }

    if (regRole === 'student' && regStudentId.trim() && !isValidMsuId(regStudentId.trim())) {
      setRegStudentIdError(true);
      setRegErrorMessage("MSU Student ID must follow official format (YYYY-XXXXX, e.g., 2023-10492).");
      speakText("Invalid MSU Student ID format.", accessibility.readAloud);
      return;
    }

    if (hasError) {
      setRegErrorMessage("Incomplete coordinates! Please pre-fill all highlighted fields to create your roster profile.");
      speakText("Please fill out all highlighted fields.", accessibility.readAloud);
      return;
    }

    let registeredUsers = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
    } catch (err) {
      console.error(err);
    }

    // Check if user with this email already exists
    const existingUser = registeredUsers.find((u: any) => u.email && regEmail && u.email.toLowerCase().trim() === regEmail.toLowerCase().trim());
    if (existingUser) {
      setRegEmailError(true);
      setRegErrorMessage("An account with this email address (" + regEmail.trim() + ") is already registered. Please log in instead.");
      speakText("An account with this email is already registered.", accessibility.readAloud);
      return;
    }

    const assignedUid = regRole === 'student'
      ? (regStudentId.trim() ? formatMsuId(regStudentId.trim()) : '2023-' + Math.floor(10000 + Math.random() * 90000))
      : regRole === 'faculty'
        ? 'FAC-' + Math.floor(10000 + Math.random() * 90000)
        : 'ADM-' + Math.floor(10000 + Math.random() * 90000);

    const newUserObj = {
      id: 'usr-' + Math.random().toString(36).substring(2, 7),
      name: regName,
      email: regEmail,
      role: regRole,
      uid: assignedUid,
      department: regRole === 'faculty' ? 'College of Information & Computing Sciences' : regRole === 'admin' ? 'Academic Registrar Board' : 'CICS Department'
    };

    registeredUsers.push(newUserObj);
    localStorage.setItem('classpulse_registered_users', JSON.stringify(registeredUsers));
    window.dispatchEvent(new Event('registered-users-changed'));

    if (regRole === 'admin') {
      localStorage.setItem('classpulse_registered_admins', JSON.stringify(registeredUsers.filter((u: any) => u.role === 'admin')));
      window.dispatchEvent(new Event('registered-admins-changed'));
    }

    // Save user profile to Firestore
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    const userProfileObj: UserProfile = {
      id: newUserObj.id,
      name: newUserObj.name,
      email: newUserObj.email,
      role: newUserObj.role,
      studentId: newUserObj.role === 'student' ? newUserObj.uid : '',
      facultyId: newUserObj.role === 'faculty' ? newUserObj.uid : '',
      department: newUserObj.department,
      avatar: '',
      bio: 'Registered securely via ClassPulse credentials.'
    };
    saveUserProfileToFirestore(isOffline, userProfileObj).catch(err => console.error(err));
    saveRegisteredUserToFirestore(isOffline, newUserObj).catch(err => console.error(err));

    // Save custom password
    let savedPasswords: any = {};
    try {
      savedPasswords = JSON.parse(localStorage.getItem('classpulse_custom_passwords') || '{}');
    } catch (err) {
      console.error(err);
    }
    savedPasswords[regEmail.toLowerCase().trim()] = regPassword;
    localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));

    saveUserCredentialToFirestore(isOffline, regEmail.toLowerCase().trim(), regPassword.trim()).catch(err => console.error(err));

    speakText(`Account registered successfully. Loading ${regRole} portal now.`, accessibility.readAloud);
    
    // Log them in immediately!
    startLoginFlow(regRole, regName, regEmail);
  };

  // Preset demo accounts login trigger
  const triggerDemoLogin = (role: Role) => {
    let email = '';
    let name = '';
    if (role === 'student') {
      email = 'john.doe@msu.edu.ph';
      name = 'John Doe';
    } else if (role === 'faculty') {
      email = 'ahmad.khan@msu.edu.ph';
      name = 'Dr. Ahmad Khan';
    } else {
      email = 'admin@msu.edu.ph';
      name = 'Admin Strator';
    }
    
    speakText(`Demo account loaded. Switched to ${role} role.`, accessibility.readAloud);
    startLoginFlow(role, name, email);
  };

  const isDark = accessibility.theme === 'dark';

  return (
    <div className="min-h-screen py-10 px-4 flex flex-col justify-center items-center relative transition-colors duration-305 bg-[#f9f9f9] dark:bg-[#121212] text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* Decorative Interactive Blurred Blobs */}
      <div className="absolute top-[15%] left-[20%] w-72 h-72 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-[15%] right-[20%] w-72 h-72 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.02] rounded-full blur-3xl pointer-events-none animate-pulse" />
      
      {/* Decorative Grid Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.01]" 
        style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />
      
      {/* Brand Launcher Logo Header */}
      <div className="mb-7 text-center z-10 space-y-2">
        <div className="relative inline-block group">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: 3 }}
            animate={{ 
              opacity: [0, 0.2, 0.08, 0.75, 0.25, 0.95, 0.55, 0.98, 0.85, 1], 
              scale: [0.85, 0.95, 0.9, 1.05, 0.98, 1.02, 0.99, 1],
              rotate: [3, 3, 2, 4, 2, 3.5, 2.8, 3]
            }}
            transition={{
              opacity: { duration: 1.3, times: [0, 0.1, 0.15, 0.3, 0.4, 0.6, 0.75, 0.85, 0.92, 1], ease: 'easeOut' },
              scale: { duration: 1.3, times: [0, 0.1, 0.15, 0.3, 0.4, 0.6, 0.75, 1], ease: 'easeOut' },
              rotate: { duration: 1.3, times: [0, 0.1, 0.15, 0.3, 0.4, 0.6, 0.75, 1], ease: 'easeOut' }
            }}
            whileHover={{ 
              scale: 1.06, 
              rotate: 0,
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.7), 0 0 10px rgba(16, 185, 129, 0.4), 0 12px 28px rgba(16, 185, 129, 0.4)'
            }}
            whileTap={{ scale: 0.96 }}
            className="relative w-14 h-14 rounded-2xl bg-emerald-500 text-black flex items-center justify-center font-bold text-2xl mx-auto cursor-pointer"
            style={{
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.15), 0 0 8px rgba(16, 185, 129, 0.15)'
            }}
          >
            <Activity className="w-7 h-7 stroke-[2.5]" />
          </motion.div>
        </div>
        <div className="pt-2 mx-auto max-w-sm">
          <h1 className="text-3xl font-black tracking-tight text-zinc-850 dark:text-zinc-100 uppercase">
            Class<span className="text-emerald-500 font-extrabold">Pulse</span>
          </h1>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Mindanao State University • Attendance Suite
          </p>
        </div>
      </div>

      {/* Main Form Box Container */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        whileHover={{ boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.08)" }}
        className="w-full max-w-md p-8 rounded-[2rem] border bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-zinc-200/80 dark:border-zinc-850/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] transition-all duration-300 z-10 text-left relative overflow-hidden group"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-400 opacity-90" />

        {isForgotPwdView ? (
          /* ================= FORGOT PASSWORD SCREEN ================= */
          <div className="space-y-5 animate-fade-in">
            <div className="text-left space-y-1">
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-500" />
                Password Recovery Ledger
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Submit a secure account verification request to the Administrator to reset your customized password.
              </p>
            </div>

            {fpResetSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                  Password Reset Completed!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Your password has been customized successfully. You can now use your new customized password to log into your portal.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPwdView(false);
                    setIsLoginView(true);
                    setFpResetSuccess(false);
                  }}
                  className="w-full py-2.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : approvedResetRequest ? (
              /* ================= CUSTOMIZE PASSWORD AFTER APPROVAL ================= */
              <form onSubmit={handleCustomizeApprovedPasswordSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed space-y-1">
                  <span className="font-black block uppercase tracking-wider text-[10px]">✅ REQUEST APPROVED BY ADMIN</span>
                  <span>Hello <strong>{approvedResetRequest.completeName}</strong>! Your password reset request for ID: <code>{approvedResetRequest.idNumber}</code> is approved. You can now customize your password below:</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">New Password</label>
                  <input
                    type="password"
                    value={newFpPassword}
                    onChange={(e) => setNewFpPassword(e.target.value)}
                    placeholder="Enter new customized password"
                    className="px-4 py-2.5 border rounded-full text-xs w-full focus:outline-none border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmFpPassword}
                    onChange={(e) => setConfirmFpPassword(e.target.value)}
                    placeholder="Confirm new customized password"
                    className="px-4 py-2.5 border rounded-full text-xs w-full focus:outline-none border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    required
                  />
                </div>

                {checkError && (
                  <p className="text-xs font-bold text-red-500 block leading-relaxed">{checkError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  Confirm Back to Login
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            ) : (
              /* ================= REQUEST SUBMISSION & STATUS FORM ================= */
              <div className="space-y-6">
                {/* Switcher for Student vs Faculty */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-zinc-100 dark:bg-zinc-900/85 border border-zinc-200/50 dark:border-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => {
                      setFpRole('student');
                      setFpErrorMsg(null);
                      setFpSuccessMsg(null);
                    }}
                    className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                      fpRole === 'student' 
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFpRole('faculty');
                      setFpErrorMsg(null);
                      setFpSuccessMsg(null);
                    }}
                    className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                      fpRole === 'faculty' 
                        ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    Faculty
                  </button>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Complete Name</label>
                    <input
                      type="text"
                      value={fpCompleteName}
                      onChange={(e) => {
                        setFpCompleteName(e.target.value);
                        setFpNameError(false);
                        setFpErrorMsg(null);
                      }}
                      placeholder="e.g. John Doe"
                      className={`px-4 py-2.5 border rounded-full text-xs w-full focus:outline-none transition-all ${
                        fpNameError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">
                      {fpRole === 'student' ? 'Student ID Number' : 'Employee ID Number'}
                    </label>
                    <input
                      type="text"
                      value={fpIdNumber}
                      onChange={(e) => {
                        setFpIdNumber(e.target.value);
                        setFpIdError(false);
                        setFpErrorMsg(null);
                      }}
                      placeholder={fpRole === 'student' ? "e.g. 2023-10492" : "e.g. EMP-9104"}
                      className={`px-4 py-2.5 border rounded-full text-xs w-full focus:outline-none transition-all ${
                        fpIdError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Contact Number</label>
                    <input
                      type="tel"
                      value={fpContactNumber}
                      onChange={(e) => {
                        setFpContactNumber(e.target.value);
                        setFpContactError(false);
                        setFpErrorMsg(null);
                      }}
                      placeholder="e.g. +63 912 345 6789"
                      className={`px-4 py-2.5 border rounded-full text-xs w-full focus:outline-none transition-all ${
                        fpContactError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                      required
                    />
                  </div>



                  {fpErrorMsg && (
                    <p className="text-xs font-bold text-red-500 block leading-relaxed">{fpErrorMsg}</p>
                  )}

                  {fpSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] leading-relaxed">
                      {fpSuccessMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    Submit Password Reset Request
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>

                {/* Status Checking Section */}
                <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800 text-left space-y-3">
                  <span className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest block">
                    🔍 Check Approval & Customize Password
                  </span>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-400 leading-relaxed">
                    Once the admin approves your request, enter your ID Number below to automatically reset and customize your password.
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={checkIdNumber}
                      onChange={(e) => {
                        setCheckIdNumber(e.target.value);
                        setCheckIdError(false);
                        setCheckError(null);
                      }}
                      placeholder="Enter your ID Number"
                      className={`px-4 py-2 border rounded-full text-xs flex-1 focus:outline-none transition-all ${
                        checkIdError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleCheckRequestStatus}
                      className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-black shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      Check
                    </button>
                  </div>
                  {checkError && (
                    <p className="text-xs font-bold text-red-500 block leading-relaxed">{checkError}</p>
                  )}
                </div>

                {/* Back button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPwdView(false);
                      setIsLoginView(true);
                    }}
                    className="text-zinc-550 dark:text-zinc-400 font-extrabold hover:underline cursor-pointer text-xs uppercase tracking-wider"
                  >
                    ← Back to Login Screen
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isLoginView ? (
          /* ================= LOGIN SCREEN ================= */
          <div className="space-y-5">
            <div className="text-left space-y-1">
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">Portal Authentication</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">ClassPulse MSU Marawi Campus schedule & secure attendance tracking ledger.</p>
            </div>



            {isCheckingCredentials ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-zinc-200 dark:border-zinc-800"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 animate-spin"></div>
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-xs font-black tracking-widest text-emerald-500 animate-pulse uppercase font-mono">
                    Verifying Credentials...
                  </p>
                  <p className="text-[10px] text-zinc-400 max-w-[240px] mx-auto font-sans leading-relaxed">
                    Querying secure institutional ledger records.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Academic Email</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginEmailError(false);
                        if (!loginPasswordError) setLoginErrorMessage(null);
                      }}
                      placeholder="student@msu.edu.ph"
                      className={`pl-9 pr-4 py-2.5 border rounded-full text-xs w-full focus:outline-none transition-all ${
                        loginEmailError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginPasswordError(false);
                        if (!loginEmailError) setLoginErrorMessage(null);
                      }}
                      placeholder="Enter account security key"
                      className={`pl-9 pr-10 py-2.5 border rounded-full text-xs w-full focus:outline-none transition-all ${
                        loginPasswordError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 select-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-500">
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={() => setRememberMe(!rememberMe)}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-550 dark:text-emerald-400 cursor-pointer accent-emerald-500"
                    />
                    Remember credentials
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsForgotPwdView(true);
                      setFpRequestSubmitted(false);
                      setFpSuccessMsg(null);
                      setFpErrorMsg(null);
                      setApprovedResetRequest(null);
                      setFpResetSuccess(false);
                      speakText("Navigating to Password Recovery ledger.", accessibility.readAloud);
                    }}
                    className="text-emerald-500 font-extrabold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs hover:shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  Log In
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            )}

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-450 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleRealGoogleSignIn}
                disabled={googleIsLoading}
                className="w-full py-2.5 border rounded-full text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-850 dark:text-zinc-200 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {googleIsLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Sign In with Google
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-1.5">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Need an academic profile?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginView(false);
                    speakText("Navigating to Account Creation Ledger.", accessibility.readAloud);
                  }}
                  className="text-emerald-550 dark:text-emerald-400 font-extrabold hover:underline cursor-pointer"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* ================= SIGN UP / REGISTER SCREEN ================= */
          <div className="space-y-6">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">Create Account</h2>
              <p className="text-xs text-zinc-455 dark:text-zinc-400">Join academic ClassPulse integrated rosters today.</p>
            </div>

            <form onSubmit={handleSignUpSubmit} className="space-y-4">

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      setRegNameError(false);
                      setRegErrorMessage(null);
                    }}
                    placeholder="Rachel Green"
                    className={`pl-9 pr-4 py-2.5 border rounded-xl text-xs w-full focus:outline-none transition-all ${
                      regNameError 
                        ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Academic Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      setRegEmailError(false);
                      setRegErrorMessage(null);
                    }}
                    placeholder="student@msu.edu.ph"
                    className={`pl-9 pr-4 py-2.5 border rounded-xl text-xs w-full focus:outline-none transition-all ${
                      regEmailError 
                        ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 block">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Academic Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as Role)}
                  className="w-full text-xs p-2.5 rounded-xl border focus:outline-none border-zinc-200 bg-white dark:border-zinc-805 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-bold"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  {adminCount === 0 && (
                    <option value="admin">Admin</option>
                  )}
                </select>
              </div>

              {regRole === 'student' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">MSU Student ID Number</label>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">YYYY-XXXXX</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                      <Hash className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={regStudentId}
                      onChange={(e) => {
                        const formatted = formatMsuId(e.target.value);
                        setRegStudentId(formatted);
                        setRegStudentIdError(false);
                        setRegErrorMessage(null);
                      }}
                      maxLength={10}
                      placeholder="e.g. 2023-10492"
                      className={`pl-9 pr-4 py-2.5 border rounded-xl text-xs font-mono w-full focus:outline-none transition-all ${
                        regStudentIdError 
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400">Official Mindanao State University ID pattern (leave blank to auto-generate).</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block text-left">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-450">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      setRegPasswordError(false);
                      setRegErrorMessage(null);
                    }}
                    placeholder="Set custom secure credentials"
                    className={`pl-9 pr-4 py-2.5 border rounded-xl text-xs w-full focus:outline-none transition-all ${
                      regPasswordError 
                        ? 'border-rose-500 ring-2 ring-rose-500/10 bg-rose-500/[0.02] text-rose-700 dark:text-rose-400 focus:border-rose-500 focus:ring-rose-500/20' 
                        : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 text-[11px] text-zinc-500 leading-normal items-start">
                <input 
                  type="checkbox" 
                  defaultChecked 
                  className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-555 dark:text-emerald-400 cursor-pointer accent-emerald-500" 
                  required
                />
                <span className="text-left">
                  I agree to the <span className="font-extrabold text-emerald-555 cursor-pointer">Terms of Service</span> and <span className="font-extrabold text-[#10b981] cursor-pointer">Privacy Policy</span>.
                </span>
              </div>

              {/* Secure notification badge noting the verification bypass constraint */}
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-2 items-start text-emerald-500 text-left">
                <Shield className="w-4.5 h-4.5 shrink-0 text-emerald-500 mt-1" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Instant Auto-activation</p>
                  <p className="text-[10px] opacity-80 leading-relaxed mt-0.5">Verification flows are skipped as requested. Account registers instantly to the campus ledger.</p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                Sign Up & Launch
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-450 dark:text-zinc-500 text-[10px] uppercase font-bold tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={handleRealGoogleSignUp}
              disabled={googleIsLoading}
              className="w-full py-2.5 border rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-850 dark:text-zinc-200 transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {googleIsLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92(3.28-4.74 3.28-8.09z)" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.66-.35-1.36-.35-2.09z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign Up with Google
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-xs text-zinc-400">
                Already have an academic account? {' '}
                <button
                  type="button"
                  onClick={() => setIsLoginView(true)}
                  className="text-emerald-500 font-extrabold hover:underline cursor-pointer"
                >
                  Log In directly
                </button>
              </p>
            </div>
          </div>
        )}

      </motion.div>

    </div>
  );
}
