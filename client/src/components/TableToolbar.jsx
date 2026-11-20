import { useState } from 'react';

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  showDate = false,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  status,
  statusOptions = [],
  onStatusChange,
  showSearch = true,
  searchWaiting = false,
  onSearchFocus,
  onSearchBlur,
  children,
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const waiting = searchFocused && String(search ?? '').trim() === '';

  return (
    <div className="record-toolbar table-toolbar">
      {showSearch && (
        <label className={`table-search-control${searchWaiting || waiting ? ' waiting-for-search' : ''}`}>
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={(event) => {
              setSearchFocused(true);
              onSearchFocus?.(event);
            }}
            onBlur={(event) => {
              setSearchFocused(false);
              onSearchBlur?.(event);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </label>
      )}

      {showDate && (
        <div className="table-date-controls">
          <label>
            <span>From</span>
            <input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} aria-label="Filter from date" />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} aria-label="Filter to date" />
          </label>
        </div>
      )}

      {onStatusChange && (
        <label className="table-status-control">
          <span>Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      {children}
    </div>
  );
}
