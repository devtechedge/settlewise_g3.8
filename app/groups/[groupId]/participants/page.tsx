'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { Users, UserPlus, Mail, Link as LinkIcon, Check, AlertCircle } from 'lucide-react';

export default function ParticipantsPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Participant Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'EDITOR'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchGroup = () => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        setGroup(data);
        if (data.participants) setParticipants(data.participants);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add participant');

      setNewName('');
      setNewEmail('');
      fetchGroup();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setGeneratedLink(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invitation');

      const fullUrl = `${window.location.origin}${data.inviteLink}`;
      setGeneratedLink(fullUrl);
      setInviteEmail('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:px-6 w-full space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1c2826]">
            Participants & Memberships
          </h1>
          <p className="text-xs text-[#70695b] mt-0.5">
            Manage who participates in expenses and invite members to {group?.name || 'Group'}.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Participants List */}
          <div className="md:col-span-2 bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="font-serif font-bold text-sm text-[#1c2826] pb-2 border-b border-[#ece6d9] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#2a5c4d]" />
              <span>Group Roster ({participants.length})</span>
            </h2>

            <div className="divide-y divide-[#f0ebd9]">
              {participants.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: p.color || '#4a6b6c' }}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1c2826] flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.linkedUserUid && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#c5d8cb] text-[#2a5c4d] rounded font-mono font-medium">
                            Linked Account
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#70695b]">{p.email || 'Informal / Unregistered participant'}</div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-[#70695b]">{p.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add & Invite Controls */}
          <div className="space-y-6">
            {/* Quick Add Participant */}
            <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-xs text-[#1c2826] flex items-center gap-1.5 uppercase tracking-wider">
                <UserPlus className="w-3.5 h-3.5 text-[#2a5c4d]" />
                <span>Add Participant</span>
              </h3>
              <p className="text-[11px] text-[#70695b] leading-tight">
                Add an informal roommate or travel buddy without requiring them to sign in.
              </p>

              <form onSubmit={handleAddParticipant} className="space-y-2.5 text-xs">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name (e.g. David)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
                  />
                </div>
                {addError && (
                  <div className="p-2 bg-[#fdf2ee] border border-[#f3cbbd] rounded text-[11px] text-[#8c4b2d]">
                    {addError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-1.5 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded font-semibold text-xs transition-colors shadow-xs"
                >
                  {adding ? 'Adding...' : 'Add to Roster'}
                </button>
              </form>
            </div>

            {/* Expiring Invitation Link */}
            <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-xl p-5 shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-xs text-[#1c2826] flex items-center gap-1.5 uppercase tracking-wider">
                <Mail className="w-3.5 h-3.5 text-[#3d6380]" />
                <span>Send Group Invitation</span>
              </h3>

              <form onSubmit={handleCreateInvite} className="space-y-2.5 text-xs">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="Recipient Email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#3d6380]"
                  />
                </div>
                <div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#3d6380]"
                  >
                    <option value="MEMBER">Member (View & Settle)</option>
                    <option value="EDITOR">Editor (Can Record Expenses)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-1.5 bg-[#1c2826] hover:bg-[#2d3f3c] text-white rounded font-semibold text-xs transition-colors shadow-xs"
                >
                  {inviting ? 'Generating...' : 'Generate 7-Day Invite Link'}
                </button>
              </form>

              {generatedLink && (
                <div className="p-3 bg-[#f7f4eb] border border-[#e2dacf] rounded text-xs space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#70695b] block">
                    Shareable Invitation Link:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full px-2 py-1 bg-white border border-[#cfc6b5] rounded font-mono text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="px-2.5 py-1 bg-[#2a5c4d] text-white rounded text-xs font-semibold shrink-0"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
