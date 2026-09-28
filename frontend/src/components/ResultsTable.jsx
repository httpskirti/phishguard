import React, { useState, useMemo } from 'react';
import VerdictBadge from './VerdictBadge';

/**
 * ResultsTable Component
 * Displays scan results with verdict badges, key feature columns,
 * filter tabs (All / Phishing / Legitimate), column sorting,
 * client-side pagination (20 per page), and CSV export.
 */
export default function ResultsTable({ results = [] }) {
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PHISHING' | 'LEGITIMATE'
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('__rowId');
  const [sortAsc, setSortAsc] = useState(true);
  const pageSize = 20;

  // Compute counts for tabs
  const phishingCount = useMemo(() => {
    return results.filter(r => Number(r.predicted_column) === 0).length;
  }, [results]);

  const legitimateCount = useMemo(() => {
    return results.filter(r => Number(r.predicted_column) === 1).length;
  }, [results]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (activeFilter === 'PHISHING') {
      return results.filter(r => Number(r.predicted_column) === 0);
    }
    if (activeFilter === 'LEGITIMATE') {
      return results.filter(r => Number(r.predicted_column) === 1);
    }
    return results;
  }, [results, activeFilter]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === undefined || valB === undefined) return 0;

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortField, sortAsc]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  // Reset page when filter changes
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export full results to CSV
  const handleDownloadCSV = () => {
    if (results.length === 0) return;

    // Collect all headers
    const sample = results[0];
    const headers = Object.keys(sample).filter(k => k !== '__rowId');

    const csvLines = [
      headers.join(','),
      ...results.map(row => 
        headers.map(header => {
          const val = row[header];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      )
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `phishguard_scan_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden shadow-xl" aria-label="Scan results table">
      {/* Table Header Controls */}
      <div className="p-4 bg-navy-850 border-b border-navy-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-lg border border-navy-700 self-start">
          <button
            onClick={() => handleFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
              activeFilter === 'ALL'
                ? 'bg-navy-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => handleFilterChange('PHISHING')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'PHISHING'
                ? 'bg-phish-dark text-phish-light shadow-sm'
                : 'text-slate-400 hover:text-phish-light'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-phish" />
            Phishing ({phishingCount})
          </button>
          <button
            onClick={() => handleFilterChange('LEGITIMATE')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
              activeFilter === 'LEGITIMATE'
                ? 'bg-legit-dark text-legit-light shadow-sm'
                : 'text-slate-400 hover:text-legit-light'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-legit" />
            Legitimate ({legitimateCount})
          </button>
        </div>

        {/* Export Action */}
        <button
          onClick={handleDownloadCSV}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-600 text-xs font-mono transition-colors self-start md:self-auto"
        >
          <svg className="w-4 h-4 text-legit" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV ({results.length} rows)
        </button>
      </div>

      {/* Responsive Table Wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono divide-y divide-navy-800">
          <thead className="bg-navy-950/80 text-slate-400 uppercase text-[11px] tracking-wider select-none">
            <tr>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('__rowId')}>
                <div className="flex items-center gap-1">
                  <span>#</span>
                  {sortField === '__rowId' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('predicted_column')}>
                <div className="flex items-center gap-1">
                  <span>Verdict</span>
                  {sortField === 'predicted_column' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('SSLfinal_State')}>
                <div className="flex items-center gap-1" title="SSL Certificate State (-1=Phish, 0=Suspicious, 1=Legit)">
                  <span>SSL Final State</span>
                  {sortField === 'SSLfinal_State' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('URL_Length')}>
                <div className="flex items-center gap-1" title="URL Length Metric">
                  <span>URL Length</span>
                  {sortField === 'URL_Length' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('having_IP_Address')}>
                <div className="flex items-center gap-1" title="IP Address in Hostname (1=No, -1=Yes)">
                  <span>IP in URL</span>
                  {sortField === 'having_IP_Address' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('age_of_domain')}>
                <div className="flex items-center gap-1" title="Age of Domain">
                  <span>Domain Age</span>
                  {sortField === 'age_of_domain' && (sortAsc ? '▲' : '▼')}
                </div>
              </th>
              <th scope="col" className="px-4 py-3 text-slate-400">
                <span>Prefix/Suffix</span>
              </th>
              <th scope="col" className="px-4 py-3 text-slate-400">
                <span>HTTPS Token</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-800/70 text-slate-300">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                  No records match the active filter criteria.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.__rowId}
                  className="hover:bg-navy-800/40 transition-colors"
                >
                  <td className="px-4 py-2.5 text-slate-400 font-mono">
                    {row.__rowId}
                  </td>
                  <td className="px-4 py-2.5">
                    <VerdictBadge verdict={row.predicted_column} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                      Number(row.SSLfinal_State) === 1 ? 'text-legit' : Number(row.SSLfinal_State) === -1 ? 'text-phish' : 'text-slate-400'
                    }`}>
                      {row.SSLfinal_State ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.URL_Length ?? 'N/A'}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.having_IP_Address === -1 ? (
                      <span className="text-phish-light">Yes (Suspicious)</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.age_of_domain ?? 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {row.Prefix_Suffix ?? 'N/A'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">
                    {row.HTTPS_token ?? 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-3 bg-navy-950 border-t border-navy-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div>
          Showing <span className="text-white font-medium">{Math.min(sortedRows.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
          <span className="text-white font-medium">{Math.min(sortedRows.length, currentPage * pageSize)}</span> of{' '}
          <span className="text-white font-medium">{sortedRows.length}</span> entries
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-700"
          >
            Previous
          </button>
          <span>
            Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2.5 py-1 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-700"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
