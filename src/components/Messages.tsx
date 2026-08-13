import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, ClassSession, Enrollment } from '../types';
import { 
  Send, 
  MessageSquare, 
  Sparkles, 
  Paperclip, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  FileText, 
  Download, 
  X, 
  Smile, 
  User, 
  ExternalLink,
  Bot,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  RefreshCw,
  LifeBuoy,
  MessageSquarePlus,
  HelpCircle,
  PlusCircle
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { motion, AnimatePresence } from 'motion/react';
import { listenToMessages, saveMessageToFirestore } from '../lib/firestoreSync';

interface MessagesProps {
  userProfile: UserProfile;
  classes: ClassSession[];
  enrollments: Enrollment[];
  accessibility: { theme: 'light' | 'dark'; readAloud: boolean };
  onBack?: () => void;
  mode?: 'private' | 'tickets';
  setScreen?: (screen: string) => void;
  initialContactId?: string | { id: string; name?: string; ts?: number };
  isOffline?: boolean;
}

interface EnrichedChatMessage extends ChatMessage {
  attachmentImg?: string;
  attachmentLink?: { url: string; title: string; desc: string };
  attachmentFile?: { name: string; size: string };
}

const ALL_CAMPUS_PEOPLE = [
  { id: '2023-10492', name: 'John Doe', role: 'student', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150', dept: 'ComSci', email: 'john.doe@msu.edu.ph' },
  { id: '2023-88211', name: 'Alice Vance', role: 'student', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150', dept: 'Engineering', email: 'alice.vance@msu.edu.ph' },
  { id: '2023-99124', name: 'Bob Smith', role: 'student', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150', dept: 'Information Tech', email: 'bob.smith@msu.edu.ph' },
  { id: '2023-77215', name: 'Charlie Dean', role: 'student', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150', dept: 'ComSci', email: 'charlie.dean@msu.edu.ph' },
  { id: '2023-33491', name: 'Diana Ross', role: 'student', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150', dept: 'Nursing', email: 'diana.ross@msu.edu.ph' },
  { id: 'fac-1', name: 'Dr. Ahmad Khan', role: 'faculty', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150', dept: 'Information Technology', email: 'ahmad.khan@msu.edu.ph' },
  { id: 'admin-01', name: 'Master Admin', role: 'admin', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150', dept: 'Registrar Board', email: 'admin@msu.edu.ph' }
];

export const getDynamicCampusPeople = (userRole?: string, userId?: string, userName?: string, userAvatar?: string, userEmail?: string) => {
  let registeredList: any[] = [];
  try {
    registeredList = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
  } catch {
    // ignore
  }

  // Filter static campus people: remove unregistered admins
  const staticToMap = ALL_CAMPUS_PEOPLE.filter(p => {
    if (p.role === 'admin') {
      const isRegistered = registeredList.some((u: any) => 
        u.role === 'admin' && (
          u.id === p.id || 
          u.uid === p.id || 
          (u.email && p.email && u.email.toLowerCase() === p.email.toLowerCase())
        )
      );
      const isCurrentAdmin = userRole === 'admin' && (
        (userId && p.id === userId) || 
        (userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase())
      );
      if (!isRegistered && !isCurrentAdmin) {
        return false;
      }
    }
    if (userRole !== 'admin' && p.role === 'admin') {
      return false;
    }
    return true;
  });

  const mappedStatic = staticToMap.map(p => {
    const matchedReg = registeredList.find((u: any) => 
      u.id === p.id || 
      u.uid === p.id ||
      (p.role === 'admin' && u.role === 'admin' && u.email && p.email && u.email.toLowerCase() === p.email.toLowerCase()) ||
      (p.role === 'faculty' && u.role === 'faculty' && p.id === 'fac-1' && u.email === 'ahmad.khan@msu.edu.ph') ||
      (p.role === 'student' && p.id === '2023-10492' && u.email === 'john.doe@msu.edu.ph')
    );

    const isCurrentUser = (userId && p.id === userId) || 
                         (userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase()) ||
                         (!userEmail && userRole && p.role === userRole && userRole === 'student' && p.id === '2023-10492') ||
                         (!userEmail && p.role === 'faculty' && p.id === 'fac-1' && userRole === 'faculty');

    let currentAvatar = p.avatar;
    let currentName = p.name;

    if (isCurrentUser) {
      currentAvatar = userAvatar !== undefined ? userAvatar : p.avatar;
      currentName = userName || p.name;
    } else if (matchedReg) {
      currentAvatar = matchedReg.avatar !== undefined ? matchedReg.avatar : p.avatar;
      currentName = matchedReg.name;
    }

    return {
      ...p,
      name: currentName,
      avatar: currentAvatar
    };
  });

  const result = [...mappedStatic];
  registeredList.forEach((r: any) => {
    if (userRole !== 'admin' && r.role === 'admin') {
      return;
    }
    const rId = r.id || r.uid;
    const exists = result.some(p => p.id === rId || p.id === r.uid || p.id === r.id || (r.email && p.email && r.email.toLowerCase() === p.email.toLowerCase()));
    if (!exists) {
      const isCurrentUser = (userId && (r.id === userId || r.uid === userId)) ||
                           (userEmail && r.email && r.email.toLowerCase() === userEmail.toLowerCase());
      result.push({
        id: rId,
        name: isCurrentUser && userName ? userName : r.name,
        role: r.role,
        avatar: isCurrentUser && userAvatar !== undefined ? userAvatar : (r.avatar || ''),
        email: r.email,
        dept: r.department || (r.role === 'faculty' ? 'College Staff' : r.role === 'admin' ? 'Registrar' : 'CCS Student')
      });
    }
  });

  // If user is admin, ensure current admin is included in people list
  if (userRole === 'admin') {
    const myAdminId = userId || 'admin-cur';
    const exists = result.some(p => 
      p.id === myAdminId || 
      (userEmail && p.email && p.email.toLowerCase() === userEmail.toLowerCase()) ||
      (userName && p.name && p.name.toLowerCase() === userName.toLowerCase() && p.role === 'admin')
    );
    if (!exists) {
      result.push({
        id: myAdminId,
        name: userName || 'Administrator',
        role: 'admin',
        avatar: userAvatar || '',
        email: userEmail || 'admin@msu.edu.ph',
        dept: 'Registrar Board'
      });
    }
  }

  return result;
};

export default function Messages({ userProfile, classes, enrollments, accessibility, onBack, mode, setScreen, initialContactId, isOffline: propIsOffline }: MessagesProps) {
  const isOfflineMode = propIsOffline ?? (typeof window !== 'undefined' && localStorage.getItem('cp_offline') === 'true');

  const myId = userProfile.id || (userProfile as any).uid || (userProfile.role === 'student' 
    ? (userProfile.studentId || '2023-10492') 
    : userProfile.role === 'faculty' 
      ? (userProfile.facultyId || 'fac-1') 
      : 'admin-cur');

  const isUserOffline = (contactObj: any) => {
    if (!contactObj) return true;
    if (contactObj.isChannel) return false;

    // Check if contact explicitly has status 'offline', 'unavailable', or isOffline === true, or isOnline === false
    if (contactObj.status === 'offline' || contactObj.isOffline === true || contactObj.isOnline === false || contactObj.status === 'unavailable') {
      return true;
    }

    // Check self
    const isSelf = contactObj.id === myId || 
                   (userProfile.email && contactObj.email && contactObj.email.toLowerCase() === userProfile.email.toLowerCase()) ||
                   (userProfile.name && contactObj.name && contactObj.name.toLowerCase() === userProfile.name.toLowerCase());

    if (isSelf) {
      return isOfflineMode;
    }

    // If whole app is operating offline, non-self contacts are offline
    if (isOfflineMode) {
      return true;
    }

    return false;
  };

  const [messages, setMessages] = useState<EnrichedChatMessage[]>(() => {
    const cached = localStorage.getItem('cp_chat_messages_v2');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
    
    // Seed default rich live chat histories
    return [
      {
        id: 'msg-seed-1',
        senderId: 'fac-1',
        senderName: 'Dr. Ahmad Khan',
        senderRole: 'faculty',
        receiverId: '2023-10492',
        receiverName: 'John Doe',
        message: 'Hello class, welcome to MSU Academic Portal! Here are the slides for session #1.',
        timestamp: '10:00 AM',
        read: false
      },
      {
        id: 'msg-seed-2',
        senderId: '2023-10492',
        senderName: 'John Doe',
        senderRole: 'student',
        receiverId: 'CS-101', // Group room
        receiverName: 'Introduction to Computer Science',
        message: 'Has anyone finished compiling the web component blueprint?',
        timestamp: '10:05 AM',
        read: true
      },
      {
        id: 'msg-seed-3',
        senderId: 'sys-pulse',
        senderName: 'System Pulse Bot',
        senderRole: 'admin',
        receiverId: 'CS-101',
        receiverName: 'Introduction to Computer Science',
        message: 'Welcome everyone to the channel! Here is our syllabus for this term. Please review.',
        timestamp: '10:06 AM',
        attachmentFile: { name: 'CS101_Syllabus_Revised.pdf', size: '1.4 MB' },
        read: true
      },
      {
        id: 'msg-seed-4',
        senderId: 'fac-2',
        senderName: 'Prof. Maria Santos',
        senderRole: 'faculty',
        receiverId: '2023-10492',
        receiverName: 'John Doe',
        message: 'Please review the exam guidelines before Friday morning.',
        timestamp: '10:14 AM',
        read: false
      }
    ];
  });

  const [activeContactId, setActiveContactId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');

  // Support Ticket interfaces for admin helpdesk ticketing view
  interface TicketMessage {
    id: string;
    sender: 'user' | 'admin';
    text: string;
    timestamp: string;
  }

  interface SupportTicket {
    id: string;
    category: string;
    subject: string;
    description: string;
    status: 'Open' | 'Resolved' | 'In Progress';
    createdAt: string;
    messages: TicketMessage[];
  }

  interface AdminTicket extends SupportTicket {
    userUid: string;
    userName: string;
    userRole: string;
    userAvatar: string;
  }

  const [adminTickets, setAdminTickets] = useState<AdminTicket[]>(() => {
    if (userProfile.role !== 'admin') return [];
    
    const dynPeople = getDynamicCampusPeople(
      userProfile.role,
      userProfile.id,
      userProfile.name,
      userProfile.avatar
    );

    const loaded: AdminTicket[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cp_support_tickets_')) {
        try {
          const userUid = key.replace('cp_support_tickets_', '');
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          const person = dynPeople.find(p => p.id === userUid);
          list.forEach((t: any) => {
            loaded.push({
              ...t,
              userUid,
              userName: person?.name || 'Academic User',
              userRole: person?.role || 'student',
              userAvatar: person?.avatar || ''
            });
          });
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (loaded.length === 0) {
      return [];
    }

    return loaded;
  });

  const handleUpdateTicketStatus = (ticketId: string, newStatus: 'Open' | 'In Progress' | 'Resolved') => {
    const currentTicket = adminTickets.find(t => t.id === ticketId);
    if (!currentTicket) return;

    const updatedTickets = adminTickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: newStatus };
      }
      return t;
    });

    setAdminTickets(updatedTickets);

    const userKey = `cp_support_tickets_${currentTicket.userUid}`;
    const userTickets = updatedTickets
      .filter(t => t.userUid === currentTicket.userUid)
      .map(({ id, category, subject, description, status, createdAt, messages }) => ({
        id, category, subject, description, status, createdAt, messages
      }));

    localStorage.setItem(userKey, JSON.stringify(userTickets));
    speakText(`Ticket status marked as ${newStatus}`, accessibility.readAloud);
  };

  const handleSendAdminTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContactId) return;

    const currentTicket = adminTickets.find(t => t.id === activeContactId);
    if (!currentTicket) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'admin' as const,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedTickets = adminTickets.map(t => {
      if (t.id === activeContactId) {
        const newMessages = [...t.messages, newMsg];
        return { ...t, messages: newMessages };
      }
      return t;
    });

    setAdminTickets(updatedTickets);

    const userKey = `cp_support_tickets_${currentTicket.userUid}`;
    const userTickets = updatedTickets
      .filter(t => t.userUid === currentTicket.userUid)
      .map(({ id, category, subject, description, status, createdAt, messages }) => ({
        id, category, subject, description, status, createdAt, messages
      }));

    localStorage.setItem(userKey, JSON.stringify(userTickets));
    setInputText('');
    speakText("Admin reply posted successfully.", accessibility.readAloud);
  };
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [extraConversationIds, setExtraConversationIds] = useState<string[]>(() => {
    const cached = localStorage.getItem('classpulse_extra_chats');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error("Error parsing classpulse_extra_chats:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('classpulse_extra_chats', JSON.stringify(extraConversationIds));
  }, [extraConversationIds]);
  
  // Custom attachments states
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [pendingImg, setPendingImg] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ url: string; title: string; desc: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; size: string } | null>(null);

  // Typing indicators
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingPeerName, setTypingPeerName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const ticketMessagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Chat message listener (Firebase Firestore disabled)
  useEffect(() => {
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    if (isOffline) return;

    const unsubscribeMessages = listenToMessages(isOffline, (firestoreMsgs) => {
      if (firestoreMsgs.length > 0) {
        setMessages((prev) => {
          const msgMap = new Map<string, EnrichedChatMessage>();
          prev.forEach(m => msgMap.set(m.id, m));
          
          firestoreMsgs.forEach(fm => {
            const existing = msgMap.get(fm.id);
            if (existing) {
              msgMap.set(fm.id, { ...existing, ...fm });
            } else {
              msgMap.set(fm.id, fm);
            }
          });
          
          return Array.from(msgMap.values()).sort((a, b) => {
            const aNum = parseInt(a.id.replace('msg-', '')) || 0;
            const bNum = parseInt(b.id.replace('msg-', '')) || 0;
            return aNum - bNum;
          });
        });
      }
    });

    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, []);

  // Sync messages
  useEffect(() => {
    localStorage.setItem('cp_chat_messages_v2', JSON.stringify(messages));
    scrollToBottom(false);
  }, [messages]);

  const scrollToBottom = (instant: boolean = false) => {
    try {
      const performScroll = () => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
        if (ticketMessagesContainerRef.current) {
          ticketMessagesContainerRef.current.scrollTop = ticketMessagesContainerRef.current.scrollHeight;
        }
      };

      performScroll();
      // Instant recovery timeout
      setTimeout(() => {
        performScroll();
      }, 30);
      // Late layout expansion recovery smooth timeout
      setTimeout(() => {
        performScroll();
      }, 120);
    } catch (e) {
      console.warn("[ClassPulse] Scroll container error safely skipped:", e);
    }
  };

  // Contacts generation based on student / faculty / admin role
  const getContacts = () => {
    let list: any[] = [];
    const dynPeople = getDynamicCampusPeople(
      userProfile.role,
      userProfile.id || (userProfile as any).uid || (userProfile.role === 'admin' ? 'admin-cur' : userProfile.role === 'faculty' ? 'fac-1' : '2023-10492'),
      userProfile.name,
      userProfile.avatar,
      userProfile.email
    );

    if (userProfile.role === 'student') {
      const teachersMap = new Map();
      classes.forEach(c => {
        const matchedT = dynPeople.find(p => p.id === c.facultyId || p.name === c.facultyName);
        const id = c.facultyId || matchedT?.id || 'fac-1';
        if (!teachersMap.has(id)) {
          teachersMap.set(id, {
            id,
            name: c.facultyName,
            role: 'faculty',
            avatar: matchedT?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
            courseCode: c.code
          });
        }
      });

      // Include all faculty members from dynPeople so student can message any faculty member directly from Live Instructors Directory
      dynPeople.filter(p => p.role === 'faculty').forEach(f => {
        if (!teachersMap.has(f.id)) {
          teachersMap.set(f.id, {
            id: f.id,
            name: f.name,
            role: 'faculty',
            avatar: f.avatar,
            courseCode: f.dept || 'Faculty Member'
          });
        }
      });

      list = Array.from(teachersMap.values());
    } else if (userProfile.role === 'faculty') {
      // Faculty see students
      const facultyId = userProfile.facultyId || 'fac-1';
      const myClasses = classes.filter(c => c.facultyId === facultyId || c.facultyName === userProfile.name);
      const myClassIds = myClasses.map(c => c.id);
      
      const students = enrollments
        .filter(e => myClassIds.includes(e.classId))
        .map(e => {
          const matchedS = dynPeople.find(p => p.id === e.studentId || p.name === e.studentName);
          return {
            id: e.studentId,
            name: e.studentName,
            role: 'student',
            avatar: matchedS?.avatar || e.studentAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
            courseCode: myClasses.find(c => c.id === e.classId)?.code || 'CS-101'
          };
        });
      list = [...students];
    } else if (userProfile.role === 'admin') {
      // Admins see all registered admins including current user!
      const registeredAdmins = dynPeople.filter(p => p.role === 'admin').map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        avatar: p.avatar,
        courseCode: p.dept || 'Registrar Board',
        email: p.email
      }));
      list = [...registeredAdmins];
    }

    // Blend extra conversation contacts dynamically scanned from messages
    const myId = userProfile.id || (userProfile as any).uid || (userProfile.role === 'student' 
      ? (userProfile.studentId || '2023-10492') 
      : userProfile.role === 'faculty' 
        ? (userProfile.facultyId || 'fac-1') 
        : 'admin-cur');

    messages.forEach(m => {
      const isChannel = channels.some(ch => ch.id === m.receiverId);
      if (isChannel) return;

      const otherId = m.senderId === myId ? m.receiverId : (m.receiverId === myId ? m.senderId : null);
      if (otherId && otherId !== myId) {
        if (!list.some(item => item.id === otherId)) {
          const match = dynPeople.find(p => p.id === otherId);
          if (match) {
            if (userProfile.role === 'admin' && match.role !== 'admin') {
              return;
            }
            if (userProfile.role !== 'admin' && match.role === 'admin') {
              return;
            }
            list.push({
              id: match.id,
              name: match.name,
              role: match.role,
              avatar: match.avatar,
              courseCode: match.dept
            });
          } else {
            let registeredList: any[] = [];
            try {
              registeredList = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
            } catch {
              // ignore
            }
            const regUser = registeredList.find((u: any) => u.id === otherId || u.uid === otherId);
            if (regUser) {
              if (userProfile.role === 'admin' && regUser.role !== 'admin') {
                return;
              }
              if (userProfile.role !== 'admin' && regUser.role === 'admin') {
                return;
              }
              list.push({
                id: regUser.id || regUser.uid,
                name: regUser.name,
                role: regUser.role,
                avatar: regUser.avatar || '',
                courseCode: regUser.department || 'Academic Portal'
              });
            } else {
              if (userProfile.role === 'admin') {
                return;
              }
              const otherName = m.senderId === myId ? m.receiverName : m.senderName;
              const otherRole = m.senderId === myId ? 'User' : m.senderRole;
              if (otherRole === 'admin') {
                return;
              }
              list.push({
                id: otherId,
                name: otherName,
                role: otherRole,
                avatar: '',
                courseCode: 'Direct Message'
              });
            }
          }
        }
      }
    });

    extraConversationIds.forEach(id => {
      const match = dynPeople.find(p => p.id === id);
      if (match && !list.some(item => item.id === id)) {
        if (userProfile.role === 'admin' && match.role !== 'admin') {
          return;
        }
        if (userProfile.role !== 'admin' && match.role === 'admin') {
          return;
        }
        list.push({
          id: match.id,
          name: match.name,
          role: match.role,
          avatar: match.avatar,
          courseCode: match.dept
        });
      }
    });

    const initObj = typeof initialContactId === 'object' ? initialContactId : null;
    const initId = initObj ? initObj.id : (typeof initialContactId === 'string' ? initialContactId : undefined);
    const initName = initObj ? initObj.name : undefined;

    if (initId) {
      const exists = list.some(item => 
        item.id === initId || 
        (initName && item.name?.toLowerCase() === initName.toLowerCase()) ||
        (item.id && item.id.replace('fac-0', 'fac-') === initId.replace('fac-0', 'fac-'))
      );
      if (!exists) {
        const matchedP = dynPeople.find(p => p.id === initId || (initName && p.name?.toLowerCase() === initName.toLowerCase()));
        list.push({
          id: matchedP?.id || initId,
          name: initName || matchedP?.name || 'Faculty Member',
          role: matchedP?.role || 'faculty',
          avatar: matchedP?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
          courseCode: matchedP?.dept || 'Faculty Member'
        });
      }
    }

    // Deduplicate
    const seen = new Set();
    return list.filter(el => {
      if (!el || !el.id) return false;
      const duplicate = seen.has(el.id);
      seen.add(el.id);
      return !duplicate;
    });
  };

  const getChannels = () => {
    if (userProfile.role === 'admin') {
      return [];
    }
    if (userProfile.role === 'student') {
      const studentId = userProfile.studentId || '2023-10492';
      const myClassIds = enrollments.filter(e => e.studentId === studentId).map(e => e.classId);
      return classes.filter(c => myClassIds.includes(c.id));
    } else if (userProfile.role === 'faculty') {
      const facultyId = userProfile.facultyId || 'fac-1';
      return classes.filter(c => c.facultyId === facultyId || c.facultyName === userProfile.name);
    } else {
      return [];
    }
  };

  const channels = getChannels();
  const contacts = getContacts();

  const prevInitialContactRef = useRef<any>(null);

  // Set initial contact or channel safely without re-locking on state updates
  useEffect(() => {
    if (prevInitialContactRef.current === initialContactId) return;
    prevInitialContactRef.current = initialContactId;

    const targetObj = typeof initialContactId === 'object' ? initialContactId : null;
    const targetId = targetObj ? targetObj.id : (typeof initialContactId === 'string' ? initialContactId : undefined);
    const targetName = targetObj ? targetObj.name : undefined;

    if (targetId) {
      const match = contacts.find(c => 
        c.id === targetId || 
        (c.name && targetId && c.name.toLowerCase() === targetId.toLowerCase()) ||
        (c.name && targetName && c.name.toLowerCase() === targetName.toLowerCase()) ||
        (c.id && targetId && c.id.replace('-', '') === targetId.replace('-', '')) ||
        (c.id && targetId && c.id.replace('fac-0', 'fac-') === targetId.replace('fac-0', 'fac-'))
      );
      if (match) {
        setActiveContactId(match.id);
      } else {
        setActiveContactId(targetId);
      }
      setMobileShowChat(true);
    } else {
      setMobileShowChat(false);
      if (userProfile.role === 'admin') {
        if (mode === 'tickets') {
          if (!activeContactId && adminTickets && adminTickets.length > 0) {
            setActiveContactId(adminTickets[0].id);
          }
        } else {
          if (!activeContactId) {
            if (channels.length > 0) {
              setActiveContactId(channels[0].id);
            } else if (contacts.length > 0) {
              setActiveContactId(contacts[0].id);
            }
          }
        }
      } else {
        if (!activeContactId) {
          if (channels.length > 0) {
            setActiveContactId(channels[0].id);
          } else if (contacts.length > 0) {
            setActiveContactId(contacts[0].id);
          }
        }
      }
    }
  }, [initialContactId, contacts, channels, adminTickets, userProfile.role, mode]);

  // Automatically scroll chat container to original position (bottom) and reset texts/attachments when switching active contacts
  useEffect(() => {
    if (activeContactId) {
      scrollToBottom(true);
      setInputText('');
      setUserSearchText('');
      setPendingImg(null);
      setPendingLink(null);
      setPendingFile(null);
      setShowAttachmentMenu(false);
    }
  }, [activeContactId]);

  // Helper to count unread messages for a specific room or contact
  const getUnreadCount = (id: string) => {
    return messages.filter(m => {
      if (m.senderId === myId) return false;
      const isForThisRoom = m.receiverId === id;
      const isDirectForMe = m.senderId === id && m.receiverId === myId;
      return (isForThisRoom || isDirectForMe) && !m.read;
    }).length;
  };

  // Mark all messages as read for active contact / channel
  useEffect(() => {
    if (!activeContactId) return;
    
    setMessages(prev => {
      let changed = false;
      const updated = prev.map(m => {
        const isFromActiveOther = m.senderId === activeContactId && m.receiverId === myId;
        const isForActiveChannel = m.receiverId === activeContactId && m.senderId !== myId;
        if ((isFromActiveOther || isForActiveChannel) && !m.read) {
          changed = true;
          return { ...m, read: true };
        }
        return m;
      });
      return changed ? updated : prev;
    });
  }, [activeContactId, myId]);

  // ACTIVE RECURRENT LIVE CHAT SIMULATION - Completely disabled to prevent automated interruptions
  useEffect(() => {
    // Disabled as requested: "don't automate response make it like message app wait if the receiver/user response."
    return () => {};
  }, [activeContactId, channels, userProfile.name]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingImg && !pendingLink && !pendingFile) || !activeContactId) return;

    const myId = userProfile.role === 'student' 
      ? (userProfile.studentId || '2023-10492') 
      : userProfile.role === 'faculty' 
        ? (userProfile.facultyId || 'fac-1') 
        : (userProfile.id || 'admin-01');
    const isActiveChannel = channels.some(ch => ch.id === activeContactId);
    const destObj = !isActiveChannel 
      ? contacts.find(c => c.id === activeContactId) 
      : channels.find(c => c.id === activeContactId);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: EnrichedChatMessage = {
      id: 'msg-' + Date.now(),
      senderId: myId,
      senderName: userProfile.name,
      senderRole: userProfile.role,
      receiverId: activeContactId,
      receiverName: destObj?.name || activeMeta?.name || 'Academic Group',
      message: inputText.trim() || (pendingImg ? "Shared an image" : pendingFile ? "Shared a file" : "Shared a link"),
      timestamp: nowStr,
      attachmentImg: pendingImg || undefined,
      attachmentLink: pendingLink || undefined,
      attachmentFile: pendingFile || undefined
    };

    setMessages(prev => [...prev, newMsg]);
    const isOffline = localStorage.getItem('cp_offline') === 'true';
    saveMessageToFirestore(isOffline, newMsg).catch(err => console.error("Firestore message send error:", err));

    // Reset inputs & attachments
    setInputText('');
    setPendingImg(null);
    setPendingLink(null);
    setPendingFile(null);
    setShowAttachmentMenu(false);

    speakText("Message transmitted.", accessibility.readAloud);
  };

  // Preset loaders for mockup attachments
  const attachPresetImage = (type: 'lab' | 'library' | 'campus') => {
    const urls = {
      lab: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400',
      library: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=400',
      campus: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=400'
    };
    setPendingImg(urls[type]);
    setPendingLink(null);
    setPendingFile(null);
    setShowAttachmentMenu(false);
    speakText("Preset college image prepared for attachment.", accessibility.readAloud);
  };

  const attachPresetLink = () => {
    setPendingLink({
      url: 'https://github.com/varsity-hub/react-vite-blueprint',
      title: 'Vite React Tailwind Starter Framework',
      desc: 'Optimized full-stack architecture for university dashboards and real-time calendars.'
    });
    setPendingImg(null);
    setPendingFile(null);
    setShowAttachmentMenu(false);
    speakText("Resource web bookmark attached.", accessibility.readAloud);
  };

  const attachPresetFile = (fileName: string, fileSize: string) => {
    setPendingFile({ name: fileName, size: fileSize });
    setPendingImg(null);
    setPendingLink(null);
    setShowAttachmentMenu(false);
    speakText("Syllabus resource file attached.", accessibility.readAloud);
  };

  const dynPeopleForSearch = getDynamicCampusPeople(
    userProfile.role,
    userProfile.id || (userProfile as any).uid || (userProfile.role === 'admin' ? 'admin-cur' : userProfile.role === 'faculty' ? 'fac-1' : '2023-10492'),
    userProfile.name,
    userProfile.avatar,
    userProfile.email
  );

  const getActiveMetadata = () => {
    const ch = channels.find(c => c.id === activeContactId);
    if (ch) {
      return { 
        id: ch.id, 
        name: ch.name, 
        isChannel: true, 
        code: ch.code, 
        courseCode: ch.code 
      };
    }
    const co = contacts.find(c => 
      c.id === activeContactId || 
      (c.name && activeContactId && c.name.toLowerCase() === activeContactId.toLowerCase()) ||
      (c.id && activeContactId && c.id.replace('-', '') === activeContactId.replace('-', '')) ||
      (c.id && activeContactId && c.id.replace('fac-0', 'fac-') === activeContactId.replace('fac-0', 'fac-'))
    );
    if (co) {
      return { 
        id: co.id, 
        name: co.name, 
        isChannel: false, 
        avatar: co.avatar, 
        role: co.role, 
        courseCode: co.courseCode 
      };
    }
    const person = dynPeopleForSearch.find(p => 
      p.id === activeContactId || 
      (p.name && activeContactId && p.name.toLowerCase() === activeContactId.toLowerCase()) ||
      (p.id && activeContactId && p.id.replace('-', '') === activeContactId.replace('-', '')) ||
      (p.id && activeContactId && p.id.replace('fac-0', 'fac-') === activeContactId.replace('fac-0', 'fac-'))
    );
    if (person) {
      return {
        id: person.id,
        name: person.name,
        isChannel: false,
        avatar: person.avatar,
        role: person.role,
        courseCode: person.dept || 'Faculty Member'
      };
    }
    return null;
  };

  const activeMeta = getActiveMetadata();

  // Filter messages for current discussion
  const isActiveChannel = channels.some(ch => ch.id === activeContactId);
  
  const currentMessages = messages.filter(m => {
    if (!isActiveChannel) {
      const isTargetSender = m.senderId === activeContactId || (activeMeta?.id && m.senderId === activeMeta.id) || (activeMeta?.name && m.senderName === activeMeta.name);
      const isTargetReceiver = m.receiverId === activeContactId || (activeMeta?.id && m.receiverId === activeMeta.id) || (activeMeta?.name && m.receiverName === activeMeta.name);
      return (m.senderId === myId && isTargetReceiver) || (isTargetSender && m.receiverId === myId);
    } else {
      return m.receiverId === activeContactId;
    }
  });

  const displayMessages = currentMessages;
  const isGoogleChatActive = false;

  // Filter channels & contacts with userSearchText
  const filteredChannels = channels.filter(ch => 
    (ch.name || '').toLowerCase().includes(userSearchText.toLowerCase()) || 
    (ch.code || '').toLowerCase().includes(userSearchText.toLowerCase())
  );

  const filteredContacts = contacts.filter(co => 
    (co.name || '').toLowerCase().includes(userSearchText.toLowerCase()) || 
    (co.courseCode && co.courseCode.toLowerCase().includes(userSearchText.toLowerCase()))
  );

  const searchResultsGlobal = userSearchText.trim() ? dynPeopleForSearch.filter(person => {
    // Admin can ONLY search/contact fellow admins
    if (userProfile.role === 'admin' && person.role !== 'admin') {
      return false;
    }
    // Non-admins (regular users / students / faculty) cannot search or contact any admin users
    if (userProfile.role !== 'admin' && person.role === 'admin') {
      return false;
    }
    const isMatch = (person.name || '').toLowerCase().includes(userSearchText.toLowerCase()) || 
                    (person.dept || '').toLowerCase().includes(userSearchText.toLowerCase());
    const alreadyConnected = contacts.some(co => co.id === person.id) || channels.some(ch => ch.id === person.id);
    return isMatch && !alreadyConnected;
  }) : [];

  const renderSidebar = () => {
    return (
        <div id="messenger-sidebar" className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-200/60 dark:border-zinc-850/60 flex flex-col h-full shrink-0 bg-transparent">
          <div className="p-2.5 border-b border-zinc-150 dark:border-zinc-900 space-y-2">
            {onBack && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-500" />
                </button>
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">ClassPulse Chat</span>
            </div>
          )}

          {/* Compact search bar */}
          <div className="relative">
            <input
              type="text"
              value={userSearchText}
              onChange={(e) => {
                setUserSearchText(e.target.value);
              }}
              placeholder="Search..."
              className="w-full text-xs pl-7 pr-7 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-emerald-500/30 outline-none text-zinc-900 dark:text-zinc-100 font-semibold"
            />
            <span className="absolute left-2 top-2 text-[10px] text-zinc-400">🔍</span>
            {userSearchText && (
              <button
                type="button"
                onClick={() => setUserSearchText('')}
                className="absolute right-2 top-2 p-0.5 text-[8px] font-black text-white bg-zinc-400 dark:bg-zinc-800 rounded-full hover:bg-red-500 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Channels/Contacts Unified Iterator list */}
        <div className="flex-1 overflow-y-auto space-y-4 p-3 text-left">
          
          {/* Active Channels / Subject Groups (Hidden for Admins) */}
          {userProfile.role !== 'admin' && (
            <div>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-2.5 block pb-2">Subject Class Rooms</span>
              {filteredChannels.map(ch => {
                const unreadCount = getUnreadCount(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveContactId(ch.id);
                      setMobileShowChat(true);
                    }}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left border cursor-pointer transition-all mb-1 ${
                      activeContactId === ch.id
                        ? 'bg-zinc-900 dark:bg-zinc-900 text-white border-zinc-900 dark:border-zinc-800 font-extrabold shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        activeContactId === ch.id ? 'bg-zinc-950/20 text-white' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        #
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-extrabold truncate ${activeContactId === ch.id ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{ch.name}</h4>
                        <p className={`text-[9px] truncate uppercase mt-0.5 font-bold ${activeContactId === ch.id ? 'text-zinc-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{ch.code} Room</p>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0 ${
                        activeContactId === ch.id ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'
                      }`}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredChannels.length === 0 && (
                <p className="text-[10px] text-zinc-405 italic px-2.5 py-1">No matching subject rooms</p>
              )}
            </div>
          )}

          {/* Active Conversations */}
          <div>
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-2.5 block pb-2">Direct Chats</span>
            {filteredContacts.map(c => {
              const unreadCount = getUnreadCount(c.id);
              const isMe = c.id === myId || 
                           (c.email && userProfile.email && c.email.toLowerCase() === userProfile.email.toLowerCase()) ||
                           (c.name && userProfile.name && c.name.toLowerCase() === userProfile.name.toLowerCase() && c.role === userProfile.role);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveContactId(c.id);
                    setMobileShowChat(true);
                  }}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left border cursor-pointer transition-all mb-1 ${
                    activeContactId === c.id
                      ? 'bg-zinc-900 dark:bg-zinc-900 text-white border-zinc-900 dark:border-zinc-800 font-extrabold shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-855" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-650 text-white font-extrabold text-xs flex items-center justify-center uppercase border border-zinc-200 dark:border-zinc-855 shadow-inner">
                          {c.name ? c.name[0] : '?'}
                        </div>
                      )}
                      {!isUserOffline(c) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-extrabold truncate flex items-center gap-1.5 ${activeContactId === c.id ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        <span className="truncate">{c.name}</span>
                        {isMe && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                            activeContactId === c.id 
                              ? 'bg-emerald-400 text-black font-extrabold' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}>
                            (You)
                          </span>
                        )}
                      </h4>
                      <p className={`text-[9px] truncate uppercase font-extrabold mt-0.5 ${activeContactId === c.id ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>{c.role} • {c.courseCode}</p>
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0 ${
                      activeContactId === c.id ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            {filteredContacts.length === 0 && (
              <p className="text-[10px] text-zinc-405 italic px-2.5 py-1">No active direct chats matching</p>
            )}
          </div>

          {/* Global Campus Directory Search Matches */}
          {searchResultsGlobal.length > 0 && (
            <div className="pt-2 border-t border-zinc-150 dark:border-zinc-900 animate-fade-in">
              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest px-2.5 block pb-2">Global Directory Matches</span>
              {searchResultsGlobal.map(person => {
                const isPersonMe = person.id === myId ||
                                   (person.email && userProfile.email && person.email.toLowerCase() === userProfile.email.toLowerCase()) ||
                                   (person.name && userProfile.name && person.name.toLowerCase() === userProfile.name.toLowerCase());
                return (
                  <button
                    key={person.id}
                    onClick={() => {
                      if (!extraConversationIds.includes(person.id)) {
                        setExtraConversationIds(prev => [...prev, person.id]);
                      }
                      setActiveContactId(person.id);
                      setMobileShowChat(true);
                      setUserSearchText('');
                      speakText(`Starting new conversation with ${person.name}`, accessibility.readAloud);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-emerald-500/10 text-zinc-900 dark:text-zinc-100 cursor-pointer transition-all mb-1 border border-dashed border-emerald-500/20 bg-emerald-500/5"
                  >
                    <div className="relative shrink-0">
                      {person.avatar ? (
                        <img src={person.avatar} alt={person.name} className="w-9 h-9 rounded-full object-cover border border-emerald-500/30" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-550 text-white font-extrabold text-xs flex items-center justify-center uppercase border border-emerald-500/30 shrink-0">
                          {person.name ? person.name[0] : '?'}
                        </div>
                      )}
                      {!isUserOffline(person) && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        <span className="truncate">{person.name}</span>
                        {isPersonMe && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                            (You)
                          </span>
                        )}
                      </h4>
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{person.role} • {person.dept}</p>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-bold font-mono">Chat+</span>
                </button>
              );
            })}
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderChatArea = () => {
    return (
      <div className="flex-1 flex flex-col h-full min-w-0 p-2.5 sm:p-3 bg-transparent">
        
        {activeMeta ? (
          activeMeta.role === 'admin' && userProfile.role !== 'admin' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-zinc-950 animate-fade-in h-full">
              <div className="max-w-md space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <LifeBuoy className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">Connect with Administrator</h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium leading-relaxed">
                    Direct messaging to system administrators is disabled for institutional audit compliance. To contact <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{activeMeta.name}</span> or raise support issues, please submit an official assistance ticket in our Help Center.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-zinc-250 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900/30 flex items-start gap-3 text-left">
                  <span className="text-sm">🎫</span>
                  <div>
                    <h5 className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Support Desk Monitored</h5>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-550 mt-0.5 leading-relaxed">Tickets generate real-time alerts for all campus registrars, guaranteeing swift official response times for all inquiries.</p>
                  </div>
                </div>
                {setScreen && (
                  <button
                    type="button"
                    onClick={() => {
                      speakText("Opening Help Center to submit support ticket", accessibility.readAloud);
                      setScreen('help-center');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all hover:scale-102 active:scale-98 shadow-md cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-black" />
                    <span>Submit support ticket</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
            {/* Compact Header user details */}
            <div className="pb-2 border-b border-zinc-200/60 dark:border-zinc-850/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {(isMobile || mobileShowChat) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileShowChat(false);
                      speakText("Back to chat list", accessibility.readAloud);
                    }}
                    className="lg:hidden p-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 mr-1 shrink-0 animate-fade-in"
                    title="Go back to list"
                  >
                    <ArrowLeft className="w-4 h-4 text-emerald-500" />
                  </button>
                )}
                {!(activeMeta as any).isChannel ? (
                  <div className="relative shrink-0">
                    {(activeMeta as any).avatar ? (
                      <img 
                        src={(activeMeta as any).avatar} 
                        alt={activeMeta.name} 
                        className="w-8 h-8 rounded-full object-cover border border-emerald-500/20"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-650 text-white font-extrabold text-xs flex items-center justify-center uppercase border border-emerald-500/20 shadow-2xs">
                        {activeMeta.name ? activeMeta.name[0] : '?'}
                      </div>
                    )}
                    {!isUserOffline(activeMeta) && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-zinc-950" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm shrink-0">
                    #
                  </div>
                )}
                <div className="text-left min-w-0">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                    <span className="truncate">{activeMeta.name}</span>
                    {activeMeta && !(activeMeta as any).isChannel && (
                      activeMeta.id === myId ||
                      ((activeMeta as any).email && userProfile.email && (activeMeta as any).email.toLowerCase() === userProfile.email.toLowerCase()) ||
                      (activeMeta.name && userProfile.name && activeMeta.name.toLowerCase() === userProfile.name.toLowerCase())
                    ) && (
                      <span className="text-[8px] font-black px-1 py-0.2 rounded uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        (You)
                      </span>
                    )}
                  </h3>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold truncate">
                    {!(activeMeta as any).isChannel 
                      ? `Direct Chat` 
                      : `Class Room`}
                  </p>
                </div>
              </div>
                         {/* Header Action Panel status indicator */}
              <div className="flex items-center gap-2">
                <div className={`hidden sm:flex items-center gap-1.5 font-mono text-[9px] uppercase font-bold px-2.5 py-1 rounded-xl ${
                  isGoogleChatActive ? 'text-sky-500 bg-sky-500/10' : 'text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-910'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isGoogleChatActive ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                  {isGoogleChatActive ? 'Workspace Live' : 'Live Sync'}
                </div>
              </div>
            </div>

            {/* Chat message bubbles scroll container */}
            <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 pr-1">
              {displayMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400 dark:text-zinc-650 space-y-2">
                  <MessageSquare className="w-10 h-10 text-emerald-500/30" />
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Open Classroom Collaboration Chain</p>
                  <p className="text-[10px] max-w-xs text-zinc-405 leading-relaxed">No messages in local ledger. Send a quick inquiry or attach files for instant peer coordination.</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {displayMessages.map(m => {
                    const isMe = (m as any).isMeOverride !== undefined ? (m as any).isMeOverride : m.senderId === myId;
                    return (
                      <motion.div 
                        key={m.id} 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Name and timestamp header */}
                        <div className="flex items-center gap-1.5 px-1 bg-transparent">
                          <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">{m.senderName}</span>
                          <span className="text-[8px] font-mono text-zinc-500/80 dark:text-zinc-400">{m.timestamp}</span>
                        </div>

                        {/* Interactive Message Bubble */}
                        <div className={`p-3.5 rounded-2xl text-[12px] max-w-[85%] text-left space-y-2.5 transition-all outline-none ${
                          isMe
                            ? 'bg-[#03213D] dark:bg-zinc-900 border border-[#03213D]/40 dark:border-zinc-800 text-white rounded-tr-none'
                            : 'bg-emerald-600 border border-emerald-500 text-white rounded-tl-none font-bold shadow-xs'
                        }`}>
                          
                          {/* Inner standard text if available */}
                          {m.message && (
                            <p className="leading-relaxed whitespace-pre-wrap text-white font-medium">{m.message}</p>
                          )}

                          {/* Image Attachment wrapper */}
                          {m.attachmentImg && (
                            <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-w-xs bg-zinc-100 dark:bg-zinc-900 group">
                              <img 
                                src={m.attachmentImg} 
                                alt="Attachment" 
                                className="object-cover w-full max-h-48 transition-transform duration-300 hover:scale-105"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Link Rich Bookmark block */}
                          {m.attachmentLink && (
                            <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-850/80 bg-zinc-50/80 dark:bg-zinc-950/40 space-y-1.5 max-w-xs">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-bold text-emerald-555 flex items-center gap-1 uppercase tracking-wider">
                                  <LinkIcon className="w-3 h-3 text-emerald-500" /> Web Resource
                                </span>
                                <a href={m.attachmentLink.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-emerald-500">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <h5 className="font-bold text-xs truncate text-zinc-900 dark:text-zinc-100">{m.attachmentLink.title}</h5>
                              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{m.attachmentLink.desc}</p>
                              <p className="text-[9px] text-zinc-500 dark:text-zinc-650 truncate font-mono">{m.attachmentLink.url}</p>
                            </div>
                          )}

                          {/* PDF/File Attachment download box */}
                          {m.attachmentFile && (
                            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-850/80 bg-zinc-50 dark:bg-zinc-950/40 flex items-center justify-between gap-4 max-w-xs transition-colors hover:bg-zinc-100/50">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs truncate text-zinc-805 dark:text-zinc-200">{m.attachmentFile.name}</p>
                                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">Size: {m.attachmentFile.size}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  if (typeof window !== 'undefined' && (window as any).showToast) {
                                    (window as any).showToast(`Downloading class resource: ${m.attachmentFile?.name}`, "success");
                                  } else {
                                    alert(`Mock downloading resource file: ${m.attachmentFile?.name}`);
                                  }
                                  speakText(`Beginning secure download for class resource ${m.attachmentFile?.name}`, accessibility.readAloud);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-zinc-500" />
                              </button>
                            </div>
                          )}

                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Typing indicator simulator */}
              {isPeerTyping && (
                <div className="flex items-center gap-2 text-zinc-400 px-1 py-1">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{typingPeerName} is drafting...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected pending attachment card summary */}
            {(pendingImg || pendingLink || pendingFile) && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl mb-2 flex items-center justify-between border border-zinc-200 dark:border-zinc-805">
                <div className="flex items-center gap-2.5 min-w-0">
                  {pendingImg && (
                    <>
                      <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">Attached image preview coordinate loaded</p>
                    </>
                  )}
                  {pendingLink && (
                    <>
                      <LinkIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">Attached Link: {pendingLink.title}</p>
                    </>
                  )}
                  {pendingFile && (
                    <>
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">Attached File: {pendingFile.name}</p>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => {
                    setPendingImg(null);
                    setPendingLink(null);
                    setPendingFile(null);
                  }}
                  className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chat inputs and Attachment menu */}
            <div className="relative shrink-0 pb-1 sm:pb-0 bg-white dark:bg-zinc-950 sticky bottom-0 z-20">
              {showAttachmentMenu && (
                <div className="absolute bottom-full left-0 mb-2 p-4 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-855 shadow-xl z-50 w-72 space-y-3.5 text-left animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Academic Attachments Cabinet</span>
                    <button onClick={() => setShowAttachmentMenu(false)} type="button" className="p-1 rounded-lg text-zinc-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  {/* Hidden standard HTML5 upload inputs */}
                  <input
                    type="file"
                    id="chat-file-image-attachment"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setPendingImg(reader.result as string);
                          setPendingLink(null);
                          setPendingFile(null);
                          setShowAttachmentMenu(false);
                          speakText(`Successfully uploaded picture attachment: ${file.name}`, accessibility.readAloud);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  <input
                    type="file"
                    id="chat-file-binary-attachment"
                    accept="*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPendingFile({
                          name: file.name,
                          size: (file.size / (1024 * 1024)).toFixed(2) + " MB"
                        });
                        setPendingImg(null);
                        setPendingLink(null);
                        setShowAttachmentMenu(false);
                        speakText(`Successfully uploaded file attachment: ${file.name}`, accessibility.readAloud);
                      }
                    }}
                  />

                  {/* Option lists */}
                  <div className="space-y-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        document.getElementById('chat-file-image-attachment')?.click();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-350"
                    >
                      <div className="flex items-center gap-3">
                        <ImageIcon className="w-4 h-4 text-pink-500" />
                        <span>Upload Photo File</span>
                      </div>
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">Local</span>
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => {
                        const customUrl = prompt("Enter bookmark hyperlink URL:", "https://");
                        if (customUrl && customUrl.trim()) {
                          const customTitle = prompt("Enter bookmark descriptive title:", "Vite React Document");
                          const customDesc = prompt("Enter short subtitle or note description:", "University academic attachment log.");
                          setPendingLink({
                            url: customUrl.trim(),
                            title: customTitle?.trim() || "Web Bookmark",
                            desc: customDesc?.trim() || "Custom attached resource hyperlink."
                          });
                          setPendingImg(null);
                          setPendingFile(null);
                          setShowAttachmentMenu(false);
                          speakText("Custom web bookmark attached successfully.", accessibility.readAloud);
                        }
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-350"
                    >
                      <div className="flex items-center gap-3">
                        <LinkIcon className="w-4 h-4 text-indigo-500" />
                        <span>Link url Link</span>
                      </div>
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">URL</span>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => {
                        document.getElementById('chat-file-binary-attachment')?.click();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-350"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>Upload Any File</span>
                      </div>
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">FILE</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Input Form */}
              <form onSubmit={handleSendMessage} className="pt-1.5 border-t border-zinc-200/60 dark:border-zinc-850/60 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`h-9 w-9 shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center transition-all cursor-pointer ${
                    showAttachmentMenu ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Attach file or photo"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Message ${activeMeta.name}...`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !pendingImg && !pendingLink && !pendingFile}
                  className="h-9 w-9 shrink-0 font-bold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 dark:text-zinc-650">
            <MessageSquare className="w-12 h-12 stroke-[1.5] mb-3 opacity-50 text-emerald-500 animate-bounce" />
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">No Target Lobby Selected</h4>
            <p className="text-xs opacity-75 max-w-xs mt-1">Select one of your direct class contacts or group rooms in the sidebar index panel to inspect discussions.</p>
          </div>
        )}

      </div>
    );
  };

  const filteredTickets = adminTickets.filter(t =>
    (t.id || '').toLowerCase().includes(userSearchText.toLowerCase()) ||
    (t.subject || '').toLowerCase().includes(userSearchText.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(userSearchText.toLowerCase()) ||
    (t.userName || '').toLowerCase().includes(userSearchText.toLowerCase())
  );

  const renderAdminSidebar = () => {
    return (
      <div 
        id="messenger-sidebar-admin"
        className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-200/60 dark:border-zinc-850/60 flex flex-col h-full shrink-0 bg-transparent"
      >
        <div className="p-4 border-b border-zinc-150 dark:border-zinc-900 space-y-3 p-5">
          {onBack && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-emerald-500 font-mono">Support Desk</h3>
            </div>
          )}

          {/* Ticket searching widget */}
          <div className="relative">
            <input
              type="text"
              value={userSearchText}
              onChange={(e) => setUserSearchText(e.target.value)}
              placeholder="Search tickets, student name..."
              className="w-full text-xs pl-8 pr-8 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-emerald-500/30 outline-none text-zinc-900 dark:text-zinc-100 font-bold"
            />
            <span className="absolute left-2.5 top-3 text-[11px] text-zinc-400">🔍</span>
            {userSearchText && (
              <button
                type="button"
                onClick={() => setUserSearchText('')}
                className="absolute right-2.5 top-2.5 p-1 text-[9px] font-black text-white bg-zinc-400 dark:bg-zinc-800 rounded-full hover:bg-red-500 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Support Tickets list */}
        <div className="flex-1 overflow-y-auto space-y-4 p-3 text-left">
          <div>
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest px-2.5 block pb-2">Active Help Tickets ({filteredTickets.length})</span>
            {filteredTickets.map(t => {
              const isActive = activeContactId === t.id;
              const hasRecentUserMsg = t.messages.length > 0 && t.messages[t.messages.length - 1].sender === 'user';
              
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveContactId(t.id);
                    setMobileShowChat(true);
                  }}
                  className={`w-full flex flex-col gap-2 p-3.5 rounded-2xl text-left border cursor-pointer transition-all mb-2.5 relative ${
                    isActive
                      ? 'bg-zinc-900 dark:bg-zinc-900 text-white border-zinc-900 dark:border-zinc-800 font-bold shadow-md'
                      : 'bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      {t.userAvatar ? (
                        <img 
                          src={t.userAvatar} 
                          alt={t.userName} 
                          className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-650 text-white font-extrabold text-[10px] flex items-center justify-center uppercase border border-zinc-200 dark:border-zinc-800 shrink-0">
                          {t.userName ? t.userName[0] : '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className={`text-xs font-extrabold truncate ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {t.userName}
                        </h4>
                        <p className={`text-[9px] font-semibold uppercase ${isActive ? 'text-zinc-400' : 'text-zinc-450'}`}>
                          {t.userRole} • {t.category}
                        </p>
                      </div>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-black shrink-0 ${
                      t.status === 'Resolved'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : t.status === 'In Progress'
                          ? 'bg-amber-550/10 text-amber-500'
                          : 'bg-red-500/10 text-red-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="w-full pl-0.5">
                    <p className={`text-[11px] font-bold line-clamp-1 ${isActive ? 'text-zinc-200' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {t.subject}
                    </p>
                    <p className={`text-[10px] mt-0.5 truncate font-medium ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {t.messages.length > 0 ? t.messages[t.messages.length - 1].text : t.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[8px] font-mono font-medium text-zinc-450 border-t border-zinc-100/10 pt-1.5 mt-0.5 w-full">
                    <span>CODE: {t.id}</span>
                    <span>{t.createdAt}</span>
                  </div>

                  {hasRecentUserMsg && !isActive && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl mt-4">
                <p className="text-xs text-zinc-405 font-bold uppercase tracking-wider mb-1">No Tickets Found</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">No help center tickets match your search parameters.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminChatArea = () => {
    const selectedTicket = adminTickets.find(t => t.id === activeContactId);
    
    if (!selectedTicket) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400 dark:text-zinc-650 bg-transparent">
          <MessageSquare className="w-12 h-12 stroke-[1.5] mb-3 opacity-50 text-emerald-500 animate-bounce" />
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">No Ticket Selected</h4>
          <p className="text-xs opacity-75 max-w-xs mt-1">Select an active student or faculty help desk ticket from the list to review history and draft replies.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full min-w-0 p-5 bg-transparent">
        
        {/* Active Ticket Header details */}
        <div className="pb-4 border-b border-zinc-200/60 dark:border-zinc-850/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 text-left">
            {(isMobile || mobileShowChat) && (
              <button
                type="button"
                onClick={() => {
                  setMobileShowChat(false);
                  speakText("Back to tickets register", accessibility.readAloud);
                }}
                className="lg:hidden p-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 mr-2 shrink-0 animate-fade-in"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>
            )}
            {selectedTicket.userAvatar ? (
              <img 
                src={selectedTicket.userAvatar} 
                alt={selectedTicket.userName} 
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/20 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-650 text-white font-extrabold text-sm flex items-center justify-center uppercase border-2 border-emerald-500/20 shrink-0">
                {selectedTicket.userName ? selectedTicket.userName[0] : '?'}
              </div>
            )}
            <div className="min-w-0 text-left">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
                {selectedTicket.userName}
                <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded font-black">
                  {selectedTicket.id}
                </span>
              </h3>
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase mt-0.5 truncate">
                {selectedTicket.userRole} • Category: {selectedTicket.category}
              </p>
            </div>
          </div>

          {/* Ticket status controls & action headers */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-[10px] text-zinc-450 uppercase font-black tracking-wider">Status:</span>
            <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
              {(['Open', 'In Progress', 'Resolved'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleUpdateTicketStatus(selectedTicket.id, st)}
                  className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
                    selectedTicket.status === st
                      ? st === 'Resolved'
                        ? 'bg-emerald-500 text-black shadow-xs'
                        : st === 'In Progress'
                          ? 'bg-amber-500 text-black shadow-xs'
                          : 'bg-red-500 text-white shadow-xs'
                      : 'text-zinc-450 hover:text-zinc-850 dark:hover:text-zinc-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Issue Description display at top of chats */}
        <div className="my-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-900 text-left shrink-0">
          <span className="text-[9px] font-extrabold uppercase text-emerald-500 tracking-wider">Original Issue Description:</span>
          <h4 className="text-xs font-black text-zinc-805 dark:text-zinc-200 mt-0.5 mb-1">{selectedTicket.subject}</h4>
          <p className="text-[11px] font-medium leading-relaxed text-zinc-550 dark:text-zinc-400">{selectedTicket.description}</p>
        </div>

        {/* Messages timeline (HelpCenter chat model style) */}
        <div ref={ticketMessagesContainerRef} className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3.5 pr-1 text-left">
          {selectedTicket.messages.map((m, index) => {
            const isAdmin = m.sender === 'admin';
            return (
              <div 
                key={m.id || index}
                className={`flex gap-2.5 w-full max-w-[85%] ${isAdmin ? 'ml-auto flex-row-reverse text-right' : 'self-start text-left'}`}
              >
                {isAdmin ? (
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-[10px] shrink-0 shadow-xs select-none">
                    A
                  </div>
                ) : (
                  selectedTicket.userAvatar ? (
                    <img 
                      src={selectedTicket.userAvatar} 
                      alt={selectedTicket.userName} 
                      className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-100" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-650 text-white font-extrabold text-[10px] flex items-center justify-center uppercase border border-zinc-100 shrink-0">
                      {selectedTicket.userName ? selectedTicket.userName[0] : '?'}
                    </div>
                  )
                )}
                <div>
                  <div className={`p-3 rounded-2xl text-[12px] shadow-xs inline-block text-left ${
                    isAdmin 
                      ? 'bg-zinc-900 text-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-tr-none font-medium' 
                      : 'bg-emerald-600 border border-emerald-500 text-white rounded-tl-none font-semibold'
                  }`}>
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                  <span className="block text-[8px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase font-black tracking-wider px-1">
                    {isAdmin ? 'ADMIN REPLY' : 'USER'} • {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area for Admin message reply */}
        <div className="pt-2.5 border-t border-zinc-200/60 dark:border-zinc-850/60 shrink-0 pb-1 sm:pb-0 bg-white dark:bg-zinc-950 sticky bottom-0 z-20">
          <form onSubmit={handleSendAdminTicketReply} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Type a reply to ${selectedTicket.userName}...`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-205 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans shadow-inner font-bold"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="h-10 px-5 font-bold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm text-xs uppercase tracking-wider"
            >
              <span>Reply</span>
            </button>
          </form>
        </div>

      </div>
    );
  };

  return (
    <div 
      id="messages-messenger-container"
      className="p-0 bg-transparent flex flex-col lg:flex-row flex-1 h-full min-h-0 w-full overflow-hidden text-left relative z-10 animate-fade-in"
    >
      {isMobile ? (
        <AnimatePresence mode="wait">
          {!mobileShowChat ? (
            <motion.div
              key="sidebar-pane"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col"
            >
              {userProfile.role === 'admin' && mode === 'tickets' ? renderAdminSidebar() : renderSidebar()}
            </motion.div>
          ) : (
            <motion.div
              key="chat-pane"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col"
            >
              {userProfile.role === 'admin' && mode === 'tickets' ? renderAdminChatArea() : renderChatArea()}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <>
          {userProfile.role === 'admin' && mode === 'tickets' ? renderAdminSidebar() : renderSidebar()}
          {userProfile.role === 'admin' && mode === 'tickets' ? renderAdminChatArea() : renderChatArea()}
        </>
      )}
    </div>
  );
}
