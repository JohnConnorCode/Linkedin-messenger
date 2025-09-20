'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Users, Building, MapPin, Briefcase, Tag, X, CheckCircle, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import debounce from 'lodash/debounce';

interface ConnectionFilters {
  search: string;
  companies: string[];
  positions: string[];
  locations: string[];
  tags: string[];
  messageStatus: 'all' | 'not_messaged' | 'messaged';
  connectionDegree: '1st' | '2nd' | '3rd' | 'all';
  hasEmail: boolean | null;
  hasPhone: boolean | null;
}

interface ConnectionFilterSearchProps {
  campaignId: string;
  onFiltersChange: (filters: ConnectionFilters, filteredCount: number) => void;
  onSelectConnections: (connectionIds: string[]) => void;
}

export default function ConnectionFilterSearch({ 
  campaignId, 
  onFiltersChange, 
  onSelectConnections 
}: ConnectionFilterSearchProps) {
  const [filters, setFilters] = useState<ConnectionFilters>({
    search: '',
    companies: [],
    positions: [],
    locations: [],
    tags: [],
    messageStatus: 'all',
    connectionDegree: 'all',
    hasEmail: null,
    hasPhone: null,
  });

  const [availableFilters, setAvailableFilters] = useState({
    companies: [] as string[],
    positions: [] as string[],
    locations: [] as string[],
    tags: [] as string[],
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    loadAvailableFilters();
    loadConnections();
  }, []);

  useEffect(() => {
    debouncedSearch();
  }, [filters]);

  const loadAvailableFilters = async () => {
    const { data: targets } = await supabase
      .from('campaign_targets')
      .select('company_name, position, location, tags')
      .eq('campaign_id', campaignId);

    if (targets) {
      const companies = [...new Set(targets.map(t => t.company_name).filter(Boolean))];
      const positions = [...new Set(targets.map(t => t.position).filter(Boolean))];
      const locations = [...new Set(targets.map(t => t.location).filter(Boolean))];
      const tags = [...new Set(targets.flatMap(t => t.tags || []))];

      setAvailableFilters({ companies, positions, locations, tags });
    }
  };

  const loadConnections = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaign_targets')
        .select('*')
        .eq('campaign_id', campaignId);

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,headline.ilike.%${filters.search}%`);
      }

      // Apply company filter
      if (filters.companies.length > 0) {
        query = query.in('company_name', filters.companies);
      }

      // Apply position filter
      if (filters.positions.length > 0) {
        query = query.in('position', filters.positions);
      }

      // Apply location filter
      if (filters.locations.length > 0) {
        query = query.in('location', filters.locations);
      }

      // Apply message status filter
      if (filters.messageStatus === 'messaged') {
        query = query.not('messaged_at', 'is', null);
      } else if (filters.messageStatus === 'not_messaged') {
        query = query.is('messaged_at', null);
      }

      // Apply has email filter
      if (filters.hasEmail !== null) {
        if (filters.hasEmail) {
          query = query.not('email', 'is', null);
        } else {
          query = query.is('email', null);
        }
      }

      const { data, count } = await query.limit(100);

      setSearchResults(data || []);
      setFilteredCount(count || 0);

      // Get total count
      const { count: total } = await supabase
        .from('campaign_targets')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      setTotalCount(total || 0);

      // Notify parent
      onFiltersChange(filters, count || 0);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(() => loadConnections(), 500),
    [filters]
  );

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    onSelectConnections(Array.from(newSelection));
  };

  const selectAll = () => {
    const allIds = searchResults.map(r => r.id);
    setSelectedIds(new Set(allIds));
    onSelectConnections(allIds);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    onSelectConnections([]);
  };

  const removeFilter = (type: keyof ConnectionFilters, value?: string) => {
    if (type === 'search') {
      setFilters({ ...filters, search: '' });
    } else if (Array.isArray(filters[type]) && value) {
      setFilters({
        ...filters,
        [type]: (filters[type] as string[]).filter(v => v !== value)
      });
    } else {
      setFilters({ ...filters, [type]: type.includes('has') ? null : 'all' });
    }
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      companies: [],
      positions: [],
      locations: [],
      tags: [],
      messageStatus: 'all',
      connectionDegree: 'all',
      hasEmail: null,
      hasPhone: null,
    });
  };

  const hasActiveFilters = filters.search || 
    filters.companies.length > 0 || 
    filters.positions.length > 0 || 
    filters.locations.length > 0 || 
    filters.tags.length > 0 || 
    filters.messageStatus !== 'all' || 
    filters.connectionDegree !== 'all' || 
    filters.hasEmail !== null || 
    filters.hasPhone !== null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connection Filtering
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {filteredCount} of {totalCount} connections
          </span>
          {selectedIds.size > 0 && (
            <span className="text-sm font-medium text-blue-600">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or headline..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Company Filter */}
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !filters.companies.includes(e.target.value)) {
                setFilters({ ...filters, companies: [...filters.companies, e.target.value] });
              }
            }}
            className="w-full px-3 py-2 border rounded-lg appearance-none pr-8 text-sm"
          >
            <option value="">Filter by Company</option>
            {availableFilters.companies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          <Building className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Position Filter */}
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !filters.positions.includes(e.target.value)) {
                setFilters({ ...filters, positions: [...filters.positions, e.target.value] });
              }
            }}
            className="w-full px-3 py-2 border rounded-lg appearance-none pr-8 text-sm"
          >
            <option value="">Filter by Position</option>
            {availableFilters.positions.map(position => (
              <option key={position} value={position}>{position}</option>
            ))}
          </select>
          <Briefcase className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Location Filter */}
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !filters.locations.includes(e.target.value)) {
                setFilters({ ...filters, locations: [...filters.locations, e.target.value] });
              }
            }}
            className="w-full px-3 py-2 border rounded-lg appearance-none pr-8 text-sm"
          >
            <option value="">Filter by Location</option>
            {availableFilters.locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>
          <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Message Status Filter */}
        <select
          value={filters.messageStatus}
          onChange={(e) => setFilters({ ...filters, messageStatus: e.target.value as any })}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="all">All Connections</option>
          <option value="not_messaged">Not Messaged</option>
          <option value="messaged">Already Messaged</option>
        </select>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Search: {filters.search}
              <button onClick={() => removeFilter('search')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.companies.map(company => (
            <span key={company} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              <Building className="h-3 w-3" /> {company}
              <button onClick={() => removeFilter('companies', company)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.positions.map(position => (
            <span key={position} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              <Briefcase className="h-3 w-3" /> {position}
              <button onClick={() => removeFilter('positions', position)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.locations.map(location => (
            <span key={location} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              <MapPin className="h-3 w-3" /> {location}
              <button onClick={() => removeFilter('locations', location)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {filters.messageStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              Status: {filters.messageStatus}
              <button onClick={() => removeFilter('messageStatus')}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      <div className="border rounded-lg overflow-hidden">
        {/* Results Header */}
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.size === searchResults.length && searchResults.length > 0}
              onChange={() => selectedIds.size === searchResults.length ? clearSelection() : selectAll()}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.success(`Added ${selectedIds.size} connections to campaign`);
                  clearSelection();
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Add to Campaign
              </button>
              <button
                onClick={() => {
                  toast.success(`Excluded ${selectedIds.size} connections`);
                  clearSelection();
                }}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Exclude
              </button>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              <p className="mt-2">Loading connections...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No connections match your filters</p>
            </div>
          ) : (
            <div className="divide-y">
              {searchResults.map((connection) => (
                <div
                  key={connection.id}
                  className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(connection.id)}
                    onChange={() => toggleSelection(connection.id)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{connection.name}</p>
                    <p className="text-sm text-gray-600">{connection.headline}</p>
                    <div className="flex gap-3 mt-1">
                      {connection.company_name && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Building className="h-3 w-3" /> {connection.company_name}
                        </span>
                      )}
                      {connection.location && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {connection.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connection.messaged_at ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Messaged
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        Not Messaged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}