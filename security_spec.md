# ClassPulse Security Specification & Threat Model
**System Target**: ClassPulse 2.0 (MSU-Main CICS Academic Attendance & Classroom Governance System)  
**Database**: Cloud Firestore  
**Architectural Baseline**: Attribute-Based Access Control (ABAC) & Zero-Trust Defense in Depth  

---

## 1. Core Data Invariants

1. **Identity & Role Authenticity**:
   - A user profile or role assignment cannot be forged or self-escalated (e.g., student escalating to faculty or admin).
   - Only administrative identities (e.g., verified `cics.admin.*@msumain.edu.ph` or bootstrap admin `makil.fc515@s.msumain.edu.ph`) can execute destructive operations (deletions across users, classes, and logs).

2. **Academic Class Governance**:
   - Class sessions must define a valid course code and descriptive title.
   - Deletion and structural schedule modification are strictly reserved for Faculty instructors and College Administrators.

3. **Attendance Record Integrity & Immutability**:
   - Every attendance entry must bind strictly to a non-empty `classId` and identify a student (`studentId` or `studentName`).
   - Students cannot modify another student's attendance records.
   - Historical record deletion is restricted to authorized faculty and administrators.

4. **Enrollment Ledger Binding**:
   - Course enrollments must link an existing `classId` and student identity.
   - Unenrolling and ledger drops must be authenticated and cannot overwrite historical records without audit tracking.

5. **Excuse Letter State Locking (Anti-Shortcutting)**:
   - Students can file excuse letters with valid reasons and class associations in `'pending'` status.
   - Students are strictly forbidden from approving their own excuse requests (`status: 'approved'`). Only instructors and admins can approve or reject.

6. **Consultation Appointment Protocol**:
   - Consultations must explicitly define both `studentId` and `facultyId`.
   - Cancellation and confirmation states are protected between the student and assigned faculty member.

7. **Default-Deny Catch-All**:
   - Any document path or subcollection not explicitly declared in the security specification is denied read and write access (`allow read, write: if false;`).

---

## 2. The "Dirty Dozen" Threat Payloads

The following 12 adversarial test payloads are designed to challenge identity, integrity, state, and size boundaries. In hardened rules, every single one of these payloads must be rejected with `PERMISSION_DENIED`.

### Payload 1: Privilege Escalation (Self-Assigned Admin Role)
- **Target Path**: `/users/student_attacker_01`
- **Method**: `setDoc` (create)
- **Identity**: Unprivileged Student (`uid: "student_attacker_01"`)
- **Malicious Payload**:
  ```json
  {
    "id": "student_attacker_01",
    "name": "Attacker",
    "email": "attacker@msumain.edu.ph",
    "role": "admin",
    "isSuperAdmin": true
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Cannot self-assign administrative role or bypass verification).

---

### Payload 2: Ghost Field / Shadow Update Attack
- **Target Path**: `/classes/csc101-session`
- **Method**: `updateDoc`
- **Identity**: Authenticated User
- **Malicious Payload**:
  ```json
  {
    "code": "CSC101",
    "name": "Intro to Computing",
    "__shadow_override": true,
    "isBypassed": true
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Strict schema and key boundaries reject unexpected ghost attributes).

---

### Payload 3: Orphaned Attendance Record (Empty Relational Binding)
- **Target Path**: `/records/rec_rogue_999`
- **Method**: `setDoc` (create)
- **Identity**: Authenticated Student
- **Malicious Payload**:
  ```json
  {
    "classId": "",
    "studentId": "2023-10492",
    "status": "present",
    "date": "2026-09-10"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Rejects empty or non-string class binding).

---

### Payload 4: Unauthorized Class Session Deletion
- **Target Path**: `/classes/csc181-lecture`
- **Method**: `deleteDoc`
- **Identity**: Regular Student (`role: 'student'`)
- **Malicious Payload**: `DELETE`
- **Expected Outcome**: `PERMISSION_DENIED` (Only faculty or admins can delete classes).

---

### Payload 5: State Shortcutting (Self-Approved Excuse Letter)
- **Target Path**: `/excuse_letters/excuse_fraud_01`
- **Method**: `setDoc` (create)
- **Identity**: Student (`uid: "student_01"`)
- **Malicious Payload**:
  ```json
  {
    "id": "excuse_fraud_01",
    "studentId": "student_01",
    "classId": "class_algo_01",
    "reason": "Overslept",
    "status": "approved"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Students cannot create excuse letters with `status: 'approved'`).

---

### Payload 6: Cross-User Attendance Tampering
- **Target Path**: `/records/rec_victim_01`
- **Method**: `updateDoc`
- **Identity**: Student B (`uid: "student_b"`)
- **Malicious Payload**:
  ```json
  {
    "studentId": "student_a",
    "status": "absent"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Students cannot alter other students' attendance records).

---

### Payload 7: Denial of Wallet / ID Poisoning
- **Target Path**: `/records/` + `A`.repeat(2048)
- **Method**: `setDoc`
- **Identity**: Malicious User
- **Malicious Payload**:
  ```json
  {
    "classId": "class_1",
    "studentId": "student_1",
    "status": "present"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Document ID violates length limit `<= 128` chars).

---

### Payload 8: PII Blanket Harvest (Credentials Exfiltration)
- **Target Path**: `/credentials`
- **Method**: `getDocs` (unrestricted list)
- **Identity**: Unauthenticated or Unauthorized User
- **Malicious Payload**: Query read
- **Expected Outcome**: `PERMISSION_DENIED` (Credentials collection restricted from unauthorized exfiltration).

---

### Payload 9: Email Spoofing Header Attack
- **Target Path**: `/audit_logs/log_admin_wipe`
- **Method**: `deleteDoc`
- **Identity**: Unverified token with forged email string `cics.admin.fake@msumain.edu.ph` (`email_verified: false`)
- **Malicious Payload**: `DELETE`
- **Expected Outcome**: `PERMISSION_DENIED` (Must be verified administrative identity).

---

### Payload 10: Value Poisoning (Invalid Type/Size)
- **Target Path**: `/records/rec_poison_01`
- **Method**: `setDoc`
- **Identity**: Authenticated Student
- **Malicious Payload**:
  ```json
  {
    "classId": "class_valid_01",
    "studentId": "student_valid_01",
    "status": ["present", 123, true, { "exploit": true }]
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Status must be string and within allowed boundaries).

---

### Payload 11: Audit Trail Deletion / Tampering
- **Target Path**: `/audit_logs/log_security_event_01`
- **Method**: `deleteDoc` or `updateDoc`
- **Identity**: Standard User or Student
- **Malicious Payload**: `DELETE`
- **Expected Outcome**: `PERMISSION_DENIED` (Audit logs are append-only; update and deletion restricted to Admin).

---

### Payload 12: Direct Rogue Collection Injection (Default Deny Test)
- **Target Path**: `/secret_tokens/system_key`
- **Method**: `setDoc`
- **Identity**: Any user
- **Malicious Payload**:
  ```json
  {
    "masterKey": "compromised_token"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Global default-deny catch-all blocks any undeclared path).

---

## 3. Test Runner Architecture

The companion test suite `firestore.rules.test.ts` executes these test cases using the standard Firebase testing paradigm, ensuring zero false-positives and zero permission leaks before deployment.
