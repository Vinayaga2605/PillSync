import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Link2,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import adminService from '../../services/adminService';

const PAGE_SIZE = 10;

export const AdminRelationshipsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const caregiverIdParam = searchParams.get('caregiver_id') || '';
  const patientIdParam = searchParams.get('patient_id') || '';

  const [relationships, setRelationships] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [page, setPage] = useState(1);

  const fetchRelationships = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (caregiverIdParam) params.caregiver_id = parseInt(caregiverIdParam, 10);
      if (patientIdParam) params.patient_id = parseInt(patientIdParam, 10);
      if (statusFilter === 'ACTIVE') params.is_active = true;
      if (statusFilter === 'INACTIVE') params.is_active = false;

      const data = await adminService.getRelationships(params);
      setRelationships(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to load relationships:', err);
      setError(err?.response?.data?.detail || 'Failed to load relationship records.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, caregiverIdParam, patientIdParam]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  const clearTargetFilter = (filterKey) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterKey);
    setSearchParams(newParams);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to="/app/admin/dashboard" className="hover:text-primary-600 transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Relationships</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary-600" />
            Caregiver-Patient Relationships
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System-wide audit directory of all linkings, permission scopes, and assignment statuses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRelationships()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Active Filter Banners from URL params */}
      {(caregiverIdParam || patientIdParam) && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl text-sm">
          <span className="font-semibold text-primary-900">Filtered by:</span>
          {caregiverIdParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-primary-300 text-primary-800 text-xs font-medium shadow-sm">
              Caregiver ID: {caregiverIdParam}
              <button
                onClick={() => clearTargetFilter('caregiver_id')}
                className="text-primary-500 hover:text-primary-700"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {patientIdParam && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-primary-300 text-primary-800 text-xs font-medium shadow-sm">
              Patient ID: {patientIdParam}
              <button
                onClick={() => clearTargetFilter('patient_id')}
                className="text-primary-500 hover:text-primary-700"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Filters & Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter className="w-4 h-4 text-slate-400" />
            Status:
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === status
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{relationships.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{totalCount}</span> records
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="w-36 h-4 bg-slate-100 rounded"></div>
                  <div className="w-24 h-3 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="w-24 h-6 bg-slate-100 rounded-full"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-medium text-rose-900">{error}</p>
          <button
            onClick={() => fetchRelationships()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-lg hover:bg-rose-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      ) : relationships.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Link2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No relationships found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {caregiverIdParam || patientIdParam || statusFilter !== 'ALL'
              ? 'Try resetting the filters or clearing the ID criteria above.'
              : 'There are currently no caregiver-patient linkings in the system.'}
          </p>
          {(caregiverIdParam || patientIdParam || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchParams({});
                setStatusFilter('ALL');
                setPage(1);
              }}
              className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Caregiver</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Relationship Type</th>
                  <th className="py-3 px-4">Permission Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {relationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
                          <HeartHandshake className="w-4 h-4" />
                        </div>
                        <div>
                          <Link
                            to={`/app/admin/caregivers/${rel.caregiver_id}`}
                            className="font-medium text-slate-900 hover:text-primary-600 transition-colors block"
                          >
                            {rel.caregiver_name || `Caregiver #${rel.caregiver_id}`}
                          </Link>
                          <span className="text-xs text-slate-400">ID: {rel.caregiver_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <Link
                            to={`/app/admin/patients/${rel.patient_id}`}
                            className="font-medium text-slate-900 hover:text-primary-600 transition-colors block"
                          >
                            {rel.patient_name || `Patient #${rel.patient_id}`}
                          </Link>
                          <span className="text-xs text-slate-400">ID: {rel.patient_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                        <Layers className="w-3 h-3 text-slate-500" />
                        {rel.relationship_type?.replace(/_/g, ' ') || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <ShieldCheck className="w-3 h-3" />
                        {rel.permission_level?.replace(/_/g, ' ') || 'READ ONLY'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {rel.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {rel.assigned_at ? new Date(rel.assigned_at).toLocaleDateString() : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminRelationshipsPage;
