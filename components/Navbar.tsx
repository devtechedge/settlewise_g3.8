'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Receipt,
  Scale,
  Users,
  FileSpreadsheet,
  PieChart,
  History,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  UserCheck,
  Building,
} from 'lucide-react';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
}

export function Navbar({ groupId }: { groupId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
        if (data.availableDemoUsers) setAvailableUsers(data.availableDemoUsers);
      })
      .catch((err) => console.error('Failed to load session:', err));
  }, []);

  const handleSwitchUser = async (uid: string) => {
    const target = availableUsers.find((u) => u.uid === uid);
    if (!target) return;

    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });

    setCurrentUser(target);
    setUserDropdownOpen(false);
    router.refresh();
  };

  const navLinks = groupId
    ? [
        { href: `/groups/${groupId}`, label: 'Overview', icon: Building },
        { href: `/groups/${groupId}/expenses`, label: 'Ledger', icon: Receipt },
        { href: `/groups/${groupId}/settlements`, label: 'Settlement Plan', icon: Scale },
        { href: `/groups/${groupId}/participants`, label: 'Participants', icon: Users },
        { href: `/groups/${groupId}/imports`, label: 'CSV Import', icon: FileSpreadsheet },
        { href: `/groups/${groupId}/reports`, label: 'Reports', icon: PieChart },
        { href: `/groups/${groupId}/audit`, label: 'Audit Trail', icon: History },
      ]
    : [
        { href: '/groups', label: 'My Groups', icon: Building },
        { href: '/groups/new', label: 'Create Group', icon: PlusCircle },
        { href: '/privacy', label: 'Privacy & Retention', icon: Scale },
        { href: '/terms', label: 'Terms & Disclaimers', icon: Receipt },
      ];

  return (
    <header className="bg-[#fcfbf7] border-b border-[#e5ded0] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#1c2826] text-[#fbf9f4] flex items-center justify-center font-bold tracking-wider text-sm shadow-xs">
                SW
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-lg tracking-tight text-[#1c2826] leading-none">
                  Settlewise
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#666053] font-mono mt-0.5">
                  Exact Ledger & Settlement
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#ede7da] text-[#1c2826] font-semibold'
                        : 'text-[#5a5448] hover:bg-[#f3ede0] hover:text-[#1c2826]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header: CTA + Role Switcher */}
          <div className="flex items-center gap-3">
            {groupId && (
              <Link
                href={`/groups/${groupId}/expenses/new`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2a5c4d] text-[#fbf9f4] rounded-md hover:bg-[#214a3e] transition-colors shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </Link>
            )}

            {/* User / Evaluator Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 border border-[#dfd7c8] rounded-md bg-[#f7f4eb] hover:bg-[#ede7da] transition-colors text-xs text-[#2b2721]"
                aria-label="User profile and role switcher"
                aria-expanded={userDropdownOpen}
              >
                <div className="w-6 h-6 rounded-full bg-[#1c2826] text-white flex items-center justify-center font-bold text-xs uppercase">
                  {currentUser?.displayName?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-xs leading-none text-[#1c2826]">
                    {currentUser?.displayName || 'Loading...'}
                  </div>
                  <div className="text-[10px] text-[#70695b] leading-tight">
                    {currentUser?.uid === 'usr_alice'
                      ? 'Owner Role'
                      : currentUser?.uid === 'usr_bob'
                      ? 'Editor Role'
                      : 'Member Role'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#70695b]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#fcfbf7] border border-[#d8d0bf] rounded-md shadow-lg py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-[#e8e2d4] text-[11px] font-semibold text-[#736c5e] uppercase tracking-wider">
                    Switch Evaluator Role
                  </div>
                  {availableUsers.map((u) => {
                    const isSelected = u.uid === currentUser?.uid;
                    const roleLabel =
                      u.uid === 'usr_alice' ? 'Owner' : u.uid === 'usr_bob' ? 'Editor' : 'Member';
                    return (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => handleSwitchUser(u.uid)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#ede7da] transition-colors ${
                          isSelected ? 'bg-[#ede7da] font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#3d6380] text-white flex items-center justify-center text-[10px] font-bold">
                            {u.displayName[0]}
                          </div>
                          <div>
                            <div className="text-[#1c2826]">{u.displayName}</div>
                            <div className="text-[10px] text-[#736c5e]">{u.email}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dfd7c8] text-[#332f27] font-mono">
                          {roleLabel}
                        </span>
                      </button>
                    );
                  })}
                  <div className="border-t border-[#e8e2d4] my-1" />
                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-[#554e42] hover:bg-[#ede7da]"
                  >
                    Account & Data Retention
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 text-[#8c4b2d] hover:bg-[#ede7da]"
                  >
                    Google Sign-In / Switch Account
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-[#554e42] hover:bg-[#ede7da]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e5ded0] bg-[#f7f4eb] px-4 pt-2 pb-3 space-y-1">
          {groupId && (
            <Link
              href={`/groups/${groupId}/expenses/new`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#2a5c4d] text-white text-xs font-semibold mb-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record New Expense</span>
            </Link>
          )}
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md ${
                  isActive ? 'bg-[#ede7da] text-[#1c2826] font-semibold' : 'text-[#5a5448]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
