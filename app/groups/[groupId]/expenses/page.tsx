'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DisclaimerBanner } from '@/components/DisclaimerBanner.tsx';
import { Navbar } from '@/components/Navbar.tsx';
import { LedgerTable } from '@/components/LedgerTable.tsx';
import { PlusCircle, Search, Filter, Download, ArrowLeft } from 'lucide-react';

export default function ExpensesLedgerPage() {
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ACTIVE');

  const fetchExpenses = () => {
    if (!groupId) return;
    const url = new URL(`/api/groups/${groupId}/expenses`, window.location.origin);
    if (search.trim()) url.searchParams.set('search', search.trim());
    if (category !== 'ALL') url.searchParams.set('category', category);
    if (status !== 'ALL') url.searchParams.set('status', status);

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setExpenses(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((g) => setGroup(g));
  }, [groupId]);

  useEffect(() => {
    fetchExpenses();
  }, [groupId, category, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f4]">
      <DisclaimerBanner />
      <Navbar groupId={groupId} />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5ded0]">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`/groups/${groupId}`}
                className="text-xs text-[#70695b] hover:text-[#1c2826] flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
              </Link>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1c2826] mt-1">
              Expense Ledger
            </h1>
            <p className="text-xs text-[#70695b] mt-0.5">
              Auditable transaction records for {group?.name || 'Group'}. Filter by category or search notes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={`/api/groups/${groupId}/export`}
              className="px-3 py-2 bg-[#f2ede2] hover:bg-[#eae3d5] text-[#1c2826] border border-[#d8d0bf] rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              download
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
            <Link
              href={`/groups/${groupId}/expenses/new`}
              className="px-3.5 py-2 bg-[#2a5c4d] hover:bg-[#20473b] text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#fcfbf7] border border-[#e5ded0] rounded-lg p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#70695b]" />
              <input
                type="text"
                placeholder="Search description, notes, or payer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#1c2826] text-white rounded font-medium hover:bg-[#2d3f3c]"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[#70695b] font-medium">Category:</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
              >
                <option value="ALL">All Categories</option>
                <option value="Rent & Utilities">Rent & Utilities</option>
                <option value="Groceries">Groceries</option>
                <option value="Dining">Dining</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Supplies">Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#70695b] font-medium">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#cfc6b5] rounded text-xs focus:outline-[#2a5c4d]"
              >
                <option value="ACTIVE">Active Only</option>
                <option value="VOIDED">Voided Only</option>
                <option value="ALL">All States</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#70695b]">
            Loading ledger transactions...
          </div>
        ) : (
          <LedgerTable
            groupId={groupId}
            currency={group?.canonicalCurrency || 'USD'}
            expenses={expenses}
            userRole={group?.userRole || 'MEMBER'}
            onRefresh={fetchExpenses}
          />
        )}
      </main>
    </div>
  );
}
