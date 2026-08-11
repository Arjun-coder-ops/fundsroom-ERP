import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { Customer, CustomerStatus, CustomerType, PaginationMeta } from '../types';
import Banner from '../components/Banner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../auth/AuthContext';

const emptyForm = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  customerType: 'RETAIL' as CustomerType,
  address: '',
  status: 'LEAD' as CustomerStatus,
  notes: '',
};

export default function Customers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/customers', { params: { page, search: search || undefined, status: statusFilter || undefined } })
      .then((res) => {
        setCustomers(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, statusFilter]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/customers', {
        ...form,
        email: form.email || undefined,
        businessName: form.businessName || undefined,
        gstNumber: form.gstNumber || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      setShowForm(false);
      setForm(emptyForm);
      setPage(1);
      load();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="page-subtitle">Manage customers and CRM follow-ups</p>
        </div>
        {canManage && (
          <button className="btn" onClick={() => setShowForm(true)}>
            + Add customer
          </button>
        )}
      </div>

      <form className="toolbar" onSubmit={handleSearchSubmit}>
        <input
          style={{ maxWidth: 260 }}
          placeholder="Search name, mobile, business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="btn btn-secondary" type="submit">
          Search
        </button>
      </form>

      <Banner type="error" message={error} />

      <div className="card">
        {loading ? (
          <div className="loading-state">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">No customers found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Business</th>
                <th>Mobile</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                  <td>{c.name}</td>
                  <td>{c.businessName || '-'}</td>
                  <td>{c.mobile}</td>
                  <td>{c.customerType}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.followUpDate ? new Date(c.followUpDate).toLocaleDateString() : '-'}</td>
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

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Add customer</h3>
            </div>
            <Banner type="error" message={formError} />
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Mobile *</label>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Business name</label>
                  <input
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>GST number</label>
                  <input
                    value={form.gstNumber}
                    onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Customer type</label>
                  <select
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value as CustomerType })}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as CustomerStatus })}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <div className="form-field" style={{ marginTop: 14 }}>
                <label>Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 16, marginBottom: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
