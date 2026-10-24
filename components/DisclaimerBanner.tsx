import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function DisclaimerBanner() {
  return (
    <div className="bg-[#f2eee3] border-b border-[#e2dacf] px-4 py-2 text-xs text-[#524b42] flex items-center justify-between">
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <ShieldAlert className="w-3.5 h-3.5 text-[#8c4b2d] shrink-0" />
        <span>
          <strong>Record-keeping & settlement-planning only:</strong> Settlewise does not move money, process payments, or connect to banking institutions. All reimbursements recorded reflect user-reported offline settlements.
        </span>
      </div>
    </div>
  );
}
