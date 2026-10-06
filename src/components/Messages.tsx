import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, ClassSession, Enrollment } from '../types';
import { 
  Send, 
  MessageSquare, 
  Paperclip, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  FileText, 
  Download, 
  X, 
  ExternalLink,
  ArrowLeft,
  LifeBuoy,
  PlusCircle,
  CalendarClock,
  Check,
  Search,
  ThumbsUp,
  Smile
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';
import { motion, AnimatePresence } from 'motion/react';
import { TRANSITION_EASE, TRANSITION_DURATION } from '../lib/animationTransitions';
import { listenToMessages, saveMessageToFirestore } from '../lib/firestoreSync';
import { ImagePreviewModal } from './ImagePreviewModal';

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
  onOpenConsultations?: (facultyId?: string) => void;
}

interface EnrichedChatMessage extends ChatMessage {
  attachmentImg?: string;
  attachmentLink?: { url: string; title: string; desc: string };
  attachmentFile?: { name: string; size: string };
}

const ALL_CAMPUS_PEOPLE: any[] = [
  {
    id: 'fac-1',
    facultyId: 'fac-1',
    name: 'Dr. Maria Santos',
    role: 'faculty',
    email: 'maria.santos@msu.edu.ph',
    dept: 'Computer Science Department',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    aliases: ['fac-1', 'FAC-90234', 'maria.santos@msu.edu.ph']
  },
  {
    id: 'fac-2',
    facultyId: 'fac-2',
    name: 'Engr. Allan Turing',
    role: 'faculty',
    email: 'allan.turing@msu.edu.ph',
    dept: 'Software Engineering Department',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    aliases: ['fac-2', 'allan.turing@msu.edu.ph']
  },
  {
    id: 'fac-3',
    facultyId: 'fac-3',
    name: 'Prof. Elena Gomez',
    role: 'faculty',
    email: 'elena.gomez@msu.edu.ph',
    dept: 'Information Technology Department',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    aliases: ['fac-3', 'elena.gomez@msu.edu.ph']
  },
  {
    id: 'fac-4',
    facultyId: 'fac-4',
    name: 'Dr. Ahmad Khan',
    role: 'faculty',
    email: 'ahmad.khan@msu.edu.ph',
    dept: 'College of Computer Studies',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    aliases: ['fac-4', 'FAC-90234', 'ahmad.khan@msu.edu.ph']
  },
  {
    id: 'stud-101',
    studentId: '2023-10492',
    name: 'Bea Alonzo',
    role: 'student',
    email: 'bea.alonzo@s.msumain.edu.ph',
    dept: 'BS Computer Science',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    aliases: ['stud-101', '2023-10492', 'bea.alonzo@s.msumain.edu.ph']
  },
  {
    id: 'stud-102',
    studentId: '2023-10493',
    name: 'Carlos Perez',
    role: 'student',
    email: 'carlos.perez@s.msumain.edu.ph',
    dept: 'BS Information Technology',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    aliases: ['stud-102', '2023-10493', 'carlos.perez@s.msumain.edu.ph']
  },
  {
    id: 'stud-103',
    studentId: '2023-10494',
    name: 'Diane Cruz',
    role: 'student',
    email: 'diane.cruz@s.msumain.edu.ph',
    dept: 'BS Computer Engineering',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    aliases: ['stud-103', '2023-10494', 'diane.cruz@s.msumain.edu.ph']
  },
  {
    id: 'stud-104',
    studentId: '2023-10495',
    name: 'Eric Tan',
    role: 'student',
    email: 'eric.tan@s.msumain.edu.ph',
    dept: 'BS Computer Science',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    aliases: ['stud-104', '2023-10495', 'eric.tan@s.msumain.edu.ph']
  }
];

export const getDynamicCampusPeople = (userRole?: string, userId?: string, userName?: string, userAvatar?: string, userEmail?: string) => {
  let registeredList: any[] = [];
  try {
    registeredList = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
  } catch {
    // ignore
  }

  // Combine dynamic registered users with foundational campus directory
  const combinedRaw = [...registeredList, ...ALL_CAMPUS_PEOPLE];

  const result: any[] = [];
  const addedIds = new Set<string>();

  const myNormalizedEmail = userEmail ? userEmail.trim().toLowerCase() : '';
  const myNormalizedId = userId ? userId.trim() : '';
  const myNormalizedName = userName ? userName.trim().toLowerCase() : '';

  // 1. If active user exists, include them first with their canonical profile
  if (userId) {
    result.push({
      id: userId,
      name: userName || 'Current User',
      role: userRole || 'student',
      avatar: userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      email: userEmail || '',
      dept: 'Academic Portal',
      aliases: [userId, myNormalizedEmail].filter(Boolean),
      previousNames: myNormalizedName ? [myNormalizedName] : []
    });
    addedIds.add(userId);
    if (myNormalizedEmail) addedIds.add(myNormalizedEmail);
  }

  // 2. Iterate through combined registered & campus directory and deduplicate thoroughly
  combinedRaw.forEach((r: any) => {
    if (!r) return;
    if (userRole !== 'admin' && r.role === 'admin') {
      return;
    }

    const rId = String(r.id || r.uid || '').trim();
    const rUid = String(r.uid || '').trim();
    const rStudentId = String(r.studentId || '').trim();
    const rFacultyId = String(r.facultyId || '').trim();
    const rEmail = r.email ? String(r.email).trim().toLowerCase() : '';
    const rName = r.name ? String(r.name).trim().toLowerCase() : '';
    const rAliases: string[] = (r.aliases || []).map((a: string) => String(a).trim());
    const rPrevNames: string[] = (r.previousNames || []).map((n: string) => String(n).trim().toLowerCase());

    // Check if this registered entry corresponds to current user
    const isCurrentUser = 
      (myNormalizedId && (rId === myNormalizedId || rUid === myNormalizedId || rStudentId === myNormalizedId || rFacultyId === myNormalizedId || rAliases.includes(myNormalizedId))) ||
      (myNormalizedEmail && rEmail && (rEmail === myNormalizedEmail || rAliases.includes(myNormalizedEmail)));

    if (isCurrentUser) {
      // Enrich current user record if dept or avatar was missing
      if (result.length > 0 && result[0]) {
        if (!result[0].dept && r.department) result[0].dept = r.department;
        if (r.avatar && (!userAvatar || userAvatar.includes('photo-1534528741775'))) result[0].avatar = r.avatar;
        if (!result[0].aliases) result[0].aliases = [];
        [rId, rUid, rStudentId, rFacultyId, rEmail, ...rAliases].filter(Boolean).forEach(a => {
          if (!result[0].aliases.includes(a)) result[0].aliases.push(a);
        });
        if (!result[0].previousNames) result[0].previousNames = [];
        [rName, ...rPrevNames].filter(Boolean).forEach(n => {
          if (!result[0].previousNames.includes(n)) result[0].previousNames.push(n);
        });
      }
      if (rId) addedIds.add(rId);
      if (rUid) addedIds.add(rUid);
      if (rStudentId) addedIds.add(rStudentId);
      if (rFacultyId) addedIds.add(rFacultyId);
      if (rEmail) addedIds.add(rEmail);
      rAliases.forEach(a => addedIds.add(a));
      return;
    }

    // Check if this other person has already been added
    const alreadyAdded = 
      (rId && addedIds.has(rId)) ||
      (rUid && addedIds.has(rUid)) ||
      (rStudentId && addedIds.has(rStudentId)) ||
      (rFacultyId && addedIds.has(rFacultyId)) ||
      (rEmail && addedIds.has(rEmail)) ||
      rAliases.some(a => addedIds.has(a)) ||
      result.some(p => 
        (rEmail && p.email && p.email.toLowerCase() === rEmail) ||
        (rStudentId && (p.studentId === rStudentId || p.id === rStudentId || p.uid === rStudentId || p.aliases?.includes(rStudentId))) ||
        (rFacultyId && (p.facultyId === rFacultyId || p.id === rFacultyId || p.uid === rFacultyId || p.aliases?.includes(rFacultyId))) ||
        (rId && (p.id === rId || p.aliases?.includes(rId))) ||
        (p.role === r.role && rName && (p.name.trim().toLowerCase() === rName || p.previousNames?.includes(rName))) ||
        (p.role === r.role && rPrevNames.some((n: string) => p.name.trim().toLowerCase() === n || p.previousNames?.includes(n)))
      );

    if (alreadyAdded) {
      // Find and update attributes if newer
      const existing = result.find(p => 
        (rId && (p.id === rId || p.aliases?.includes(rId))) ||
        (rEmail && p.email && p.email.toLowerCase() === rEmail) ||
        (rStudentId && (p.studentId === rStudentId || p.id === rStudentId || p.uid === rStudentId || p.aliases?.includes(rStudentId))) ||
        (p.role === r.role && rName && (p.name.trim().toLowerCase() === rName || p.previousNames?.includes(rName))) ||
        (p.role === r.role && rPrevNames.some((n: string) => p.name.trim().toLowerCase() === n))
      );
      if (existing) {
        if (r.avatar && (!existing.avatar || existing.avatar.includes('photo-1534528741775'))) existing.avatar = r.avatar;
        if (r.name && (!existing.name || existing.name === 'Academic User')) existing.name = r.name;
        if (r.department && !existing.dept) existing.dept = r.department;
        if (!existing.aliases) existing.aliases = [existing.id];
        [rId, rUid, rStudentId, rFacultyId, rEmail, ...rAliases].filter(Boolean).forEach(a => {
          if (!existing.aliases.includes(a)) existing.aliases.push(a);
        });
        if (!existing.previousNames) existing.previousNames = [];
        [rName, ...rPrevNames].filter(Boolean).forEach(n => {
          if (!existing.previousNames.includes(n)) existing.previousNames.push(n);
        });
      }
      return;
    }

    const primaryId = rStudentId || rFacultyId || rId || rUid;
    const combinedAliases = Array.from(new Set([rId, rUid, rStudentId, rFacultyId, primaryId, ...rAliases].filter(Boolean)));
    const combinedPrevNames = Array.from(new Set([rName, ...rPrevNames].filter(Boolean)));

    result.push({
      id: primaryId,
      name: r.name || 'Academic User',
      role: r.role || 'student',
      avatar: r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      email: r.email || '',
      dept: r.department || (r.role === 'faculty' ? 'College Staff' : r.role === 'admin' ? 'Registrar' : 'CCS Student'),
      studentId: rStudentId || undefined,
      facultyId: rFacultyId || undefined,
      uid: rUid || undefined,
      aliases: combinedAliases,
      previousNames: combinedPrevNames
    });

    combinedAliases.forEach(a => addedIds.add(a));
    if (rEmail) addedIds.add(rEmail);
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

export default function Messages({ userProfile, classes, enrollments, accessibility, onBack, mode, setScreen, initialContactId, isOffline: propIsOffline, onOpenConsultations }: MessagesProps) {
  const isOfflineMode = propIsOffline ?? (typeof window !== 'undefined' && localStorage.getItem('cp_offline') === 'true');

  const myId = userProfile.role === 'student' 
    ? (userProfile.studentId || userProfile.id || (userProfile as any).uid || '2023-10492') 
    : userProfile.role === 'faculty' 
      ? (userProfile.facultyId || userProfile.id || 'fac-1') 
      : (userProfile.id || (userProfile as any).uid || 'admin-cur');

  const isUserOffline = (contactObj: any) => {
    if (!contactObj) return true;
    if (contactObj.isChannel) return false;

    // Check if contact explicitly has status 'offline', 'unavailable', or isOffline === true, or isOnline === false
    if (contactObj.status === 'offline' || contactObj.isOffline === true || contactObj.isOnline === false || contactObj.status === 'unavailable') {
      return true;
    }

    // Check self
    const isSelf = contactObj.id === myId || 
                   (userProfile.id && contactObj.id === userProfile.id) ||
                   (userProfile.studentId && contactObj.id === userProfile.studentId) ||
                   (userProfile.facultyId && contactObj.id === userProfile.facultyId) ||
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
    return [];
  });

  const [_registeredUsersVersion, setRegisteredUsersVersion] = useState(0);

  useEffect(() => {
    const handleUsersChanged = () => {
      setRegisteredUsersVersion(v => v + 1);
    };
    const handleMessagesUpdated = (e: any) => {
      if (e.detail?.messages) {
        setMessages(e.detail.messages);
      }
    };
    window.addEventListener('registered-users-changed', handleUsersChanged);
    window.addEventListener('classpulse-messages-updated', handleMessagesUpdated);
    return () => {
      window.removeEventListener('registered-users-changed', handleUsersChanged);
      window.removeEventListener('classpulse-messages-updated', handleMessagesUpdated);
    };
  }, []);

  const [activeContactId, setActiveContactId] = useState<string>(() => {
    if (initialContactId) {
      if (typeof initialContactId === 'object' && initialContactId.id) return initialContactId.id;
      if (typeof initialContactId === 'string') return initialContactId;
    }
    try {
      return localStorage.getItem('cp_active_contact_id') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (activeContactId) {
      try {
        localStorage.setItem('cp_active_contact_id', activeContactId);
      } catch {}
    }
  }, [activeContactId]);
  const [inputText, setInputText] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [imagePreviewData, setImagePreviewData] = useState<{ url: string; title?: string; subtitle?: string; fileName?: string } | null>(null);
  const [isPeerTyping] = useState(false);
  const [typingPeerName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('classpulse-chat-view-change', { 
      detail: { inConversation: isMobile && mobileShowChat } 
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('classpulse-chat-view-change', { 
        detail: { inConversation: false } 
      }));
    };
  }, [isMobile, mobileShowChat]);
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

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const ticketMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const adminTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize chat textarea to fit content seamlessly (Messenger / Instagram style)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    if (adminTextareaRef.current) {
      adminTextareaRef.current.style.height = 'auto';
      adminTextareaRef.current.style.height = `${Math.min(adminTextareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

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

  const scrollToBottom = (_instant: boolean = false) => {
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

  // Universal identity matching functions for bulletproof chat routing
  function isMsgFromMe(m: EnrichedChatMessage): boolean {
    if (!m) return false;
    const myIds = new Set([
      myId,
      userProfile.id,
      userProfile.studentId,
      userProfile.facultyId,
      userProfile.email ? userProfile.email.toLowerCase().trim() : '',
      ...((userProfile as any).aliases || [])
    ].filter(Boolean));

    if (m.senderId && myIds.has(m.senderId)) return true;

    const myName = userProfile.name ? userProfile.name.trim().toLowerCase() : '';
    const myPrevNames: string[] = ((userProfile as any).previousNames || []).map((n: string) => String(n).trim().toLowerCase());
    if (m.senderName) {
      const senderLow = m.senderName.trim().toLowerCase();
      if (myName && senderLow === myName && (!m.senderRole || m.senderRole === userProfile.role)) return true;
      if (myPrevNames.includes(senderLow) && (!m.senderRole || m.senderRole === userProfile.role)) return true;
    }
    return false;
  }

  function isMsgToMe(m: EnrichedChatMessage): boolean {
    if (!m) return false;
    const myIds = new Set([
      myId,
      userProfile.id,
      userProfile.studentId,
      userProfile.facultyId,
      userProfile.email ? userProfile.email.toLowerCase().trim() : '',
      ...((userProfile as any).aliases || [])
    ].filter(Boolean));

    if (m.receiverId && myIds.has(m.receiverId)) return true;

    const myName = userProfile.name ? userProfile.name.trim().toLowerCase() : '';
    const myPrevNames: string[] = ((userProfile as any).previousNames || []).map((n: string) => String(n).trim().toLowerCase());
    if (m.receiverName) {
      const receiverLow = m.receiverName.trim().toLowerCase();
      if (myName && receiverLow === myName) return true;
      if (myPrevNames.includes(receiverLow)) return true;
    }
    return false;
  }

  // Contacts generation based on student / faculty / admin role
  const getContacts = () => {
    let list: any[] = [];
    const dynPeople = getDynamicCampusPeople(
      userProfile.role,
      userProfile.role === 'student' ? (userProfile.studentId || userProfile.id) : (userProfile.id || userProfile.facultyId),
      userProfile.name,
      userProfile.avatar,
      userProfile.email
    );

    if (userProfile.role === 'student') {
      const teachersMap = new Map<string, any>();
      classes.forEach(c => {
        const matchedT = dynPeople.find(p => p.id === c.facultyId || p.facultyId === c.facultyId || p.name === c.facultyName);
        const id = c.facultyId || matchedT?.id || 'fac-1';
        if (!teachersMap.has(id)) {
          teachersMap.set(id, {
            id,
            name: c.facultyName,
            role: 'faculty',
            avatar: matchedT?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
            courseCode: 'Faculty Member',
            aliases: Array.from(new Set([id, c.facultyId, matchedT?.id, matchedT?.facultyId, ...(matchedT?.aliases || [])].filter(Boolean) as string[])),
            previousNames: matchedT?.previousNames || []
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
            courseCode: f.dept || 'Faculty Member',
            aliases: Array.from(new Set([f.id, f.facultyId, f.uid, ...(f.aliases || [])].filter(Boolean) as string[])),
            previousNames: f.previousNames || []
          });
        }
      });

      list = Array.from(teachersMap.values());
    } else if (userProfile.role === 'faculty') {
      // Faculty see students: strictly ONE contact entry per student regardless of how many subjects they are enrolled in
      const facultyId = userProfile.facultyId || 'fac-1';
      const myClasses = classes.filter(c => c.facultyId === facultyId || c.facultyName === userProfile.name);
      const myClassIds = myClasses.map(c => c.id);
      
      const studentMap = new Map<string, any>();
      enrollments
        .filter(e => myClassIds.includes(e.classId))
        .forEach(e => {
          const sId = (e.studentId || '').trim();
          if (!sId) return;

          const matchedS = dynPeople.find(p => 
            p.id === sId || 
            p.studentId === sId || 
            p.uid === sId ||
            (p.aliases && p.aliases.includes(sId)) ||
            (e.studentEmail && p.email && p.email.toLowerCase().trim() === e.studentEmail.toLowerCase().trim()) ||
            (p.name && e.studentName && p.name.trim().toLowerCase() === e.studentName.trim().toLowerCase()) ||
            (p.previousNames && e.studentName && p.previousNames.includes(e.studentName.trim().toLowerCase()))
          );

          if (!studentMap.has(sId)) {
            const canonicalName = matchedS?.name || e.studentName;
            const canonicalAvatar = matchedS?.avatar || e.studentAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150';
            const studentAliases = [
              sId,
              matchedS?.id,
              matchedS?.uid,
              matchedS?.studentId,
              e.studentEmail,
              matchedS?.email,
              ...(matchedS?.aliases || [])
            ].filter(Boolean) as string[];

            studentMap.set(sId, {
              id: sId,
              name: canonicalName,
              role: 'student',
              avatar: canonicalAvatar,
              courseCode: 'Student',
              email: e.studentEmail || matchedS?.email || '',
              aliases: Array.from(new Set(studentAliases)),
              previousNames: Array.from(new Set([e.studentName?.toLowerCase(), ...(matchedS?.previousNames || [])].filter(Boolean)))
            });
          }
        });

      // Also blend registered students from dynPeople so contacts never vanish on refresh or before enrollment load
      dynPeople.filter(p => p.role === 'student').forEach(s => {
        const sId = s.id || s.studentId;
        if (!sId) return;
        const alreadyIn = Array.from(studentMap.values()).some(existing => 
          existing.id === sId || 
          (existing.aliases && (existing.aliases.includes(sId) || existing.aliases.includes(s.uid) || existing.aliases.includes(s.studentId))) ||
          (existing.email && s.email && existing.email.toLowerCase() === s.email.toLowerCase()) ||
          (existing.name && s.name && existing.name.toLowerCase() === s.name.toLowerCase()) ||
          (s.previousNames && s.previousNames.includes(existing.name?.toLowerCase()))
        );
        if (!alreadyIn) {
          studentMap.set(sId, {
            id: sId,
            name: s.name,
            role: 'student',
            avatar: s.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
            courseCode: s.dept || 'CCS Student',
            email: s.email || '',
            aliases: Array.from(new Set([sId, s.id, s.uid, s.studentId, s.email, ...(s.aliases || [])].filter(Boolean))),
            previousNames: s.previousNames || []
          });
        }
      });

      list = Array.from(studentMap.values());
    } else if (userProfile.role === 'admin') {
      // Admins see all registered admins including current user!
      const registeredAdmins = dynPeople.filter(p => p.role === 'admin').map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        avatar: p.avatar,
        courseCode: p.dept || 'Registrar Board',
        email: p.email,
        aliases: [p.id, p.uid, p.email, ...(p.aliases || [])].filter(Boolean) as string[],
        previousNames: p.previousNames || []
      }));
      list = [...registeredAdmins];
    }

    // Blend extra conversation contacts dynamically scanned from messages
    messages.forEach(m => {
      const isChannel = channels.some(ch => ch.id === m.receiverId);
      if (isChannel) return;

      const fromMe = isMsgFromMe(m);
      const toMe = isMsgToMe(m);

      let otherId: string | null = null;
      let otherName: string | null = null;
      let otherRole: string = 'student';

      if (fromMe && !toMe) {
        otherId = m.receiverId;
        otherName = m.receiverName;
        otherRole = 'User';
      } else if (toMe && !fromMe) {
        otherId = m.senderId;
        otherName = m.senderName;
        otherRole = m.senderRole || 'User';
      } else {
        // Self message or unrelated, ignore
        return;
      }

      if (!otherId) return;

      const otherNameLower = otherName ? otherName.trim().toLowerCase() : '';

      // Check if otherId or otherName already exists in list (matching id, aliases, email, name, or previousNames)
      const existingInList = list.find(item => {
        if (item.id === otherId) return true;
        if (item.aliases && item.aliases.includes(otherId)) return true;
        if (otherNameLower && item.name && item.name.trim().toLowerCase() === otherNameLower) return true;
        if (otherNameLower && item.previousNames && item.previousNames.includes(otherNameLower)) return true;
        return false;
      });

      if (existingInList) {
        if (!existingInList.aliases) existingInList.aliases = [existingInList.id];
        if (!existingInList.aliases.includes(otherId)) existingInList.aliases.push(otherId);
        if (otherNameLower) {
          if (!existingInList.previousNames) existingInList.previousNames = [];
          if (!existingInList.previousNames.includes(otherNameLower) && existingInList.name?.trim().toLowerCase() !== otherNameLower) {
            existingInList.previousNames.push(otherNameLower);
          }
        }
        return;
      }

      // Check dynPeople
      const match = dynPeople.find(p => 
        p.id === otherId || 
        p.uid === otherId || 
        p.studentId === otherId ||
        (p.aliases && p.aliases.includes(otherId)) ||
        (otherNameLower && p.name && p.name.trim().toLowerCase() === otherNameLower) ||
        (otherNameLower && p.previousNames && p.previousNames.includes(otherNameLower))
      );

      if (match) {
        const matchAlreadyInList = list.find(item => 
          item.id === match.id ||
          (item.aliases && (item.aliases.includes(match.id) || item.aliases.includes(match.studentId) || item.aliases.includes(match.uid) || (match.aliases && match.aliases.some((a: string) => item.aliases.includes(a))))) ||
          (item.email && match.email && item.email.toLowerCase().trim() === match.email.toLowerCase().trim()) ||
          (item.name && match.name && item.name.trim().toLowerCase() === match.name.trim().toLowerCase()) ||
          (match.previousNames && match.previousNames.includes(item.name?.trim().toLowerCase())) ||
          (item.previousNames && item.previousNames.includes(match.name?.trim().toLowerCase()))
        );

        if (matchAlreadyInList) {
          if (!matchAlreadyInList.aliases) matchAlreadyInList.aliases = [matchAlreadyInList.id];
          if (!matchAlreadyInList.aliases.includes(otherId)) matchAlreadyInList.aliases.push(otherId);
          if (match.id && !matchAlreadyInList.aliases.includes(match.id)) matchAlreadyInList.aliases.push(match.id);
          if (match.aliases) {
            match.aliases.forEach((a: string) => {
              if (!matchAlreadyInList.aliases.includes(a)) matchAlreadyInList.aliases.push(a);
            });
          }
          if (otherNameLower) {
            if (!matchAlreadyInList.previousNames) matchAlreadyInList.previousNames = [];
            if (!matchAlreadyInList.previousNames.includes(otherNameLower) && matchAlreadyInList.name?.trim().toLowerCase() !== otherNameLower) {
              matchAlreadyInList.previousNames.push(otherNameLower);
            }
          }
          return;
        }

        if (userProfile.role === 'admin' && match.role !== 'admin') return;
        if (userProfile.role !== 'admin' && match.role === 'admin') return;

        list.push({
          id: match.id,
          name: match.name,
          role: match.role,
          avatar: match.avatar,
          courseCode: match.dept,
          email: match.email || '',
          aliases: Array.from(new Set([match.id, match.uid, match.studentId, match.facultyId, otherId, ...(match.aliases || [])].filter(Boolean))),
          previousNames: Array.from(new Set([otherNameLower, ...(match.previousNames || [])].filter(Boolean)))
        });
      } else {
        if (userProfile.role === 'admin') return;
        if (otherRole === 'admin') return;

        list.push({
          id: otherId,
          name: otherName || 'Direct Message',
          role: otherRole,
          avatar: '',
          courseCode: 'Direct Message',
          aliases: [otherId],
          previousNames: otherNameLower ? [otherNameLower] : []
        });
      }
    });

    extraConversationIds.forEach(id => {
      const match = dynPeople.find(p => p.id === id || (p.aliases && p.aliases.includes(id)));
      const isAlreadyInList = list.some(item => 
        item.id === id || 
        (item.aliases && item.aliases.includes(id)) ||
        (match && (item.id === match.id || (item.name && match.name && item.name.trim().toLowerCase() === match.name.trim().toLowerCase() && item.role === match.role)))
      );
      if (match && !isAlreadyInList) {
        if (userProfile.role === 'admin' && match.role !== 'admin') return;
        if (userProfile.role !== 'admin' && match.role === 'admin') return;
        list.push({
          id: match.id,
          name: match.name,
          role: match.role,
          avatar: match.avatar,
          courseCode: match.dept,
          aliases: Array.from(new Set([match.id, match.uid, match.studentId, match.facultyId, id, ...(match.aliases || [])].filter(Boolean))),
          previousNames: match.previousNames || []
        });
      }
    });

    const initObj = typeof initialContactId === 'object' ? initialContactId : null;
    const initId = initObj ? initObj.id : (typeof initialContactId === 'string' ? initialContactId : undefined);
    const initName = initObj ? initObj.name : undefined;

    if (initId) {
      const exists = list.some(item => 
        item.id === initId || 
        (item.aliases && item.aliases.includes(initId)) ||
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
          courseCode: matchedP?.dept || 'Faculty Member',
          aliases: Array.from(new Set([initId, matchedP?.id, matchedP?.uid, ...(matchedP?.aliases || [])].filter(Boolean))),
          previousNames: matchedP?.previousNames || []
        });
      }
    }

    // Deduplicate by ID, Name, Email, and Aliases to ensure strictly ONE contact per person
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const seenEmails = new Set<string>();
    const seenAliases = new Set<string>();
    const deduplicated: any[] = [];

    const myIds = new Set([
      myId,
      userProfile.id,
      userProfile.studentId,
      userProfile.facultyId,
      userProfile.email ? userProfile.email.toLowerCase().trim() : '',
      ...((userProfile as any).aliases || [])
    ].filter(Boolean));
    const myName = userProfile.name ? userProfile.name.trim().toLowerCase() : '';
    const myPrevNames: string[] = ((userProfile as any).previousNames || []).map((n: string) => String(n).trim().toLowerCase());

    list.forEach(el => {
      if (!el || !el.id) return;

      // Filter out self-contact in Direct Chats so students or faculty never see themselves as a chat partner
      const isSelf = 
        myIds.has(el.id) ||
        (el.email && myIds.has(el.email.toLowerCase().trim())) ||
        (myName && el.name && el.name.trim().toLowerCase() === myName && el.role === userProfile.role) ||
        (el.aliases && el.aliases.some((a: string) => myIds.has(a))) ||
        (el.name && myPrevNames.includes(el.name.trim().toLowerCase())) ||
        (myName && el.previousNames && el.previousNames.includes(myName));

      if (isSelf && userProfile.role !== 'admin') {
        return;
      }

      const cleanId = String(el.id).trim();
      const cleanName = el.name ? String(el.name).trim().toLowerCase() : '';
      const cleanEmail = el.email ? String(el.email).trim().toLowerCase() : '';
      const elAliases = (el.aliases || [cleanId]) as string[];
      const elPrevNames = ((el.previousNames || []) as string[]).map(n => String(n).trim().toLowerCase());

      const hasDuplicate = 
        seenIds.has(cleanId) ||
        (cleanEmail && seenEmails.has(cleanEmail)) ||
        (cleanName && el.role && seenNames.has(`${el.role}:${cleanName}`)) ||
        elAliases.some(a => seenAliases.has(a)) ||
        elPrevNames.some(n => seenNames.has(`${el.role}:${n}`));

      if (hasDuplicate) {
        // Merge into existing deduplicated entry
        const existing = deduplicated.find(d => 
          d.id === cleanId ||
          (cleanEmail && d.email && d.email.toLowerCase().trim() === cleanEmail) ||
          (cleanName && d.role === el.role && d.name && d.name.trim().toLowerCase() === cleanName) ||
          (d.aliases && elAliases.some((a: string) => d.aliases.includes(a))) ||
          (elPrevNames.length > 0 && d.name && elPrevNames.includes(d.name.trim().toLowerCase())) ||
          (d.previousNames && cleanName && d.previousNames.includes(cleanName))
        );
        if (existing) {
          existing.aliases = Array.from(new Set([...(existing.aliases || [existing.id]), ...elAliases, cleanId]));
          existing.previousNames = Array.from(new Set([...(existing.previousNames || []), ...elPrevNames, cleanName].filter(Boolean)));
          if (el.avatar && (!existing.avatar || existing.avatar.includes('photo-1534528741775'))) {
            existing.avatar = el.avatar;
          }
          if (el.email && !existing.email) {
            existing.email = el.email;
          }
          if (el.name && (!existing.name || existing.name === 'Academic User' || existing.name === 'Direct Message')) {
            existing.name = el.name;
          }
        }
        return;
      }

      seenIds.add(cleanId);
      if (cleanEmail) seenEmails.add(cleanEmail);
      if (cleanName && el.role) seenNames.add(`${el.role}:${cleanName}`);
      elAliases.forEach(a => seenAliases.add(a));
      elPrevNames.forEach(n => {
        if (el.role) seenNames.add(`${el.role}:${n}`);
      });

      deduplicated.push({
        ...el,
        aliases: elAliases,
        previousNames: elPrevNames
      });
    });

    return deduplicated;
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
      (c.aliases && c.aliases.includes(activeContactId)) ||
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
        courseCode: co.courseCode,
        aliases: co.aliases || [co.id]
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
        courseCode: person.dept || 'Faculty Member',
        aliases: [person.id, (person as any).studentId, (person as any).facultyId, (person as any).uid].filter(Boolean) as string[]
      };
    }
    return null;
  };

  const activeMeta = getActiveMetadata();

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
      if (!activeContactId) {
        setMobileShowChat(false);
        if (userProfile.role === 'admin') {
          if (mode === 'tickets') {
            if (adminTickets && adminTickets.length > 0) {
              setActiveContactId(adminTickets[0].id);
            }
          } else {
            if (channels.length > 0) {
              setActiveContactId(channels[0].id);
            } else if (contacts.length > 0) {
              setActiveContactId(contacts[0].id);
            }
          }
        } else {
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
  const getUnreadCount = (id: string, itemMeta?: any) => {
    const aliases = itemMeta?.aliases || [id];
    const prevNames: string[] = itemMeta?.previousNames || [];
    const nameLower = itemMeta?.name ? itemMeta.name.trim().toLowerCase() : '';

    return messages.filter(m => {
      if (isMsgFromMe(m)) return false;
      if (m.read) return false;
      const isForThisRoom = m.receiverId === id;
      const isDirectForMe = 
        (m.senderId === id || aliases.includes(m.senderId) || (nameLower && m.senderName?.trim().toLowerCase() === nameLower) || (m.senderName && prevNames.includes(m.senderName.trim().toLowerCase()))) &&
        (isMsgToMe(m) || !m.receiverId || m.receiverId === myId);
      return isForThisRoom || isDirectForMe;
    }).length;
  };

  // Mark all messages as read for active contact / channel
  useEffect(() => {
    if (!activeContactId) return;
    
    setMessages(prev => {
      let changed = false;
      const contactAliases = (activeMeta as any)?.aliases || [activeContactId];
      const contactPrevNames: string[] = ((activeMeta as any)?.previousNames || []).map((n: string) => String(n).trim().toLowerCase());
      const contactNameLower = activeMeta?.name ? activeMeta.name.trim().toLowerCase() : '';

      const updated = prev.map(m => {
        const isFromActiveOther = 
          (m.senderId === activeContactId || contactAliases.includes(m.senderId) || (contactNameLower && m.senderName?.trim().toLowerCase() === contactNameLower) || (m.senderName && contactPrevNames.includes(m.senderName.trim().toLowerCase()))) &&
          (isMsgToMe(m) || m.receiverId === myId || !m.receiverId);
        const isForActiveChannel = m.receiverId === activeContactId && !isMsgFromMe(m);

        if ((isFromActiveOther || isForActiveChannel) && !m.read) {
          changed = true;
          const readMsg = { ...m, read: true };
          saveMessageToFirestore(false, readMsg).catch(() => {});
          return readMsg;
        }
        return m;
      });

      if (changed) {
        try {
          localStorage.setItem('cp_chat_messages_v2', JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('classpulse-messages-updated', { detail: { messages: updated } }));
        } catch {}
        return updated;
      }
      return prev;
    });
  }, [activeContactId, myId, activeMeta]);

  // ACTIVE RECURRENT LIVE CHAT SIMULATION - Completely disabled to prevent automated interruptions
  useEffect(() => {
    // Disabled as requested: "don't automate response make it like message app wait if the receiver/user response."
    return () => {};
  }, [activeContactId, channels, userProfile.name]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingImg && !pendingLink && !pendingFile) || !activeContactId) return;

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
      message: inputText.trim() || (pendingImg ? "" : pendingFile ? "Shared a file" : "Shared a link"),
      timestamp: nowStr,
      ...(pendingImg ? { attachmentImg: pendingImg } : {}),
      ...(pendingLink ? { attachmentLink: pendingLink } : {}),
      ...(pendingFile ? { attachmentFile: pendingFile } : {}),
      read: false
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

    // Immediate scroll to bottom
    setTimeout(() => {
      scrollToBottom(true);
    }, 50);

    speakText("Message transmitted.", accessibility.readAloud);
  };

  // Filter messages for current discussion
  const isActiveChannel = channels.some(ch => ch.id === activeContactId);
  
  const currentMessages = messages.filter(m => {
    if (!m) return false;
    if (isActiveChannel) {
      return (
        m.receiverId === activeContactId ||
        (activeMeta?.id && m.receiverId === activeMeta.id) ||
        (activeMeta?.code && m.receiverId === activeMeta.code)
      );
    }
    
    // Check if message is related to active direct chat contact (matching id, aliases, name, or previousNames)
    const contactAliases = (activeMeta as any)?.aliases || [activeContactId];
    const contactPrevNames: string[] = ((activeMeta as any)?.previousNames || []).map((n: string) => String(n).trim().toLowerCase());
    const contactNameLower = activeMeta?.name ? activeMeta.name.trim().toLowerCase() : '';

    const matchesContactAsSender = 
      m.senderId === activeContactId ||
      contactAliases.includes(m.senderId) ||
      (activeMeta?.id && m.senderId === activeMeta.id) ||
      (contactNameLower && m.senderName && m.senderName.trim().toLowerCase() === contactNameLower) ||
      (m.senderName && contactPrevNames.includes(m.senderName.trim().toLowerCase()));

    const matchesContactAsReceiver = 
      m.receiverId === activeContactId ||
      contactAliases.includes(m.receiverId) ||
      (activeMeta?.id && m.receiverId === activeMeta.id) ||
      (contactNameLower && m.receiverName && m.receiverName.trim().toLowerCase() === contactNameLower) ||
      (m.receiverName && contactPrevNames.includes(m.receiverName.trim().toLowerCase()));

    const sentByMeToContact = isMsgFromMe(m) && matchesContactAsReceiver;
    const sentByContactToMe = matchesContactAsSender && (isMsgToMe(m) || !m.receiverId || m.receiverId === myId);

    // Also support fallback when testing/demoing self chat
    const isSelfContact = activeContactId === myId || (contactNameLower && userProfile.name && contactNameLower === userProfile.name.trim().toLowerCase());
    if (isSelfContact && isMsgFromMe(m)) return true;

    return sentByMeToContact || sentByContactToMe;
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
    const activeNowList = contacts.filter(c => !isUserOffline(c)).slice(0, 10);

    return (
        <div id="messenger-sidebar" className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-zinc-200/60 dark:border-zinc-850/60 flex flex-col h-full shrink-0 bg-white dark:bg-zinc-950">
          <div className="p-3 border-b border-zinc-150 dark:border-zinc-900 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="p-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                    title="Back"
                  >
                    <ArrowLeft className="w-5 h-5 text-emerald-500" />
                  </button>
                )}
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">Chats</h2>
              </div>
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 font-mono tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {contacts.length} peers
              </span>
            </div>

            {/* Messenger-inspired Pill Search Bar */}
            <div className="relative">
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-full px-3.5 py-2 border border-transparent focus-within:border-emerald-500/40 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-900 transition-all">
                <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={userSearchText}
                  onChange={(e) => {
                    setUserSearchText(e.target.value);
                  }}
                  placeholder="Search Messenger..."
                  className="w-full text-xs sm:text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-medium"
                />
                {userSearchText && (
                  <button
                    type="button"
                    onClick={() => setUserSearchText('')}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Facebook / Instagram Stories & Active Peers Row */}
          {!userSearchText && activeNowList.length > 0 && (
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
              <div className="flex items-center gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
                {activeNowList.map(c => (
                  <button
                    key={`story-${c.id}`}
                    onClick={() => {
                      setActiveContactId(c.id);
                      setMobileShowChat(true);
                    }}
                    type="button"
                    className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer focus:outline-none"
                    title={`Chat with ${c.name}`}
                  >
                    <div className="relative">
                      <div className={`p-0.5 rounded-full ring-2 transition-transform group-hover:scale-105 ${
                        activeContactId === c.id ? 'ring-emerald-500' : 'ring-emerald-500/60'
                      }`}>
                        {c.avatar ? (
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-11 h-11 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-sm flex items-center justify-center uppercase">
                            {c.name ? c.name[0] : '?'}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-xs ring-1 ring-emerald-500/50" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 max-w-[54px] truncate group-hover:text-emerald-500 transition-colors">
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channels/Contacts Unified Iterator list */}
          <div className="flex-1 overflow-y-auto space-y-4 p-3 text-left pb-28 lg:pb-3">
          
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
                        ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-white border-zinc-250 dark:border-zinc-750 font-extrabold shadow-xs'
                        : 'bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        activeContactId === ch.id ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        #
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs font-extrabold truncate ${activeContactId === ch.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{ch.name}</h4>
                        <p className={`text-[9px] truncate uppercase mt-0.5 font-bold ${activeContactId === ch.id ? 'text-zinc-500 dark:text-zinc-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{ch.code} Room</p>
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
              const unreadCount = getUnreadCount(c.id, c);
              const contactMsgs = messages.filter(m => 
                (m.senderId === c.id && (isMsgToMe(m) || m.receiverId === myId)) ||
                (isMsgFromMe(m) && (m.receiverId === c.id || ((c as any).aliases || []).includes(m.receiverId)))
              );
              const lastMsg = contactMsgs[contactMsgs.length - 1];
              const isLastMsgFromMeAndUnread = lastMsg && isMsgFromMe(lastMsg) && !lastMsg.read;

              const myIds = new Set([
                myId,
                userProfile.id,
                userProfile.studentId,
                userProfile.facultyId,
                userProfile.email ? userProfile.email.toLowerCase().trim() : '',
                ...((userProfile as any).aliases || [])
              ].filter(Boolean));
              const myName = userProfile.name ? userProfile.name.trim().toLowerCase() : '';
              const myPrevNames: string[] = ((userProfile as any).previousNames || []).map((n: string) => String(n).trim().toLowerCase());

              const isMe = 
                myIds.has(c.id) || 
                (c.email && myIds.has(c.email.toLowerCase().trim())) ||
                (myName && c.name && c.name.toLowerCase().trim() === myName && c.role === userProfile.role) ||
                (c.aliases && c.aliases.some((a: string) => myIds.has(a))) ||
                (c.name && myPrevNames.includes(c.name.toLowerCase().trim())) ||
                (myName && c.previousNames && c.previousNames.includes(myName));

              if (isMe && userProfile.role !== 'admin') {
                return null;
              }
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveContactId(c.id);
                    setMobileShowChat(true);
                  }}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left border cursor-pointer transition-all mb-1 ${
                    activeContactId === c.id
                      ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-white border-zinc-250 dark:border-zinc-750 font-extrabold shadow-xs'
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
                      {isUserOffline(c) ? (
                        <span 
                          title="Offline"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500/30 dark:bg-emerald-500/25 border-2 border-white dark:border-zinc-950 opacity-60" 
                        />
                      ) : (
                        <span 
                          title="Online"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-xs ring-1 ring-emerald-500/40" 
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`text-xs font-extrabold truncate flex items-center gap-1.5 ${activeContactId === c.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        <span className="truncate">{c.name}</span>
                        {isMe && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                            activeContactId === c.id 
                              ? 'bg-emerald-500 text-white font-extrabold' 
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}>
                            (You)
                          </span>
                        )}
                      </h4>
                      <p className={`text-[9px] truncate uppercase font-extrabold mt-0.5 ${activeContactId === c.id ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>{c.role} • {c.courseCode}</p>
                    </div>
                  </div>
                  {unreadCount > 0 ? (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full select-none shrink-0 ${
                      activeContactId === c.id ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'
                    }`}>
                      {unreadCount}
                    </span>
                  ) : isLastMsgFromMeAndUnread ? (
                    <div title="Delivered • Message not opened yet" className="shrink-0 flex items-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-2xs">
                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                      </span>
                    </div>
                  ) : null}
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
                      {isUserOffline(person) ? (
                        <span 
                          title="Offline"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500/30 dark:bg-emerald-500/25 border-2 border-white dark:border-zinc-950 opacity-60" 
                        />
                      ) : (
                        <span 
                          title="Online"
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-xs ring-1 ring-emerald-500/40" 
                        />
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
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950 relative overflow-hidden">
        
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
            {/* Messenger / Instagram Style Edge-to-Edge Sticky Header */}
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-150 dark:border-zinc-850/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {(isMobile || mobileShowChat) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileShowChat(false);
                      speakText("Back to chat list", accessibility.readAloud);
                    }}
                    className="lg:hidden w-10 h-10 rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center -ml-1 touch-manipulation"
                    title="Go back to list"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                  </button>
                )}
                {!(activeMeta as any).isChannel ? (
                  <div className="relative shrink-0">
                    {(activeMeta as any).avatar ? (
                      <img 
                        src={(activeMeta as any).avatar} 
                        alt={activeMeta.name} 
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-emerald-500/30 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-sm flex items-center justify-center uppercase shadow-xs">
                        {activeMeta.name ? activeMeta.name[0] : '?'}
                      </div>
                    )}
                    {isUserOffline(activeMeta) ? (
                      <span 
                        title="Offline"
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-zinc-400 border-2 border-white dark:border-zinc-950 opacity-70" 
                      />
                    ) : (
                      <span 
                        title="Active now"
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-xs ring-1 ring-emerald-500/40" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg shrink-0">
                    #
                  </div>
                )}
                <div className="text-left min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                    <span className="truncate">{activeMeta.name}</span>
                    {activeMeta && !(activeMeta as any).isChannel && (
                      activeMeta.id === myId ||
                      ((activeMeta as any).email && userProfile.email && (activeMeta as any).email.toLowerCase() === userProfile.email.toLowerCase()) ||
                      (activeMeta.name && userProfile.name && activeMeta.name.toLowerCase() === userProfile.name.toLowerCase())
                    ) && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                        You
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-medium truncate flex items-center gap-1.5">
                    {!(activeMeta as any).isChannel ? (
                      isUserOffline(activeMeta) ? (
                        <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                          Offline • Tap to leave message
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Active now
                        </span>
                      )
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">{channels.find(c => c.id === activeMeta.id)?.code || 'Group'} Discussion Room</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Header Action Panel status indicator */}
              <div className="flex items-center gap-2">
                {activeMeta && !(activeMeta as any).isChannel && (activeMeta.role === 'faculty' || (activeMeta as any).facultyId || (activeMeta as any).dept?.toLowerCase().includes('faculty') || (activeMeta as any).dept?.toLowerCase().includes('college')) && userProfile.role === 'student' && (
                  <button
                    type="button"
                    onClick={() => {
                      speakText(`Opening consultation booking with ${activeMeta.name}`, accessibility.readAloud);
                      if (onOpenConsultations) {
                        onOpenConsultations(activeMeta.id || (activeMeta as any).facultyId);
                      } else if (setScreen) {
                        setScreen('consultations');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-black dark:text-emerald-400 dark:hover:text-black transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                    title={`Book 1-on-1 academic consultation with ${activeMeta.name}`}
                  >
                    <CalendarClock className="w-4 h-4" />
                    <span className="hidden sm:inline">Book Consultation</span>
                  </button>
                )}
                <div className={`hidden sm:flex items-center gap-1.5 font-mono text-[9px] uppercase font-bold px-2.5 py-1 rounded-full ${
                  isGoogleChatActive ? 'text-sky-500 bg-sky-500/10' : 'text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900'
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
                    const isMe = (m as any).isMeOverride !== undefined ? (m as any).isMeOverride : isMsgFromMe(m);
                    return (
                      <motion.div 
                        key={m.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: TRANSITION_EASE }}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Name and timestamp header */}
                        <div className="flex items-center gap-1.5 px-1 bg-transparent">
                          <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">{m.senderName}</span>
                          <span className="text-[8px] font-mono text-zinc-500/80 dark:text-zinc-400">{m.timestamp}</span>
                        </div>

                        {/* Interactive Message Bubble */}
                        {m.attachmentImg && (!m.message || m.message === "Shared an image" || m.message === "Shared a photo" || !m.message.trim()) ? (
                          /* Pure Image Attachment Card (Clean without outer colored bubble) */
                          <div 
                            onClick={() => setImagePreviewData({
                              url: m.attachmentImg!,
                              title: `Image Attachment`,
                              subtitle: `From ${m.senderName || 'Sender'} • ${m.timestamp || 'Chat'}`,
                              fileName: `chat_image_${m.id || Date.now()}.png`
                            })}
                            className="relative rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group cursor-pointer shadow-md hover:ring-2 hover:ring-emerald-500/50 transition-all max-w-[280px] sm:max-w-xs"
                          >
                            <img 
                              src={m.attachmentImg} 
                              alt="Attachment" 
                              className="object-cover w-full max-h-72 transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 backdrop-blur-[2px]">
                              <span className="px-3 py-1.5 rounded-xl bg-zinc-900/90 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-zinc-700">
                                <Download className="w-4 h-4 text-emerald-400" /> View Photo
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* Standard Message Bubble with text / files / custom caption */
                          <div className={`px-4 py-2.5 rounded-[20px] text-sm sm:text-[15px] leading-relaxed max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-xl text-left space-y-2 transition-all outline-none shadow-xs ${
                            isMe
                              ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 rounded-br-xs font-medium'
                              : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 rounded-bl-xs font-normal'
                          }`}>
                            
                            {/* Inner standard text if available */}
                            {m.message && m.message !== "Shared an image" && m.message !== "Shared a photo" && (
                              <p className="leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.message}</p>
                            )}

                            {/* Image Attachment inside captioned bubble */}
                            {m.attachmentImg && (
                              <div 
                                onClick={() => setImagePreviewData({
                                  url: m.attachmentImg!,
                                  title: `Image Attachment`,
                                  subtitle: `From ${m.senderName || 'Sender'} • ${m.timestamp || 'Chat'}`,
                                  fileName: `chat_image_${m.id || Date.now()}.png`
                                })}
                                className="relative rounded-xl overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 group cursor-pointer shadow-xs hover:ring-2 hover:ring-emerald-500/50 transition-all"
                              >
                                <img 
                                  src={m.attachmentImg} 
                                  alt="Attachment" 
                                  className="object-cover w-full max-h-56 transition-transform duration-300 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 backdrop-blur-[2px]">
                                  <span className="px-2.5 py-1.5 rounded-lg bg-zinc-900/90 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg border border-zinc-700">
                                    <Download className="w-3.5 h-3.5 text-emerald-400" /> View Photo
                                  </span>
                                </div>
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
                                    const fileName = m.attachmentFile?.name || 'resource.txt';
                                    const blob = new Blob([`ClassPulse Academic Resource: ${fileName}\nExported: ${new Date().toLocaleString()}`], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = fileName;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    if (typeof window !== 'undefined' && (window as any).showToast) {
                                      (window as any).showToast(`Downloaded resource: ${fileName}`, "success");
                                    }
                                    speakText(`Beginning download for class resource ${fileName}`, accessibility.readAloud);
                                  }}
                                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                                </button>
                              </div>
                            )}

                          </div>
                        )}

                        {/* Facebook Messenger Delivery & Read Status Badge */}
                        {isMe && (
                          <div className="flex items-center gap-1 px-1 justify-end select-none">
                            {!m.read ? (
                              <div 
                                title="Delivered • Not opened yet" 
                                className="flex items-center gap-1 group cursor-default"
                              >
                                <span className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Delivered
                                </span>
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-2xs transition-transform duration-200 hover:scale-110">
                                  <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                                </span>
                              </div>
                            ) : (
                              <div 
                                title={`Seen by ${activeMeta?.name || 'recipient'}`}
                                className="flex items-center gap-1 group cursor-default"
                              >
                                <span className="text-[9px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Seen
                                </span>
                                {activeMeta?.avatar ? (
                                  <img
                                    src={activeMeta.avatar}
                                    alt={activeMeta.name || "Seen"}
                                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-emerald-500/80 shadow-2xs"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-[8px] shadow-2xs">
                                    {activeMeta?.name ? activeMeta.name[0].toUpperCase() : '✓'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
                      <p className="text-xs font-bold truncate text-zinc-800 dark:text-zinc-200">Photo attached (ready to send)</p>
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
            <div className="relative shrink-0 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:pb-1 bg-white dark:bg-zinc-950 sticky bottom-0 z-20">
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressImage = (f: File): Promise<string> => {
                            return new Promise((resolve) => {
                              const reader = new FileReader();
                              reader.onload = (re) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  let width = img.width;
                                  let height = img.height;
                                  const maxDim = 1000;
                                  if (width > maxDim || height > maxDim) {
                                    if (width > height) {
                                      height = Math.round((height * maxDim) / width);
                                      width = maxDim;
                                    } else {
                                      width = Math.round((width * maxDim) / height);
                                      height = maxDim;
                                    }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
                                    resolve(dataUrl);
                                  } else {
                                    resolve(re.target?.result as string);
                                  }
                                };
                                img.onerror = () => resolve(re.target?.result as string);
                                img.src = re.target?.result as string;
                              };
                              reader.onerror = () => resolve('');
                              reader.readAsDataURL(f);
                            });
                          };

                          const compressedData = await compressImage(file);
                          if (compressedData) {
                            setPendingImg(compressedData);
                            setPendingLink(null);
                            setPendingFile(null);
                            setShowAttachmentMenu(false);
                            speakText(`Successfully attached picture: ${file.name}`, accessibility.readAloud);
                          }
                        } catch (err) {
                          console.error("Image compression error:", err);
                        }
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
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">Local</span>
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
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">URL</span>
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
                      <span className="text-[8px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">FILE</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Messenger / Instagram 2026 Quick Replies & Adaptive Expanding Input Bar */}
              <div className="pt-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] px-2.5 sm:px-4 border-t border-zinc-150 dark:border-zinc-850 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
                
                {/* Quick Reaction Suggestion Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 text-xs">
                  {["👍", "❤️", "Sounds good!", "Thank you!", "See you in class 👍"].map(quick => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => {
                        setInputText(quick);
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                        }
                      }}
                      className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                <form 
                  onSubmit={handleSendMessage} 
                  className="flex items-end gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer touch-manipulation active:scale-90 ${
                      showAttachmentMenu 
                        ? 'bg-emerald-500 text-black shadow-md' 
                        : 'text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                    }`}
                    title="Attach file or photo"
                  >
                    <Paperclip className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  {/* Expanding Textarea Capsule (100% available width, auto-grows, no scroll horizontal) */}
                  <div className="flex-1 min-h-[46px] max-h-32 bg-zinc-100 dark:bg-zinc-900 rounded-[24px] px-4 py-2.5 flex items-end focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-900 transition-all border border-transparent focus-within:border-emerald-500/30">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={`Message ${activeMeta.name}...`}
                      className="w-full bg-transparent resize-none border-0 outline-none text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-normal leading-relaxed max-h-28"
                    />
                  </div>

                  {inputText.trim() || pendingImg || pendingLink || pendingFile ? (
                    <button
                      type="submit"
                      className="w-11 h-11 shrink-0 font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90 touch-manipulation"
                      title="Send message"
                    >
                      <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const newMsg: EnrichedChatMessage = {
                          id: 'msg-' + Date.now(),
                          senderId: myId,
                          senderName: userProfile.name,
                          senderRole: userProfile.role,
                          receiverId: activeContactId,
                          receiverName: activeMeta?.name || 'Academic Group',
                          message: "👍",
                          timestamp: nowStr,
                          read: false
                        };
                        setMessages(prev => [...prev, newMsg]);
                        const isOffline = localStorage.getItem('cp_offline') === 'true';
                        saveMessageToFirestore(isOffline, newMsg).catch(err => console.error("Firestore thumbs up error:", err));
                        setTimeout(() => scrollToBottom(true), 50);
                        speakText("Sent thumbs up", accessibility.readAloud);
                      }}
                      className="w-11 h-11 shrink-0 rounded-full text-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-all cursor-pointer active:scale-90 touch-manipulation text-2xl"
                      title="Send thumbs up"
                    >
                      👍
                    </button>
                  )}
                </form>
              </div>
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
                      ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-white border-zinc-250 dark:border-zinc-750 font-bold shadow-xs'
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
                        <h4 className={`text-xs font-extrabold truncate ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {t.userName}
                        </h4>
                        <p className={`text-[9px] font-semibold uppercase ${isActive ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-450'}`}>
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
                  <div className={`p-3 rounded-2xl text-[12px] shadow-xs inline-block text-left max-w-full ${
                    isAdmin 
                      ? 'bg-zinc-900 text-white dark:bg-zinc-800 border border-zinc-250 dark:border-zinc-700 rounded-tr-none font-medium' 
                      : 'bg-emerald-600 border border-emerald-500 text-white rounded-tl-none font-semibold'
                  }`}>
                    <p className="leading-relaxed break-words [overflow-wrap:anywhere]">{m.text}</p>
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
        <div className="pt-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] px-2.5 sm:px-4 border-t border-zinc-150 dark:border-zinc-850 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20">
          <form onSubmit={handleSendAdminTicketReply} className="flex items-end gap-2">
            <div className="flex-1 min-h-[46px] max-h-32 bg-zinc-100 dark:bg-zinc-900 rounded-[24px] px-4 py-2.5 flex items-end focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-900 transition-all border border-transparent focus-within:border-emerald-500/30">
              <textarea
                ref={adminTextareaRef}
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendAdminTicketReply(e);
                  }
                }}
                placeholder={`Type official reply to ${selectedTicket.userName}...`}
                className="w-full bg-transparent resize-none border-0 outline-none text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-normal leading-relaxed max-h-28"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-11 h-11 shrink-0 font-bold text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-35 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-90 touch-manipulation"
              title="Send reply"
            >
              <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
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
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
              className="w-full h-full flex flex-col"
            >
              {userProfile.role === 'admin' && mode === 'tickets' ? renderAdminSidebar() : renderSidebar()}
            </motion.div>
          ) : (
            <motion.div
              key="chat-pane"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
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
      {/* Image Attachment Lightbox with Save Button */}
      <ImagePreviewModal
        isOpen={!!imagePreviewData}
        onClose={() => setImagePreviewData(null)}
        imageUrl={imagePreviewData?.url || null}
        title={imagePreviewData?.title}
        subtitle={imagePreviewData?.subtitle}
        fileName={imagePreviewData?.fileName}
        readAloudEnabled={accessibility.readAloud}
      />
    </div>
  );
}
