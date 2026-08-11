import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, extractErrorMessage } from '../api/client';
import { Customer } from '../types';
import Banner from '../components/Banner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../auth/AuthContext';

export default function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    api
      .get(`/customers/${id}`)
      .then((res) => {
        setCustomer(res.data.data);
        setEditForm(res.data.data);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleAddFollowUp(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setNoteError('');
    setNoteSaving(true);
    try {
      await api.post(`/customers/${id}/followups`, { note });
      setNote('');
      load();
    } catch (err) {
      setNoteError(extractErrorMessage(err));
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setEditError('');
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, editForm);
      setEditing(false);
      load();
    } catch (err) {
      setEditError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page loading-state">Loading customer...</div>;
  if (error) return <div className="page"><Banner type="error" message={error} /></div>;
  if (!customer) return null;

  return (
    <div className="page">
      <p>
        <Link to="/customers">&larr; Back to customers</Link>
      </p>
      <div className="page-header">
        <div>
          <h1>{customer.name}</h1>
          <p className="page-subtitle">
            {customer.businessName || 'No business name on file'} · <StatusBadge status={customer.status} />
          </p>
        </div>
        {canManage && (
          <button className="btn btn-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      <div className="stat-grid">
        <div className="card">
          <div className="stat-label">Mobile</div>
          <div>{customer.mobile}</div>
        </div>
        <div className="card">
          <div className="stat-label">Email</div>
          <div>{customer.email || '-'}</div>
        </div>
        <div className="card">
          <div className="stat-label">Customer type</div>
          <div>{customer.customerType}</div>
        </div>
        <div className="card">
          <div className="stat-label">GST number</div>
          <div>{customer.gstNumber || '-'}</div>
        </div>
      </div>

      {customer.address && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="stat-label">Address</div>
          <div>{customer.address}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Recent challans</h3>
        {!customer.challans || customer.challans.length === 0 ? (
          <div className="empty-state">No challans yet for this customer.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Challan #</th>
                <th>Status</th>
                <th>Total Qty</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {customer.challans.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to="/challans">{c.challanNumber}</Link>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.totalQuantity}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Follow-ups</h3>
        {canManage && (
          <form onSubmit={handleAddFollowUp} className="toolbar">
            <input
              placeholder="Add a follow-up note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-sm" type="submit" disabled={noteSaving || !note.trim()}>
              Add
            </button>
          </form>
        )}
        <Banner type="error" message={noteError} />
        {!customer.followUps || customer.followUps.length === 0 ? (
          <div className="empty-state">No follow-up notes yet.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {customer.followUps.map((f) => (
              <li key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>{f.note}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {new Date(f.followUpAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit customer</h3>
            </div>
            <Banner type="error" message={editError} />
            <form onSubmit={handleSaveEdit}>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input
                    value={editForm.name ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Mobile</label>
                  <input
                    value={editForm.mobile ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Customer type</label>
                  <select
                    value={editForm.customerType}
                    onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value as any })}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
              </div>
              <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: 16, marginBottom: 0 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
