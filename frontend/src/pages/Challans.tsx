import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { Challan, PaginationMeta } from '../types';
import Banner from '../components/Banner';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../auth/AuthContext';

export default function Challans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [challans, setChallans] = useState<Challan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  const [confirmTarget, setConfirmTarget] = useState<Challan | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Challan | null>(null);
  const [busyId, setBusyId] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/challans', { params: { page, status: statusFilter || undefined } })
      .then((res) => {
        setChallans(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, statusFilter]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setActionError('');
    setBusyId(confirmTarget.id);
    try {
      await api.post(`/challans/${confirmTarget.id}/confirm`);
      setConfirmTarget(null);
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
      setConfirmTarget(null);
    } finally {
      setBusyId('');
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setActionError('');
    setBusyId(cancelTarget.id);
    try {
      await api.post(`/challans/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
      setCancelTarget(null);
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sales Challans</h1>
          <p className="page-subtitle">Draft, confirm, and track outgoing stock challans</p>
        </div>
        {canManage && (
          <button className="btn" onClick={() => navigate('/challans/new')}>
            + New challan
          </button>
        )}
      </div>

      <div className="toolbar">
        <select style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <Banner type="error" message={error || actionError} />

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading challans...</div>
        ) : challans.length === 0 ? (
          <div className="empty-state">No challans found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Qty</th>
                <th>Created</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/challans/${c.id}`}>{c.challanNumber}</Link>
                  </td>
                  <td>{c.customer?.name}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.totalQuantity}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  {canManage && (
                    <td>
                      {c.status === 'DRAFT' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => setConfirmTarget(c)}
                          >
                            Confirm
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => navigate(`/challans/${c.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={busyId === c.id}
                            onClick={() => setCancelTarget(c)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Confirm challan"
          message={`Confirm challan ${confirmTarget.challanNumber}? This will reduce stock for every line item and cannot be undone.`}
          confirmLabel="Confirm challan"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Cancel challan"
          message={`Cancel draft challan ${cancelTarget.challanNumber}? This cannot be undone.`}
          confirmLabel="Cancel challan"
          danger
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
