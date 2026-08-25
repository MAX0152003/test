import React from 'react';
import { 
  ClassSession, 
  Enrollment, 
  AttendanceRecord, 
  AppNotification, 
  LabRoom, 
  AccessibilityConfig 
} from '../types';
import { safeStorage } from '../App';
import { triggerClassAlarmNotification } from './classAlarmScheduler';
import { speakText } from '../components/AccessibilitySettings';

/**
 * Generic debounce hook for state or primitive values
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced storage synchronization hook.
 * Batches high-frequency state updates to prevent main-thread I/O blocking
 * and frame drops on low-end mobile/tablet devices.
 */
export function useDebouncedStorageSync<T>(
  storageKey: string,
  value: T,
  delay: number = 350,
  serialize: (v: T) => string = JSON.stringify
) {
  const isFirstMount = React.useRef(true);

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // On initial mount, we don't immediately overwrite if already loaded
      return;
    }

    const timer = setTimeout(() => {
      try {
        const payload = typeof value === 'string' ? value : serialize(value);
        safeStorage.setItem(storageKey, payload);
      } catch (err) {
        console.warn(`[ClassPulse] Debounced storage failed for ${storageKey}:`, err);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [storageKey, value, delay, serialize]);
}

/**
 * Debounced hook to monitor consecutive unexcused student absences (3+).
 * Runs with O(1) indexed lookups and dispatches alerts to academic chairs/advisers.
 */
export function useDebouncedAbsenceMonitor({
  classes,
  enrollments,
  attendanceRecords,
  setNotifications,
  delay = 500
}: {
  classes: ClassSession[];
  enrollments: Enrollment[];
  attendanceRecords: AttendanceRecord[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  delay?: number;
}) {
  React.useEffect(() => {
    if (classes.length === 0 || enrollments.length === 0 || attendanceRecords.length === 0) return;

    const debounceTimer = setTimeout(() => {
      try {
        const alertedMap: Record<string, number> = JSON.parse(safeStorage.getItem('cp_consecutive_absence_alerts') || '{}');
        const now = Date.now();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const newAlerts: AppNotification[] = [];
        const newDispatches: any[] = [];

        // Build fast attendance lookup index
        const studentRecordMap = new Map<string, AttendanceRecord[]>();
        attendanceRecords.forEach(r => {
          const rEmail = (r as any).studentEmail;
          const keys = [
            `${r.classId}_${r.studentId}`,
            `${r.classId}_${r.studentName}`,
            rEmail ? `${r.classId}_${rEmail}` : ''
          ].filter(Boolean);
          keys.forEach(k => {
            if (!studentRecordMap.has(k)) studentRecordMap.set(k, []);
            studentRecordMap.get(k)!.push(r);
          });
        });

        // Fast class lookup index
        const classMap = new Map<string, ClassSession>();
        classes.forEach(c => classMap.set(c.id, c));

        enrollments.forEach(enr => {
          if (enr.deletedByStudent) return;
          const matchedClass = classMap.get(enr.classId);
          if (!matchedClass) return;

          // Retrieve student records
          const studentRecords = studentRecordMap.get(`${enr.classId}_${enr.studentId}`) ||
                                 studentRecordMap.get(`${enr.classId}_${enr.studentName}`) ||
                                 (enr.studentEmail ? studentRecordMap.get(`${enr.classId}_${enr.studentEmail}`) : null) || [];

          if (studentRecords.length === 0) return;

          // Sort descending by date
          const sorted = [...studentRecords].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          let consecutiveAbs = 0;
          for (const r of sorted) {
            if (r.status === 'absent') {
              consecutiveAbs++;
            } else if (r.status === 'excused') {
              continue;
            } else {
              break;
            }
          }

          if (consecutiveAbs >= 3) {
            const alertKey = `${enr.studentId || enr.studentName}_${matchedClass.id}_3abs`;
            const lastAlerted = alertedMap[alertKey] || 0;

            // Check if alerted within last 24 hours
            if (now - lastAlerted > ONE_DAY_MS) {
              alertedMap[alertKey] = now;

              const notif: AppNotification = {
                id: 'notif-3abs-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                title: `⚠️ 3 Consecutive Absences: ${enr.studentName || 'Student'}`,
                message: `Early Warning Policy: ${enr.studentName || 'Student'} has accumulated ${consecutiveAbs} consecutive unexcused absences in ${matchedClass.code} (${matchedClass.name}). Alert dispatched to Academic Adviser & Department Chair.`,
                timestamp: 'Just Now',
                type: 'alert',
                read: false
              };
              newAlerts.push(notif);

              const emailDispatch = {
                id: 'email-auto-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                studentId: enr.studentId || 'STU-OFFICIAL',
                studentName: enr.studentName || 'Student Candidate',
                studentEmail: enr.studentEmail || `${enr.studentId || 'student'}@msumain.edu.ph`,
                classCode: matchedClass.code,
                className: matchedClass.name,
                attendanceRate: Math.round(((sorted.filter(r => r.status === 'present' || r.status === 'late').length) / (sorted.length || 1)) * 100),
                advisorEmail: 'cics.academic.adviser@msumain.edu.ph',
                departmentChairEmail: 'cics.deptchair@msumain.edu.ph',
                dispatchedAt: new Date().toLocaleString(),
                status: 'Delivered',
                subject: `⚠️ AUTOMATED ATTENDANCE ALERT: 3 Consecutive Absences - ${enr.studentName} in ${matchedClass.code}`,
                body: `OFFICIAL MSU EARLY INTERVENTION NOTICE\n\nStudent: ${enr.studentName} (${enr.studentId || 'ID Pending'})\nSubject: ${matchedClass.code} - ${matchedClass.name}\nConsecutive Unexcused Absences: ${consecutiveAbs}\n\nNotice has been automatically routed to the Academic Adviser and Department Chair for immediate student counseling and intervention under MSU Academic Attendance Guidelines.`
              };
              newDispatches.push(emailDispatch);
            }
          }
        });

        if (newAlerts.length > 0) {
          safeStorage.setItem('cp_consecutive_absence_alerts', JSON.stringify(alertedMap));
          setNotifications(prev => [...newAlerts, ...prev]);

          const existingDispatches = JSON.parse(safeStorage.getItem('classpulse_dispatched_emails') || '[]');
          safeStorage.setItem('classpulse_dispatched_emails', JSON.stringify([...newDispatches, ...existingDispatches]));

          if (typeof window !== 'undefined' && (window as any).showToast) {
            (window as any).showToast(`⚠️ Automated Absence Monitor: ${newAlerts.length} student(s) flagged with 3+ consecutive absences. Alerts dispatched.`, "warning");
          }
        }
      } catch (e) {
        console.error("Error running automated absence monitor:", e);
      }
    }, delay);

    return () => clearTimeout(debounceTimer);
  }, [attendanceRecords, enrollments, classes, delay, setNotifications]);
}

/**
 * Debounced hook to calculate room occupancy and status based on active classes and enrollments
 */
export function useDebouncedLabRoomOccupancy({
  classes,
  enrollments,
  setLabRooms,
  delay = 300
}: {
  classes: ClassSession[];
  enrollments: Enrollment[];
  setLabRooms: React.Dispatch<React.SetStateAction<LabRoom[]>>;
  delay?: number;
}) {
  React.useEffect(() => {
    if (classes.length === 0 && enrollments.length === 0) return;

    const timer = setTimeout(() => {
      setLabRooms(prevRooms => {
        let changed = false;
        const updated = prevRooms.map(rm => {
          if (rm.status === 'maintenance') {
            return rm;
          }
          
          const rmNameNorm = (rm.name || '').toLowerCase().trim();
          const matchingClasses = classes.filter(cls => {
            const clsRoom = (cls.tempRoom || cls.room || '').toLowerCase().trim();
            return clsRoom && (clsRoom === rmNameNorm || clsRoom.includes(rmNameNorm) || rmNameNorm.includes(clsRoom));
          });

          // Calculate total active enrolled students in this room
          const enrolledCount = enrollments.filter(e => {
            if (e.deletedByStudent) return false;
            return matchingClasses.some(c => c.id === e.classId);
          }).length;

          const activeClassLabel = matchingClasses.length > 0 ? matchingClasses.map(c => c.code).join(', ') : '';
          const isOccupied = enrolledCount > 0 || activeClassLabel !== '';
          const newStatus = isOccupied ? 'occupied' : 'available';

          if (rm.currentOccupancy !== enrolledCount || rm.activeClass !== activeClassLabel || rm.status !== newStatus) {
            changed = true;
            return {
              ...rm,
              currentOccupancy: enrolledCount,
              activeClass: activeClassLabel,
              status: newStatus as 'occupied' | 'available'
            };
          }
          return rm;
        });

        return changed ? updated : prevRooms;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [classes, enrollments, delay, setLabRooms]);
}

/**
 * Debounced hook to track laboratory room status changes and dispatch room alert notifications
 */
export function useDebouncedRoomStatusAlerts({
  labRooms,
  classes,
  accessibility,
  prevLabRoomsRef,
  setNotifications,
  delay = 200
}: {
  labRooms: LabRoom[];
  classes: ClassSession[];
  accessibility: AccessibilityConfig;
  prevLabRoomsRef: React.MutableRefObject<Record<string, 'occupied' | 'available' | 'maintenance'>>;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  delay?: number;
}) {
  React.useEffect(() => {
    if (labRooms.length === 0) return;

    // A. Initialize prevLabRoomsRef on mounting
    if (Object.keys(prevLabRoomsRef.current).length === 0) {
      const initialMap: Record<string, 'occupied' | 'available' | 'maintenance'> = {};
      labRooms.forEach(rm => {
        initialMap[rm.id] = rm.status;
      });
      prevLabRoomsRef.current = initialMap;
      return;
    }

    const timer = setTimeout(() => {
      // B. Check for status transitions
      labRooms.forEach(rm => {
        const prevStatus = prevLabRoomsRef.current[rm.id];
        if (prevStatus !== undefined && prevStatus !== rm.status) {
          // Find classes that are in this laboratory room
          const affectedClasses = classes.filter(cls => {
            const clsRoomLower = (cls.room || '').toLowerCase().trim();
            const rmNameLower = (rm.name || '').toLowerCase().trim();
            const tempRoomLower = cls.tempRoom ? cls.tempRoom.toLowerCase().trim() : '';

            return (
              rmNameLower.includes(clsRoomLower) ||
              clsRoomLower.includes(rmNameLower) ||
              (tempRoomLower && (rmNameLower.includes(tempRoomLower) || tempRoomLower.includes(rmNameLower)))
            );
          });

          if (affectedClasses.length > 0) {
            // Identify unique faculty members affected
            const uniqueFacultyMap = new Map<string, { id: string; name: string }>();
            affectedClasses.forEach(cls => {
              if (cls.facultyId) {
                uniqueFacultyMap.set(cls.facultyId, { id: cls.facultyId, name: cls.facultyName });
              }
            });

            uniqueFacultyMap.forEach((fac) => {
              const newNotif: AppNotification = {
                id: 'notif-room-alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                title: `Room Alert: ${rm.name} Status Change`,
                message: `Attention Instructor ${fac.name}: The laboratory room "${rm.name}" assigned under your course schedule has been updated from "${prevStatus}" to "${rm.status}". Please adapt your physical terminal coordinates or syllabus if required.`,
                timestamp: 'Just Now',
                type: 'alert',
                read: false
              };

              setNotifications(prev => {
                if (prev.some(n => n.title === newNotif.title && n.message === newNotif.message)) {
                  return prev;
                }
                return [newNotif, ...prev];
              });

              // Trigger real device pop-up screen notification & sound alarm
              triggerClassAlarmNotification({
                title: `🏢 Room Update: ${rm.name} is now ${rm.status.toUpperCase()}`,
                message: `Assigned course room "${rm.name}" changed from ${prevStatus} to ${rm.status}. Tap to view schedule.`,
                room: rm.name,
                type: 'room_change',
                screen: 'schedule'
              }).catch(() => {});

              speakText(`Push Alert: Laboratory room "${rm.name}" is now "${rm.status}".`, accessibility.readAloud);
              
              if (typeof window !== 'undefined' && (window as any).showToast) {
                (window as any).showToast(`Status Alert sent to faculty ${fac.name} for room ${rm.name}`, "info");
              }
            });
          }
        }
        prevLabRoomsRef.current[rm.id] = rm.status;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [labRooms, classes, accessibility.readAloud, delay, prevLabRoomsRef, setNotifications]);
}
