import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle, 
  LifeBuoy, 
  Send, 
  CheckCircle, 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  FileText, 
  ShieldAlert, 
  ChevronRight,
  User,
  Activity,
  UserCheck
} from 'lucide-react';
import { speakText } from './AccessibilitySettings';

interface HelpCenterProps {
  userProfile: any;
  accessibility: any;
  onBack: () => void;
}

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

const STUDENT_FAQS = [
  {
    q: "How does the real-time RFID/QR attendance check-in work?",
    a: "Your instructor broadcasts a live rotation key on the classroom display. Open the Attendance Scan tab to capture the QR code with your camera or enter the dynamic code manually. Your record is logged instantly."
  },
  {
    q: "What should I do if I missed a lecture due to a medical emergency?",
    a: "First, procure an official doctor's note. Go to your dashboard and look for 'File Excuse Letter' or navigate to the Excuse Inbox to upload your file. Once your professor reviews it, your absent status will be updated."
  },
  {
    q: "How is my cumulative academic check-in safety calculated?",
    a: "Your check-in safety percentage is the ratio of present/excused lectures to the total registered classes. A safety score below 85% is flagged as warning, and below 75% marks you as dropped. Maintain consistent attendance!"
  },
  {
    q: "Can I use the app offline during campus network outrages?",
    a: "Yes! ClassPulse has a resilient offline storage hub. Scan codes normally; the app will queue and synchronize your attendance records to university servers the moment internet connectivity returns."
  }
];

const FACULTY_FAQS = [
  {
    q: "How can I register a new class register structure?",
    a: "Go to your 'My Classes' section and hit the 'Add Class' button. Set the lecture codes, subject names, room assignments, and schedules. Students will then be able to enroll and take scans."
  },
  {
    q: "How do I trigger attendance tracking for a session?",
    a: "Open the 'Attendance QR' tab, choose the active class session, select your rotation key frequency, and project the generated QR onto your classroom slides or screens."
  },
  {
    q: "How do I review or sign off student excuse letters?",
    a: "All medical excuse slips show up in your 'Excuse Inbox'. Click view to inspect the slip and hit approve or deny, which will auto-recalculate student safety metrics."
  },
  {
    q: "Can I export consolidated class logs for institutional grading?",
    a: "Navigate to 'Students Directory' (Monitoring Center), choose your desired class, and click 'Export Class CSV'. You can also click 'Export All CSV' to download comprehensive lists for all courses."
  }
];

const DEFAULT_TICKETS: SupportTicket[] = [
  {
    id: "TIC-1029",
    category: "RFID Card Sync",
    subject: "RFID card doesn't register at Room 302",
    description: "My student RFID card works for room entrances but flashes red when tapping on the attendance logger console. Please synchronize my credential tokens.",
    status: "Resolved",
    createdAt: "June 12, 2026, 09:30 AM",
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "Hi support, my RFID badge flashes red at the attendance logs in the Engineering build.",
        timestamp: "09:30 AM"
      },
      {
        id: "m2",
        sender: "admin",
        text: "Hello! We have forced an over-the-air sync payload for your card token. Please test it at your next lecture. Let us know if you encounter any other issues.",
        timestamp: "11:15 AM"
      },
      {
        id: "m3",
        sender: "user",
        text: "Thank you! Tested it this afternoon and it checked me in instantly.",
        timestamp: "02:40 PM"
      }
    ]
  },
  {
    id: "TIC-5581",
    category: "Technical Bugs",
    subject: "Class schedule calendar sync lag on dashboard",
    description: "The dashboard calendar view does not match my official syllabus updates. Newly modified classes show up after a noticeable delay.",
    status: "In Progress",
    createdAt: "June 15, 2026, 04:10 PM",
    messages: [
      {
        id: "m4",
        sender: "user",
        text: "The calendar scheduling updates seem to take 10-15 minutes to align on my mobile view.",
        timestamp: "04:10 PM"
      },
      {
        id: "m5",
        sender: "admin",
        text: "Greetings. We are currently debugging a database indexing lag that affects specific user cohorts. A permanent software patch is being deployed shortly.",
        timestamp: "05:05 PM"
      }
    ]
  }
];

export default function HelpCenter({ userProfile, accessibility, onBack }: HelpCenterProps) {
  const [activeTab, setActiveTab] = React.useState<'faq' | 'tickets'>('faq');
  const [tickets, setTickets] = React.useState<SupportTicket[]>(() => {
    const cached = localStorage.getItem(`cp_support_tickets_${userProfile.uid || 'usr'}`);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) { /* ignore */ }
    }
    return DEFAULT_TICKETS;
  });

  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  
  // Ticket Creation Form
  const [newCategory, setNewCategory] = React.useState('Attendance Verification');
  const [newSubject, setNewSubject] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [successMsg, setSuccessMsg] = React.useState(false);
  const [chatInput, setChatInput] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem(`cp_support_tickets_${userProfile.uid || 'usr'}`, JSON.stringify(tickets));
  }, [tickets, userProfile.uid]);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) return;

    const newTicket: SupportTicket = {
      id: `TIC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: newCategory,
      subject: newSubject,
      description: newDesc,
      status: 'Open',
      createdAt: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'user',
          text: newDesc,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    setTickets(prev => [newTicket, ...prev]);
    setNewSubject('');
    setNewDesc('');
    setSuccessMsg(true);
    speakText("Help ticket submitted to university administration successfully.", accessibility.readAloud);

    // Simulated Admin Response
    setTimeout(() => {
      setTickets(prev => prev.map(t => {
        if (t.id === newTicket.id) {
          return {
            ...t,
            status: 'In Progress',
            messages: [
              ...t.messages,
              {
                id: `reply-${Date.now()}`,
                sender: 'admin',
                text: `Thank you for filing this support request, ${userProfile.name}. We have routed this ticket to our university IT & Academic Systems Desk under category [${newTicket.category}]. An administrator will handle this shortly.`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
        }
        return t;
      }));
    }, 2500);

    setTimeout(() => {
      setSuccessMsg(false);
    }, 5000);
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim() || !selectedTicketId) return;

    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setTickets(prev => prev.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    setChatInput('');
    speakText("Message sent", accessibility.readAloud);

    // Auto admin reply
    setTimeout(() => {
      const replies = [
        "Received. We are actively investigating this report with our engineering team.",
        "Understood. We are verifying the university ledger tables for your record status. Please hold.",
        "Your update has been received. Our administrators are looking into it and will update your status as soon as verified.",
        "We have logged your follow-up details. We'll update the status tag once resolved."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      const adminReply: TicketMessage = {
        id: `reply-${Date.now()}`,
        sender: 'admin',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      setTickets(prev => prev.map(t => {
        if (t.id === selectedTicketId) {
          return {
            ...t,
            messages: [...t.messages, adminReply]
          };
        }
        return t;
      }));
    }, 2000);
  };

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);
  const faqs = userProfile.role === 'faculty' ? FACULTY_FAQS : STUDENT_FAQS;

  return (
    <div className="space-y-6 font-sans">
      {/* Top navigation header without rounded card background */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-850">
        <div className="flex items-center gap-3 text-left">
          <button 
            onClick={onBack} 
            type="button"
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
          </button>
          <div className="text-left">
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-emerald-500" />
              Help & Administrator Support Desk
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">View campus instruction guidelines or submit a priority support ticket below.</p>
          </div>
        </div>

        <div className="flex gap-1 shrink-0 bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setActiveTab('faq'); setSelectedTicketId(null); }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === 'faq' && !selectedTicketId
                ? 'bg-emerald-500 text-black shadow-2xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            FAQs & Guides
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all ${
              activeTab === 'tickets' || selectedTicketId
                ? 'bg-emerald-500 text-black shadow-2xs font-extrabold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            My Support Tickets {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-black/20 text-[9px] rounded-full text-black font-black">
                {tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedTicketId && selectedTicket ? (
          // DETAILED TICKET CHAT WINDOW with Administrator (separated out of Messages)
          <motion.div
            key="ticket-chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
          >
            <div className="lg:col-span-4 space-y-4">
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all cursor-pointer active:scale-95 shrink-0 select-none"
                title="Back to Support Tickets"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-500" />
              </button>

              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-xs text-zinc-500 dark:text-zinc-400 space-y-4">
                <div>
                  <span className={`px-2 py-0.5 font-bold uppercase text-[9px] rounded-md ${
                    selectedTicket.status === 'Resolved' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : selectedTicket.status === 'In Progress' 
                        ? 'bg-amber-550/10 text-amber-500' 
                        : 'bg-indigo-500/10 text-indigo-500'
                  }`}>
                    {selectedTicket.status}
                  </span>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mt-2">{selectedTicket.subject}</h3>
                </div>

                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <div className="flex justify-between">
                    <span className="font-semibold text-zinc-400">Ticket ID:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedTicket.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-zinc-400">Created At:</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedTicket.createdAt}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-zinc-400">Category:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedTicket.category}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <span className="font-extrabold uppercase text-[9px] text-zinc-400 block mb-1">Issue Details:</span>
                  <p className="font-medium text-zinc-650 dark:text-zinc-300 leading-relaxed text-xs">
                    {selectedTicket.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col h-[500px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-xs">
              {/* Box Header */}
              <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-150 dark:border-zinc-900 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center font-bold text-sm text-emerald-500">
                    ADM
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">University Helpdesk Admin</h3>
                    <p className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Active Administrator Assigned
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-450 uppercase font-black">Official Service Request Ticket</span>
              </div>

              {/* Chat Timeline */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-50/20 dark:bg-zinc-900/40">
                {selectedTicket.messages.map((m) => {
                  const isAdmin = m.sender === 'admin';
                  return (
                    <div 
                      key={m.id}
                      className={`flex gap-2 w-full max-w-[85%] ${isAdmin ? 'self-start text-left' : 'ml-auto flex-row-reverse text-right'}`}
                    >
                      {isAdmin ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-[10px] shrink-0 shadow-xs">
                          A
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-800 dark:bg-zinc-700 flex items-center justify-center text-white font-extrabold text-[10px] shrink-0 shadow-xs">
                          {userProfile.name[0]}
                        </div>
                      )}
                      <div>
                        <div className={`p-3.5 rounded-2xl text-xs font-bold shadow-xs inline-block text-left ${
                          isAdmin 
                            ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-tl-none' 
                            : 'bg-emerald-500 text-black rounded-tr-none'
                        }`}>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                        <span className="block text-[8px] text-zinc-400 mt-1 uppercase font-black tracking-wider px-1">
                          {m.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-150 dark:border-zinc-900 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Type an administrative reply..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                  className="w-full p-2.5 outline-none rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs font-bold border border-zinc-200 dark:border-zinc-800 focus:border-emerald-500 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleSendChatMessage}
                  className="px-4 py-2.5 rounded-xl bg-emerald-555 text-black hover:bg-emerald-400 transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  disabled={!chatInput.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'tickets' ? (
          // USER'S INBOX OF SUPPORT TICKETS & TICKET FILING INTERFACE (separated out of Messages)
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
          >
            {/* Create Help Ticket card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5 uppercase pb-3 border-b border-zinc-100 dark:border-zinc-900 mb-4">
                  <FileText className="w-4.5 h-4.5 text-emerald-500" />
                  File Administrative Service Ticket
                </h3>
                
                {successMsg && (
                  <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-505 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>Your ticket has been officially registered! IT Support has compiled your diagnostics metadata.</span>
                  </div>
                )}

                <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-bold">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Help Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold"
                    >
                      <option value="Attendance Verification">Attendance Verification Scan Failures</option>
                      <option value="RFID Card Sync">RFID Card & Device Token Synclink</option>
                      <option value="Scheduling Conflicts">Syllabus Class Schedule Corrections</option>
                      <option value="Excusal Slips Appeal">Medical Excuse Letter Appeal Errors</option>
                      <option value="Account Settings / Bug report">UI Profile Settings / Visual Glitches</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider">Subject Title</label>
                    <input
                      type="text"
                      className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold"
                      placeholder="Brief summary of the inquiry..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider">Message Description</label>
                    <textarea
                      rows={4}
                      className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold leading-relaxed resize-none"
                      placeholder="Provide full description of schedule codes, RFID IDs, or rooms affected..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-555 hover:bg-emerald-400 text-black rounded-xl font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95 text-xs text-center"
                  >
                    Submit Ticket to Admin Office
                  </button>
                </form>
              </div>
            </div>

            {/* List of outstanding help tickets */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm text-xs font-bold">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5 uppercase pb-3 border-b border-zinc-100 dark:border-zinc-900 mb-4">
                  <ShieldAlert className="w-4.5 h-4.5 text-emerald-500" />
                  Your Active Help Register ({tickets.length})
                </h3>

                {tickets.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400">
                    No active support requests declared in metadata indexes. Use the form on the left to file an issue ticket.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {tickets.map((t) => (
                      <div 
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-900 hover:border-emerald-500/30 bg-zinc-50/50 dark:bg-zinc-900/10 cursor-pointer flex flex-col justify-between gap-3 hover:bg-emerald-500/[0.01] transition-all group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-mono font-bold">
                              Ticket Code: {t.id}
                            </span>
                            <h4 className="font-black text-sm text-zinc-800 dark:text-zinc-200 mt-1 tracking-tight group-hover:text-emerald-500 transition-colors">
                              {t.subject}
                            </h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            t.status === 'Resolved' 
                              ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400' 
                              : t.status === 'In Progress' 
                                ? 'bg-amber-550/10 text-amber-500' 
                                : 'bg-indigo-500/10 text-indigo-500'
                          }`}>
                            {t.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-2 border-t border-zinc-100/70 dark:border-zinc-900/60 font-semibold">
                          <div className="flex items-center gap-3">
                            <span className="bg-zinc-100 dark:bg-zinc-850 px-2 py-0.5 rounded text-zinc-500 uppercase">
                              {t.category}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
                              {t.messages.length} message{t.messages.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-500 hover:underline">
                            <span>Open Log</span>
                            <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          // HELPDESK FAQS & CAMPUS USER MANUAL
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left"
          >
            <div className="lg:col-span-8 space-y-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 shadow-sm">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5 uppercase pb-3 border-b border-zinc-100 dark:border-zinc-900 mb-4">
                  <HelpCircle className="w-4.5 h-4.5 text-emerald-500" />
                  Common FAQs & Guidance Manuals
                </h3>

                <div className="divide-y divide-zinc-150 dark:divide-zinc-900">
                  {faqs.map((f, i) => (
                    <div key={i} className="py-4 first:pt-1 last:pb-1 text-xs">
                      <h4 className="font-black text-zinc-850 dark:text-zinc-100 text-sm flex items-start gap-2">
                        <span className="text-emerald-500 font-mono select-none">Q.</span>
                        {f.q}
                      </h4>
                      <p className="mt-2 text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed pl-5">
                        {f.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-550/5 to-emerald-500/5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 relative overflow-hidden">
                <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2">Campus Administration IT Core</h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium mb-4">
                  The ClassPulse Central Hub coordinates biometric ledger logs, RFID beacons, and active professor schedules dynamically. If you have an inquiry regarding official registrar status, submit a ticket.
                </p>

                <div className="space-y-2.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-bold border-t border-zinc-100 dark:border-zinc-900 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" /> Server Gateway:</span>
                    <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded font-black">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-indigo-500" /> Support Desk hours:</span>
                    <span className="font-medium">08:00 AM - 05:00 PM</span>
                  </div>
                </div>

                <div className="mt-4 pt-1">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('tickets')}
                    className="w-full text-center py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-850 text-white font-extrabold uppercase text-[10px] tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Open Live Tickets
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
